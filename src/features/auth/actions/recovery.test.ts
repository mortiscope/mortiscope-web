import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks to ensure they are available before any imports.
const mocks = vi.hoisted(() => {
  return {
    redirect: vi.fn(),
    getAuthSession: vi.fn(),
    clearAuthSession: vi.fn(),
    updateAuthSessionVerification: vi.fn(),
    limit: vi.fn(),
    getUserByEmail: vi.fn(),
    verifyRecoveryCode: vi.fn(),
    headers: vi.fn(),
    db: {
      query: {
        userTwoFactor: { findFirst: vi.fn() },
        twoFactorRecoveryCodes: { findMany: vi.fn() },
      },
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(),
        })),
      })),
    },
    authLogger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    logUserAction: vi.fn(),
  };
});

// Mock the database client to prevent actual database connections.
vi.mock("@/db", () => ({ db: mocks.db }));

// Mock authentication session helpers to control session state.
vi.mock("@/lib/auth", () => ({
  getAuthSession: mocks.getAuthSession,
  clearAuthSession: mocks.clearAuthSession,
  updateAuthSessionVerification: mocks.updateAuthSessionVerification,
}));

// Mock the rate limiter to test throttling mechanisms.
vi.mock("@/lib/rate-limiter", () => ({
  publicActionLimiter: { limit: mocks.limit },
}));

// Mock user data retrieval to simulate various user states.
vi.mock("@/data/user", () => ({
  getUserByEmail: mocks.getUserByEmail,
}));

// Mock the cryptographic verification of recovery codes.
vi.mock("@/lib/two-factor", () => ({
  verifyRecoveryCode: mocks.verifyRecoveryCode,
}));

// Mock Next.js navigation to intercept redirect calls.
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}));

// Mock Next.js headers to provide client IP addresses for rate limiting.
vi.mock("next/headers", () => ({
  headers: mocks.headers,
}));

// Mock the logger to verify audit logging interactions.
vi.mock("@/lib/logger", () => ({
  authLogger: mocks.authLogger,
  logUserAction: mocks.logUserAction,
}));

import { completeRecoverySignin, verifySigninRecoveryCode } from "@/features/auth/actions/recovery";

/**
 * Test suite for recovery actions including code verification and session completion.
 */
describe("Recovery Actions", () => {
  // Reset mocks before each test to ensure a clean state and mock headers.
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.headers.mockResolvedValue({
      get: vi.fn().mockReturnValue("127.0.0.1"),
    });
  });

  // Reset all mocks after each test to prevent side effects.
  afterEach(() => {
    vi.resetAllMocks();
  });

  /**
   * Test suite for the `verifySigninRecoveryCode` server action.
   */
  describe("verifySigninRecoveryCode", () => {
    const validRecoveryCode = "ABCD1234";
    const mockUser = { id: "user-123", email: "mortiscope@example.com" };
    const mockSession = {
      userId: "user-123",
      email: "mortiscope@example.com",
      provider: "credentials",
      verified: false,
    };

    /**
     * Test case to verify that the action returns an error when the rate limit is exceeded.
     */
    it("returns error when rate limit is exceeded", async () => {
      // Arrange: Mock the rate limiter to return a failure status.
      mocks.limit.mockResolvedValueOnce({ success: false });

      // Act: Attempt to verify the recovery code.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Check that the appropriate error is returned and the limiter was called.
      expect(result).toEqual({
        error: "Too many attempts. Please try again in a moment.",
      });
      expect(mocks.limit).toHaveBeenCalled();
    });

    /**
     * Test case to verify that the action validates the presence of a recovery code.
     */
    it("returns error when recovery code is missing", async () => {
      // Arrange: Mock the rate limiter to allow the request.
      mocks.limit.mockResolvedValueOnce({ success: true });

      // Act: Call the function with an empty string.
      const result = await verifySigninRecoveryCode("");

      // Assert: Check that a validation error is returned.
      expect(result).toEqual({ error: "Recovery code is required." });
    });

    /**
     * Test case to verify that the action validates the format of the recovery code.
     */
    it("returns error when recovery code format is invalid", async () => {
      // Arrange: Mock the rate limiter to allow the request.
      mocks.limit.mockResolvedValueOnce({ success: true });

      // Act: Call the function with an overly long string.
      const result = await verifySigninRecoveryCode("INVALID-FORMAT-TOO-LONG");

      // Assert: Check that a format error is returned.
      expect(result).toEqual({ error: "Invalid recovery code format." });
    });

    /**
     * Test case to verify that the action fails if no authentication session exists.
     */
    it("returns error when auth session is missing", async () => {
      // Arrange: Mock the session retrieval to return null.
      mocks.limit.mockResolvedValueOnce({ success: true });
      mocks.getAuthSession.mockResolvedValueOnce(null);

      // Act: Attempt verification without a session.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Check that a session expiration error is returned.
      expect(result).toEqual({
        error: "Session expired. Please sign in again.",
      });
    });

    /**
     * Test case to verify that the session is cleared and an error is returned if the user is not found.
     */
    it("clears session and returns error when user is not found", async () => {
      // Arrange: Mock a valid session but no corresponding user in the database.
      mocks.limit.mockResolvedValueOnce({ success: true });
      mocks.getAuthSession.mockResolvedValueOnce(mockSession);
      mocks.getUserByEmail.mockResolvedValueOnce(null);

      // Act: Attempt verification with a non-existent user.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Verify the session is cleared and a user not found error is returned.
      expect(mocks.clearAuthSession).toHaveBeenCalled();
      expect(result).toEqual({
        error: "User not found. Please sign in again.",
      });
    });

    /**
     * Test case to verify that the session is cleared and an error is returned if 2FA is not enabled.
     */
    it("clears session and returns error when 2FA is not enabled", async () => {
      // Arrange: Mock user retrieval and set 2FA enabled status to false.
      mocks.limit.mockResolvedValueOnce({ success: true });
      mocks.getAuthSession.mockResolvedValueOnce(mockSession);
      mocks.getUserByEmail.mockResolvedValueOnce(mockUser);
      mocks.db.query.userTwoFactor.findFirst.mockResolvedValueOnce({
        enabled: false,
      });

      // Act: Attempt verification for an account without 2FA.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Verify the session is cleared and an error is returned.
      expect(mocks.clearAuthSession).toHaveBeenCalled();
      expect(result).toEqual({
        error: "Two-factor authentication is not enabled for this account.",
      });
    });

    /**
     * Test case to verify that an error is returned if the user has no recovery codes generated.
     */
    it("returns error when no recovery codes exist for user", async () => {
      // Arrange: Mock enabled 2FA but return an empty array for recovery codes.
      mocks.limit.mockResolvedValueOnce({ success: true });
      mocks.getAuthSession.mockResolvedValueOnce(mockSession);
      mocks.getUserByEmail.mockResolvedValueOnce(mockUser);
      mocks.db.query.userTwoFactor.findFirst.mockResolvedValueOnce({
        enabled: true,
      });
      mocks.db.query.twoFactorRecoveryCodes.findMany.mockResolvedValueOnce([]);

      // Act: Attempt verification.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Check that the error prompts the user to use an app instead.
      expect(result).toEqual({
        error: "No recovery codes available. Please use your authenticator app.",
      });
    });

    /**
     * Test case to verify that an error is returned if the provided recovery code has already been used.
     */
    it("returns error when recovery code has already been used", async () => {
      // Arrange: Mock a matching recovery code that is marked as used.
      mocks.limit.mockResolvedValueOnce({ success: true });
      mocks.getAuthSession.mockResolvedValueOnce(mockSession);
      mocks.getUserByEmail.mockResolvedValueOnce(mockUser);
      mocks.db.query.userTwoFactor.findFirst.mockResolvedValueOnce({
        enabled: true,
      });
      mocks.db.query.twoFactorRecoveryCodes.findMany.mockResolvedValueOnce([
        { id: "code-1", code: "hashed-code", used: true },
      ]);
      mocks.verifyRecoveryCode.mockResolvedValueOnce(true);

      // Act: Attempt verification with a used code.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Check that the used code error is returned.
      expect(result).toEqual({
        error: "This recovery code has already been used.",
      });
    });

    /**
     * Test case to verify that an error is returned if the recovery code does not match any stored codes.
     */
    it("returns error when recovery code is invalid (no match)", async () => {
      // Arrange: Mock stored codes and ensure the verification function returns false.
      mocks.limit.mockResolvedValueOnce({ success: true });
      mocks.getAuthSession.mockResolvedValueOnce(mockSession);
      mocks.getUserByEmail.mockResolvedValueOnce(mockUser);
      mocks.db.query.userTwoFactor.findFirst.mockResolvedValueOnce({
        enabled: true,
      });
      mocks.db.query.twoFactorRecoveryCodes.findMany.mockResolvedValueOnce([
        { id: "code-1", code: "hashed-code", used: false },
      ]);
      mocks.verifyRecoveryCode.mockResolvedValueOnce(false);

      // Act: Attempt verification with an invalid code.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Check that an invalid code error is returned.
      expect(result).toEqual({ error: "Invalid recovery code." });
    });

    /**
     * Test case to verify that a valid code is marked as used and the session is updated.
     */
    it("marks code as used and returns success on valid code", async () => {
      // Arrange: Mock a successful match with an unused code.
      mocks.limit.mockResolvedValueOnce({ success: true });
      mocks.getAuthSession.mockResolvedValueOnce(mockSession);
      mocks.getUserByEmail.mockResolvedValueOnce(mockUser);
      mocks.db.query.userTwoFactor.findFirst.mockResolvedValueOnce({
        enabled: true,
      });
      mocks.db.query.twoFactorRecoveryCodes.findMany.mockResolvedValueOnce([
        { id: "code-1", code: "hashed-code", used: false },
      ]);
      mocks.verifyRecoveryCode.mockResolvedValueOnce(true);

      // Act: Attempt verification with a valid code.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Verify database update, session verification update, and success response.
      expect(mocks.db.update).toHaveBeenCalled();
      expect(mocks.updateAuthSessionVerification).toHaveBeenCalledWith(true);
      expect(result).toEqual({
        success: "Recovery code verified successfully.",
        verified: true,
        email: mockSession.email,
        userId: mockSession.userId,
      });
    });

    /**
     * Test case to verify that unexpected errors during execution are handled gracefully.
     */
    it("handles unexpected errors gracefully", async () => {
      // Arrange: Mock a valid session and user, but force the database query to throw.
      mocks.limit.mockResolvedValueOnce({ success: true });
      mocks.getAuthSession.mockResolvedValueOnce(mockSession);
      mocks.getUserByEmail.mockResolvedValueOnce(mockUser);
      mocks.db.query.userTwoFactor.findFirst.mockRejectedValueOnce(new Error("DB connection lost"));

      // Act: Attempt verification.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Verify the generic error message.
      expect(result).toEqual({
        error: "An unexpected error occurred. Please try again.",
      });
    });
  });

  /**
   * Test suite for the completeRecoverySignin server action.
   */
  describe("completeRecoverySignin", () => {
    /**
     * Test case to verify that the action requires a verified session to proceed.
     */
    it("returns error if session is not verified", async () => {
      // Arrange: Mock a session that has not been verified yet.
      mocks.getAuthSession.mockResolvedValueOnce({ verified: false });

      // Act: Attempt to complete the sign-in process.
      const result = await completeRecoverySignin();

      // Assert: Check for verification error and ensure no redirect occurred.
      expect(result).toEqual({ error: "Verification required." });
      expect(mocks.redirect).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that the action clears the temp session and redirects to dashboard on success.
     */
    it("clears auth session and redirects on success", async () => {
      // Arrange: Mock a verified session.
      mocks.getAuthSession.mockResolvedValueOnce({ verified: true });

      // Act: Complete the sign-in process.
      await completeRecoverySignin();

      // Assert: Verify that the session was cleared and the user was redirected.
      expect(mocks.clearAuthSession).toHaveBeenCalled();
      expect(mocks.redirect).toHaveBeenCalledWith("/dashboard");
    });

    /**
     * Test case to verify that errors during session clearing are handled and return an error message.
     */
    it("returns error when clearAuthSession throws", async () => {
      // Arrange: Mock a verified session and force `clearAuthSession` to throw.
      mocks.getAuthSession.mockResolvedValueOnce({ verified: true });
      mocks.clearAuthSession.mockRejectedValueOnce(new Error("Session store unavailable"));

      // Act: Attempt to complete the sign-in process.
      const result = await completeRecoverySignin();

      // Assert: Verify the error message is returned.
      expect(result).toEqual({ error: "Failed to complete signin." });
    });

    /**
     * Test case to verify that the action returns an error when the session is null.
     */
    it("returns error if auth session is null", async () => {
      // Arrange: Mock a null session.
      mocks.getAuthSession.mockResolvedValueOnce(null);

      // Act: Attempt to complete the sign-in process.
      const result = await completeRecoverySignin();

      // Assert: Verify the verification error.
      expect(result).toEqual({ error: "Verification required." });
      expect(mocks.redirect).not.toHaveBeenCalled();
    });
  });
});
