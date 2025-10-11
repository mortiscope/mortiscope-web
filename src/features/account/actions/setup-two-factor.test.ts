import { authenticator } from "otplib";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { setupTwoFactor } from "@/features/account/actions/setup-two-factor";
import { SetupTwoFactorSchema } from "@/features/account/schemas/account";
import { privateActionLimiter } from "@/lib/rate-limiter";

// Mock the TOTP library to control secret generation and URI formatting.
vi.mock("otplib", () => ({
  authenticator: {
    generateSecret: vi.fn(),
    keyuri: vi.fn(),
  },
}));

// Mock the authentication utility to simulate various session states.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to simulate user 2FA configuration lookups.
vi.mock("@/db", () => ({
  db: {
    query: {
      userTwoFactor: {
        findFirst: vi.fn(),
      },
    },
  },
}));

// Mock the Zod schema validation to control success or failure of input parsing.
vi.mock("@/features/account/schemas/account", () => ({
  SetupTwoFactorSchema: {
    safeParse: vi.fn(),
  },
}));

// Mock the rate limiter to simulate various traffic and restriction scenarios.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
}));

/**
 * Test suite for the `setupTwoFactor` server action.
 */
describe("setupTwoFactor", () => {
  const mockUserId = "user-123";
  const mockUserEmail = "mortiscope@example.com";
  const mockSecret = "MOCK_SECRET";
  const mockOtpUrl = "otpauth://totp/MortiScope:mortiscope@example.com?secret=MOCK_SECRET";

  // Reset all mocks and establish default successful mock implementations before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    // Arrange: Setup a valid user session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: mockUserId, email: mockUserEmail },
    });

    // Arrange: Setup successful schema validation.
    vi.mocked(SetupTwoFactorSchema.safeParse).mockReturnValue({
      success: true,
      data: {},
    } as unknown as ReturnType<typeof SetupTwoFactorSchema.safeParse>);

    // Arrange: Setup a non-restricted rate limit state.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Arrange: Setup standard secret and URL generation results.
    vi.mocked(authenticator.generateSecret).mockReturnValue(mockSecret);
    vi.mocked(authenticator.keyuri).mockReturnValue(mockOtpUrl);

    // Arrange: Default to no existing 2FA setup found in the database.
    vi.mocked(db.query.userTwoFactor.findFirst).mockResolvedValue(undefined);
  });

  /**
   * Test case to verify that the action rejects malformed or invalid input data.
   */
  it("returns error if input validation fails", async () => {
    // Arrange: Force the schema validation to fail.
    vi.mocked(SetupTwoFactorSchema.safeParse).mockReturnValue({
      success: false,
      error: { issues: [] },
    } as unknown as ReturnType<typeof SetupTwoFactorSchema.safeParse>);

    // Act: Execute the action with an empty object.
    const result = await setupTwoFactor({});

    // Assert: Verify that the expected validation error is returned.
    expect(result).toEqual({ error: "Invalid input." });
  });

  /**
   * Test case to verify that the action is protected against unauthenticated access.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Mock the authentication utility to return a null session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to setup 2FA without a session.
    const result = await setupTwoFactor();

    // Assert: Verify that the unauthorized error is returned.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that the action enforces rate limits for security.
   */
  it("returns error if rate limit is exceeded", async () => {
    // Arrange: Mock the rate limiter to return a failed success status.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Act: Attempt to setup 2FA.
    const result = await setupTwoFactor();

    // Assert: Verify that the frequency error message is returned.
    expect(result).toEqual({
      error: "You are attempting to setup two-factor authentication too frequently.",
    });
  });

  /**
   * Test case to verify that the action prevents re-enabling 2FA if it is already configured.
   */
  it("returns error if 2FA is already enabled", async () => {
    // Arrange: Mock the database to indicate that 2FA is already enabled for the user.
    vi.mocked(db.query.userTwoFactor.findFirst).mockResolvedValue({
      enabled: true,
    } as unknown as Awaited<ReturnType<typeof db.query.userTwoFactor.findFirst>>);

    // Act: Attempt to setup 2FA.
    const result = await setupTwoFactor();

    // Assert: Verify that the duplicate enablement error is returned.
    expect(result).toEqual({
      error: "Two-factor authentication is already enabled for this account.",
    });
  });

  /**
   * Test case to verify successful generation of the TOTP secret and QR code URI.
   */
  it("successfully generates secret and QR code URL", async () => {
    // Act: Execute the setup action.
    const result = await setupTwoFactor();

    // Assert: Check that the secret generator and URI formatter were called with correct parameters.
    expect(authenticator.generateSecret).toHaveBeenCalled();
    expect(authenticator.keyuri).toHaveBeenCalledWith(mockUserEmail, "MortiScope", mockSecret);
    expect(result).toEqual({
      success: true,
      data: {
        secret: mockSecret,
        qrCodeUrl: mockOtpUrl,
      },
    });
  });

  /**
   * Test case to verify that the action provides a fallback email for URI generation if none exists in the session.
   */
  it("uses default email if session email is missing", async () => {
    // Arrange: Mock a session where the user `email` is null.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: mockUserId, email: null },
    });

    // Act: Execute the setup action.
    await setupTwoFactor();

    // Assert: Verify that the placeholder email is used in the QR code URI.
    expect(authenticator.keyuri).toHaveBeenCalledWith("user@example.com", "MortiScope", mockSecret);
  });

  /**
   * Test case to verify that internal errors are logged and a generic error response is returned.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Force a database lookup to throw an error and spy on console output.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.query.userTwoFactor.findFirst).mockRejectedValue(new Error("DB Error"));

    // Act: Execute the action.
    const result = await setupTwoFactor();

    // Assert: Verify the error was logged and a clean error response was returned to the UI.
    expect(consoleSpy).toHaveBeenCalledWith("SETUP_TWO_FACTOR_ACTION_ERROR:", expect.any(Error));
    expect(result).toEqual({
      error: "Failed to generate two-factor authentication setup.",
    });

    consoleSpy.mockRestore();
  });
});
