import { headers } from "next/headers";
import { verify as verifyTotp } from "otplib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getUserByEmail } from "@/data/user";
import { clearTwoFactorSession, verifySigninTwoFactor } from "@/features/auth/actions/two-factor";
import { clearAuthSession, getAuthSession, updateAuthSessionVerification } from "@/lib/auth";
import { publicActionLimiter } from "@/lib/rate-limiter";

// Define a hoisted mock for the database query to ensure it is available before imports.
const dbQueryMock = vi.hoisted(() => vi.fn());

// Mock the otplib library to control OTP verification logic.
vi.mock("otplib", () => ({
  verify: vi.fn(),
}));

// Mock Next.js headers to simulate request metadata like IP addresses.
vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

// Mock user data retrieval function.
vi.mock("@/data/user", () => ({
  getUserByEmail: vi.fn(),
}));

// Mock session management utilities.
vi.mock("@/lib/auth", () => ({
  getAuthSession: vi.fn(),
  clearAuthSession: vi.fn(),
  updateAuthSessionVerification: vi.fn(),
}));

// Mock the rate limiter to test success and failure scenarios.
vi.mock("@/lib/rate-limiter", () => ({
  publicActionLimiter: {
    limit: vi.fn(),
  },
}));

// Mock the logger to prevent console noise during tests.
vi.mock("@/lib/logger", () => ({
  authLogger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
  logUserAction: vi.fn(),
}));

// Mock the database instance using the hoisted query mock.
vi.mock("@/db", () => ({
  db: {
    query: {
      userTwoFactor: {
        findFirst: dbQueryMock,
      },
    },
  },
}));

/**
 * Test suite for the verifySigninTwoFactor Server Action.
 */
describe("verifySigninTwoFactor Server Action", () => {
  const validToken = "123456";

  const validAuthSession = {
    userId: "user-123",
    email: "mortiscope@example.com",
    provider: "credentials",
    timestamp: Date.now(),
    verified: false,
    expiresAt: Date.now() + 1000 * 60 * 10,
  };

  // Set up default successful mock behaviors before each test (Happy Path).
  beforeEach(() => {
    // Arrange: Simulate successful rate limit check.
    vi.mocked(publicActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: 0,
      pending: Promise.resolve(),
    });

    // Arrange: Simulate request headers returning a valid IP.
    vi.mocked(headers).mockResolvedValue({
      get: () => "127.0.0.1",
    } as unknown as Headers);

    // Arrange: Simulate an active, valid authentication session.
    vi.mocked(getAuthSession).mockResolvedValue(
      validAuthSession as unknown as Awaited<ReturnType<typeof getAuthSession>>
    );

    // Arrange: Simulate an existing user.
    vi.mocked(getUserByEmail).mockResolvedValue({
      id: "user-123",
      email: "mortiscope@example.com",
    } as unknown as Awaited<ReturnType<typeof getUserByEmail>>);

    // Arrange: Simulate 2FA being enabled for the user.
    dbQueryMock.mockResolvedValue({
      enabled: true,
      secret: "mock-secret",
    });

    // Arrange: Simulate successful OTP verification.
    vi.mocked(verifyTotp).mockResolvedValue({ valid: true } as never);
  });

  // Clear all mocks after each test to ensure isolation.
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the action returns an error when the rate limit is exceeded.
   */
  it("returns error if rate limit is exceeded", async () => {
    // Arrange: Mock the rate limiter to return a failure response.
    vi.mocked(publicActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 0,
      remaining: 0,
      reset: 0,
      pending: Promise.resolve(),
    });

    // Act: Call the action with a valid token.
    const result = await verifySigninTwoFactor(validToken);

    // Assert: Check for the rate limit error and ensure session lookup is skipped.
    expect(result).toEqual({ error: "Too many attempts. Please try again in a moment." });
    expect(getAuthSession).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the action validates the token format before processing.
   */
  it("returns error for invalid token format", async () => {
    // Arrange: Define a list of malformed tokens.
    const invalidTokens = ["123", "abcdef", "1234567", ""];

    for (const token of invalidTokens) {
      // Act: Call the action with the invalid token.
      const result = await verifySigninTwoFactor(token);
      // Assert: Verify the format error message.
      expect(result).toEqual({ error: "Invalid verification code format." });
    }
  });

  /**
   * Test case to verify that an error is returned if the session has expired or is missing.
   */
  it("returns error if auth session is missing (expired)", async () => {
    // Arrange: Mock `getAuthSession` to return null.
    vi.mocked(getAuthSession).mockResolvedValue(null);

    // Act: Call the action.
    const result = await verifySigninTwoFactor(validToken);

    // Assert: Verify the session expired error.
    expect(result).toEqual({ error: "Session expired. Please sign in again." });
  });

  /**
   * Test case to verify that the session is cleared if the user associated with the session is not found.
   */
  it("returns error and clears session if user is not found", async () => {
    // Arrange: Mock `getUserByEmail` to return null.
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    // Act: Call the action.
    const result = await verifySigninTwoFactor(validToken);

    // Assert: Verify the user not found error and ensure session is cleared for security.
    expect(result).toEqual({ error: "User not found. Please sign in again." });
    expect(clearAuthSession).toHaveBeenCalled();
  });

  /**
   * Test case to verify that an error is returned and session cleared if 2FA is explicitly disabled.
   */
  it("returns error and clears session if 2FA is not enabled for the user", async () => {
    // Arrange: Mock the database to return a record where enabled is false.
    dbQueryMock.mockResolvedValue({ enabled: false, secret: "mock-secret" });

    // Act: Call the action.
    const result = await verifySigninTwoFactor(validToken);

    // Assert: Verify the error and ensure session is cleared.
    expect(result).toEqual({ error: "Two-factor authentication is not enabled for this account." });
    expect(clearAuthSession).toHaveBeenCalled();
  });

  /**
   * Test case to verify that an error is returned if no 2FA record exists for the user.
   */
  it("returns error if 2FA record is missing", async () => {
    // Arrange: Mock the database to return null.
    dbQueryMock.mockResolvedValue(null);

    // Act: Call the action.
    const result = await verifySigninTwoFactor(validToken);

    // Assert: Verify the error message indicating 2FA is not enabled.
    expect(result).toEqual({ error: "Two-factor authentication is not enabled for this account." });
  });

  /**
   * Test case to verify that the action returns an error if the authenticator rejects the token.
   */
  it("returns error if OTP token is invalid", async () => {
    // Arrange: Mock the authenticator to return false.
    vi.mocked(verifyTotp).mockResolvedValue({ valid: false } as never);

    // Act: Call the action.
    const result = await verifySigninTwoFactor(validToken);

    // Assert: Verify the invalid code error and ensure verification status is not updated.
    expect(result).toEqual({ error: "Invalid verification code. Please try again." });
    expect(clearAuthSession).not.toHaveBeenCalled();
    expect(updateAuthSessionVerification).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the session is marked as verified upon successful OTP validation.
   */
  it("returns success and marks session verified on valid OTP", async () => {
    // Act: Call the action with a valid token.
    const result = await verifySigninTwoFactor(validToken);

    // Assert: Ensure authenticator was called with correct parameters.
    expect(verifyTotp).toHaveBeenCalledWith({
      token: validToken,
      secret: "mock-secret",
    });

    // Assert: Ensure the session verification status is updated in the database/store.
    expect(updateAuthSessionVerification).toHaveBeenCalledWith(true);

    // Assert: Verify the success response structure.
    expect(result).toEqual({
      success: "Two-factor authentication verified successfully.",
      verified: true,
      email: validAuthSession.email,
      userId: validAuthSession.userId,
    });
  });

  /**
   * Test case to verify that unexpected errors during execution are handled gracefully.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Mock the database query to throw an error.
    dbQueryMock.mockRejectedValue(new Error("DB Error"));

    // Act: Call the action.
    const result = await verifySigninTwoFactor(validToken);

    // Assert: Verify the generic error message.
    expect(result).toEqual({ error: "An unexpected error occurred. Please try again." });
  });
});

/**
 * Test suite for the clearTwoFactorSession Server Action.
 */
describe("clearTwoFactorSession Server Action", () => {
  /**
   * Test case to verify that the session is cleared successfully.
   */
  it("clears auth session successfully", async () => {
    // Arrange: Mock `clearAuthSession` to resolve successfully.
    vi.mocked(clearAuthSession).mockResolvedValue(undefined);

    // Act: Call the action.
    const result = await clearTwoFactorSession();

    // Assert: Verify the session clearing function was called and success message returned.
    expect(clearAuthSession).toHaveBeenCalled();
    expect(result).toEqual({ success: "Session cleared successfully." });
  });

  /**
   * Test case to verify that errors during session clearing are handled.
   */
  it("returns error if session clearing fails", async () => {
    // Arrange: Mock `clearAuthSession` to throw an error.
    vi.mocked(clearAuthSession).mockRejectedValue(new Error("Failed"));

    // Act: Call the action.
    const result = await clearTwoFactorSession();

    // Assert: Verify the error message.
    expect(result).toEqual({ error: "Failed to clear session." });
  });
});
