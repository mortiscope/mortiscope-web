import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { userTwoFactor } from "@/db/schema";
import { setupTwoFactor } from "@/features/account/actions/setup-two-factor";
import { privateActionLimiter } from "@/lib/rate-limiter";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the rate limiter to control request volume during testing.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
}));

// Mock the otplib library to provide predictable secret generation and QR code URLs.
vi.mock("otplib", () => ({
  generateSecret: vi.fn(() => "mock-secret"),
  generateURI: vi.fn(() => "otpauth://totp/MortiScope:user@example.com?secret=mock-secret"),
}));

/**
 * Integration test suite for `setupTwoFactor` server action.
 */
describe("setupTwoFactor (integration)", () => {
  // Define constant user details for session mocking.
  const mockUserId = "test-user-id";
  const mockUserEmail = "user@example.com";

  /**
   * Configures a default authenticated session and rate limiter state before each test.
   */
  beforeEach(() => {
    // Arrange: Clear all mock history.
    vi.clearAllMocks();

    // Arrange: Configure auth to return a valid test user session.
    vi.mocked(auth as unknown as () => Promise<Session | null>).mockResolvedValue({
      user: { id: mockUserId, email: mockUserEmail },
      expires: "2025-01-01T00:00:00.000Z",
    });

    // Arrange: Configure the rate limiter to permit requests by default.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: true,
      reset: 0,
      remaining: 10,
      limit: 10,
      pending: Promise.resolve(),
    });
  });

  /**
   * Test case to verify that incorrect input types are rejected by the action.
   */
  it("returns error if input validation fails", async () => {
    // Act: Invoke the action with an invalid input type.
    const result = await setupTwoFactor("invalid-input" as unknown);

    // Assert: Verify the invalid input error response.
    expect(result).toEqual({ error: "Invalid input." });
  });

  /**
   * Test case to verify that the action requires an active session.
   */
  it("returns error if user is unauthorized", async () => {
    // Arrange: Simulate an unauthenticated user.
    vi.mocked(auth as unknown as () => Promise<Session | null>).mockResolvedValue(null);

    // Act: Attempt to setup 2FA without a session.
    const result = await setupTwoFactor();

    // Assert: Check for the unauthorized error response.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that setup requests are rate limited.
   */
  it("returns error if rate limit is exceeded", async () => {
    // Arrange: Mock the rate limiter to reject the setup request.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: false,
      reset: 0,
      remaining: 0,
      limit: 10,
      pending: Promise.resolve(),
    });

    // Act: Attempt to setup 2FA while rate limited.
    const result = await setupTwoFactor();

    // Assert: Verify the rate limit specific error message.
    expect(result).toEqual({
      error: "You are attempting to setup two-factor authentication too frequently.",
    });
  });

  /**
   * Test case to verify that users cannot setup 2FA if it is already active.
   */
  it("returns error if two-factor is already enabled", async () => {
    // Arrange: Seed the `userTwoFactor` table with an enabled record for the `mockUserId`.
    await db
      .insert(userTwoFactor)
      .values({
        userId: mockUserId,
        secret: "existing-secret",
        enabled: true,
        backupCodesGenerated: false,
      })
      .returning();

    // Act: Attempt to setup 2FA for the account.
    const result = await setupTwoFactor();

    // Assert: Check for the error indicating 2FA is already enabled.
    expect(result).toEqual({
      error: "Two-factor authentication is already enabled for this account.",
    });
  });

  /**
   * Test case to verify successful generation of TOTP secret and QR code URL.
   */
  it("successfully generates setup data when not enabled", async () => {
    // Arrange: Setup a unique user session to ensure isolation from previous seeds.
    const uniqueUserId = "unique-user-success";
    vi.mocked(auth as unknown as () => Promise<Session | null>).mockResolvedValue({
      user: { id: uniqueUserId, email: mockUserEmail },
      expires: "2025-01-01T00:00:00.000Z",
    });

    // Act: Generate setup data for the new user.
    const result = await setupTwoFactor();

    // Assert: Verify that the generated secret and URL match the mocked expectations.
    expect(result).toEqual({
      success: true,
      data: {
        secret: "mock-secret",
        qrCodeUrl: "otpauth://totp/MortiScope:user@example.com?secret=mock-secret",
      },
    });
  });

  /**
   * Test case to verify that a fallback email is used when the session profile is incomplete.
   */
  it("uses default email if session email is missing", async () => {
    // Arrange: Simulate a session where the `email` property is undefined.
    vi.mocked(auth as unknown as () => Promise<Session | null>).mockResolvedValue({
      user: { id: "user-no-email" },
      expires: "2025-01-01T00:00:00.000Z",
    });

    // Act: Generate setup data for the user.
    const result = await setupTwoFactor();

    // Assert: Verify success and that the fallback email value was utilized in the QR URL.
    expect(result).toEqual({
      success: true,
      data: {
        secret: "mock-secret",
        qrCodeUrl: "otpauth://totp/MortiScope:user@example.com?secret=mock-secret", // Fallback email used
      },
    });
  });

  /**
   * Test case to verify that internal database errors are caught and logged.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Force a database exception by mocking the `findFirst` query.
    const dbModule = await import("@/db");
    const originalFindFirst = dbModule.db.query.userTwoFactor.findFirst;

    dbModule.db.query.userTwoFactor.findFirst = vi.fn().mockImplementationOnce(() => {
      throw new Error("DB Error");
    });

    // Arrange: Setup a console error spy to verify logging.
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Attempt to setup 2FA triggering the database error.
    const result = await setupTwoFactor();

    // Assert: Verify the standardized failure response and that the error was logged.
    expect(result).toEqual({
      error: "Failed to generate two-factor authentication setup.",
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "SETUP_TWO_FACTOR_ACTION_ERROR:",
      expect.any(Error)
    );

    // Clean up: Restore the original database query implementation.
    dbModule.db.query.userTwoFactor.findFirst = originalFindFirst;
  });
});
