"use server";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { twoFactorRecoveryCodes, users, userTwoFactor } from "@/db/schema";
import { completeRecoverySignin, verifySigninRecoveryCode } from "@/features/auth/actions/recovery";

// Mock the next/headers module to simulate request headers like IP addresses.
vi.mock("next/headers", () => ({
  headers: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue("127.0.0.1"),
  }),
}));

// Mock the next/navigation module to intercept and verify redirection calls.
vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}));

// Mock the auth utility to control session state and verification status.
vi.mock("@/lib/auth", () => ({
  getAuthSession: vi.fn(),
  clearAuthSession: vi.fn().mockResolvedValue(undefined),
  updateAuthSessionVerification: vi.fn().mockResolvedValue(undefined),
}));

// Mock the logger to prevent actual log output and verify logging calls.
vi.mock("@/lib/logger", () => ({
  authLogger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
  logUserAction: vi.fn(),
}));

// Mock the rate limiter to simulate various traffic conditions.
vi.mock("@/lib/rate-limiter", () => ({
  publicActionLimiter: {
    limit: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock the two-factor utility to simulate recovery code validation.
vi.mock("@/lib/two-factor", () => ({
  verifyRecoveryCode: vi.fn(),
}));

/**
 * Integration test suite for the `recovery` server action.
 */
describe("verifySigninRecoveryCode (integration)", () => {
  const validRecoveryCode = "ABCD1234";

  /**
   * Resets mock states and populates the database with a test user before each test.
   */
  beforeEach(async () => {
    // Arrange: Reset mock history and clear the database.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Ensure headers return a default IP address.
    const { headers } = await import("next/headers");
    vi.mocked(headers).mockReturnValue({
      get: vi.fn().mockReturnValue("127.0.0.1"),
    } as never);

    // Arrange: Insert the primary test user into the `users` table.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Verifies that rate limiting logic is applied correctly to recovery attempts.
   */
  describe("rate limiting", () => {
    /**
     * Verifies that the action blocks requests when the rate limit is hit.
     */
    it("returns error when rate limit exceeded", async () => {
      // Arrange: Configure the rate limiter to reject the next request.
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: false } as never);

      // Act: Attempt to verify a recovery code.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Verify the rate limit error message.
      expect(result).toEqual({
        error: "Too many attempts. Please try again in a moment.",
      });
    });

    /**
     * Verifies that a local IP is used if the forwarder header is missing.
     */
    it("uses fallback IP when x-forwarded-for is null", async () => {
      // Arrange: Simulate a request missing the `x-forwarded-for` header.
      const { headers } = await import("next/headers");
      const { publicActionLimiter } = await import("@/lib/rate-limiter");

      vi.mocked(headers).mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      } as never);
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);

      // Act: Trigger the verification action.
      await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Verify the rate limiter was called with the fallback `127.0.0.1` address.
      expect(publicActionLimiter.limit).toHaveBeenCalledWith("127.0.0.1");
    });
  });

  /**
   * Verifies that input strings are correctly validated before processing.
   */
  describe("input validation", () => {
    /**
     * Configures the rate limiter to allow requests for validation tests.
     */
    beforeEach(async () => {
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);
    });

    /**
     * Verifies rejection of empty strings.
     */
    it("returns error for empty recovery code", async () => {
      // Act: Attempt verification with an empty string.
      const result = await verifySigninRecoveryCode("");

      // Assert: Check for the required field error.
      expect(result).toEqual({ error: "Recovery code is required." });
    });

    /**
     * Verifies rejection of strings that do not meet the length requirement.
     */
    it("returns error for invalid recovery code format", async () => {
      // Act: Attempt verification with a short string.
      const result = await verifySigninRecoveryCode("ABC");

      // Assert: Check for the format validation error.
      expect(result).toEqual({ error: "Invalid recovery code format." });
    });
  });

  /**
   * Verifies that an active authentication session is present.
   */
  describe("session validation", () => {
    /**
     * Configures the rate limiter to allow requests for session tests.
     */
    beforeEach(async () => {
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);
    });

    /**
     * Verifies failure when the session has expired or is missing.
     */
    it("returns error when no auth session exists", async () => {
      // Arrange: Mock the auth session as `null`.
      const { getAuthSession } = await import("@/lib/auth");
      vi.mocked(getAuthSession).mockResolvedValue(null);

      // Act: Attempt verification.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Check for the session expiration error.
      expect(result).toEqual({
        error: "Session expired. Please sign in again.",
      });
    });
  });

  /**
   * Verifies that the user associated with the session exists in the database.
   */
  describe("user validation", () => {
    /**
     * Sets up a session with a non-existent email for user validation tests.
     */
    beforeEach(async () => {
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      const { getAuthSession } = await import("@/lib/auth");

      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);
      vi.mocked(getAuthSession).mockResolvedValue({
        userId: mockUsers.primaryUser.id,
        email: "nonexistent@example.com",
        provider: "credentials",
        verified: false,
      } as never);
    });

    /**
     * Verifies failure when the database lookup for the session user fails.
     */
    it("returns error when user not found", async () => {
      // Act: Attempt verification for the non-existent user.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Check for the user not found error.
      expect(result).toEqual({
        error: "User not found. Please sign in again.",
      });
    });
  });

  /**
   * Verifies the 2FA state of the user account.
   */
  describe("2FA validation", () => {
    /**
     * Sets up a valid session for 2FA state tests.
     */
    beforeEach(async () => {
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      const { getAuthSession } = await import("@/lib/auth");

      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);
      vi.mocked(getAuthSession).mockResolvedValue({
        userId: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        provider: "credentials",
        verified: false,
      } as never);
    });

    /**
     * Verifies failure when the user has not enabled 2FA.
     */
    it("returns error when 2FA not enabled", async () => {
      // Act: Attempt verification for a user without a record in `userTwoFactor`.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Check for the 2FA not enabled error.
      expect(result).toEqual({
        error: "Two-factor authentication is not enabled for this account.",
      });
    });

    /**
     * Verifies failure when 2FA is enabled but no recovery codes exist.
     */
    it("returns error when no recovery codes available", async () => {
      // Arrange: Insert a 2FA record without corresponding recovery codes.
      await db.insert(userTwoFactor).values({
        id: "2fa-1",
        userId: mockUsers.primaryUser.id,
        secret: "TESTSECRET",
        enabled: true,
        backupCodesGenerated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act: Attempt verification.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Check for the no recovery codes error.
      expect(result).toEqual({
        error: "No recovery codes available. Please use your authenticator app.",
      });
    });
  });

  /**
   * Verifies the actual logic for checking recovery code validity and usage state.
   */
  describe("recovery code verification", () => {
    /**
     * Sets up a valid session and 2FA record for verification logic tests.
     */
    beforeEach(async () => {
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      const { getAuthSession } = await import("@/lib/auth");

      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);
      vi.mocked(getAuthSession).mockResolvedValue({
        userId: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        provider: "credentials",
        verified: false,
      } as never);

      await db.insert(userTwoFactor).values({
        id: "2fa-1",
        userId: mockUsers.primaryUser.id,
        secret: "TESTSECRET",
        enabled: true,
        backupCodesGenerated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    /**
     * Verifies that codes cannot be reused.
     */
    it("returns error when recovery code already used", async () => {
      // Arrange: Seed a recovery code marked as `used` in the `twoFactorRecoveryCodes` table.
      const { verifyRecoveryCode } = await import("@/lib/two-factor");

      await db.insert(twoFactorRecoveryCodes).values({
        id: "code-1",
        userId: mockUsers.primaryUser.id,
        code: "hashedcode",
        used: true,
        createdAt: new Date(),
      });

      vi.mocked(verifyRecoveryCode).mockResolvedValue(true);

      // Act: Attempt to use the already consumed code.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Check for the already used error.
      expect(result).toEqual({
        error: "This recovery code has already been used.",
      });
    });

    /**
     * Verifies rejection of codes that do not match the hashed values in the database.
     */
    it("returns error when recovery code is invalid", async () => {
      // Arrange: Seed a valid code record but configure the verifier to return false.
      const { verifyRecoveryCode } = await import("@/lib/two-factor");

      await db.insert(twoFactorRecoveryCodes).values({
        id: "code-1",
        userId: mockUsers.primaryUser.id,
        code: "hashedcode",
        used: false,
        createdAt: new Date(),
      });

      vi.mocked(verifyRecoveryCode).mockResolvedValue(false);

      // Act: Attempt verification with an incorrect code.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Check for the invalid code error.
      expect(result).toEqual({
        error: "Invalid recovery code.",
      });
    });

    /**
     * Verifies the success path for valid, unused recovery codes.
     */
    it("successfully verifies recovery code", async () => {
      // Arrange: Seed a valid, unused recovery code and configure the verifier to succeed.
      const { verifyRecoveryCode } = await import("@/lib/two-factor");

      await db.insert(twoFactorRecoveryCodes).values({
        id: "code-1",
        userId: mockUsers.primaryUser.id,
        code: "hashedcode",
        used: false,
        createdAt: new Date(),
      });

      vi.mocked(verifyRecoveryCode).mockResolvedValue(true);

      // Act: Perform the verification.
      const result = await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Verify the success response contains the user details.
      expect(result).toEqual({
        success: "Recovery code verified successfully.",
        verified: true,
        email: mockUsers.primaryUser.email,
        userId: mockUsers.primaryUser.id,
      });
    });

    /**
     * Verifies that the system defaults to credentials if the session provider is missing.
     */
    it("uses credentials as default provider when provider is undefined", async () => {
      // Arrange: Simulate a session with an undefined provider.
      const { getAuthSession } = await import("@/lib/auth");
      const { logUserAction } = await import("@/lib/logger");
      const { verifyRecoveryCode } = await import("@/lib/two-factor");

      vi.mocked(getAuthSession).mockResolvedValue({
        userId: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        provider: undefined,
        verified: false,
      } as never);

      await db.insert(twoFactorRecoveryCodes).values({
        id: "code-1",
        userId: mockUsers.primaryUser.id,
        code: "hashedcode",
        used: false,
        createdAt: new Date(),
      });

      vi.mocked(verifyRecoveryCode).mockResolvedValue(true);

      // Act: Execute verification.
      await verifySigninRecoveryCode(validRecoveryCode);

      // Assert: Confirm the logger received `credentials` as the provider value.
      expect(logUserAction).toHaveBeenCalledWith(
        expect.anything(),
        "signin_recovery_verified",
        mockUsers.primaryUser.id,
        expect.objectContaining({
          provider: "credentials",
        })
      );
    });
  });

  /**
   * Verifies the resilience of the action against unexpected service failures.
   */
  describe("error handling", () => {
    /**
     * Sets up a complete valid state to test error catching during final steps.
     */
    beforeEach(async () => {
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      const { getAuthSession } = await import("@/lib/auth");

      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);
      vi.mocked(getAuthSession).mockResolvedValue({
        userId: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        provider: "credentials",
        verified: false,
      } as never);

      await db.insert(userTwoFactor).values({
        id: "2fa-1",
        userId: mockUsers.primaryUser.id,
        secret: "TESTSECRET",
        enabled: true,
        backupCodesGenerated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await db.insert(twoFactorRecoveryCodes).values({
        id: "code-1",
        userId: mockUsers.primaryUser.id,
        code: "hashedcode",
        used: false,
        createdAt: new Date(),
      });
    });

    /**
     * Verifies that internal exceptions are caught and return a generic error.
     */
    it("handles unexpected errors gracefully", async () => {
      // Arrange: Force the verification utility to throw a crypto-related error.
      const { verifyRecoveryCode } = await import("@/lib/two-factor");
      vi.mocked(verifyRecoveryCode).mockRejectedValue(new Error("Crypto error"));

      // Act: Attempt verification.
      const result = await verifySigninRecoveryCode("ABCD1234");

      // Assert: Verify the fallback error message.
      expect(result).toEqual({
        error: "An unexpected error occurred. Please try again.",
      });
    });
  });
});

/**
 * Integration test suite for completing the recovery-based sign-in process.
 */
describe("completeRecoverySignin (integration)", () => {
  /**
   * Resets mock history before each test.
   */
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Verifies that the action fails if the session has not been marked as verified.
   */
  it("returns error when session not verified", async () => {
    // Arrange: Mock an unverified auth session.
    const { getAuthSession } = await import("@/lib/auth");
    vi.mocked(getAuthSession).mockResolvedValue({
      userId: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      verified: false,
    } as never);

    // Act: Attempt to complete the sign-in.
    const result = await completeRecoverySignin();

    // Assert: Check for the verification required error.
    expect(result).toEqual({
      error: "Verification required.",
    });
  });

  /**
   * Verifies failure when no session is present.
   */
  it("returns error when no session exists", async () => {
    // Arrange: Mock the auth session as `null`.
    const { getAuthSession } = await import("@/lib/auth");
    vi.mocked(getAuthSession).mockResolvedValue(null);

    // Act: Attempt completion.
    const result = await completeRecoverySignin();

    // Assert: Check for the verification required error.
    expect(result).toEqual({
      error: "Verification required.",
    });
  });

  /**
   * Verifies the final success path including session cleanup and redirection.
   */
  it("clears session and redirects on success", async () => {
    // Arrange: Mock a verified session.
    const { getAuthSession, clearAuthSession } = await import("@/lib/auth");
    const { redirect } = await import("next/navigation");

    vi.mocked(getAuthSession).mockResolvedValue({
      userId: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      verified: true,
    } as never);

    // Act: Complete the sign-in.
    await completeRecoverySignin();

    // Assert: Confirm the temporary session was cleared.
    expect(clearAuthSession).toHaveBeenCalled();
    // Assert: Confirm the user was redirected to the `dashboard`.
    expect(redirect).toHaveBeenCalledWith("/dashboard");
  });

  /**
   * Verifies error handling when the session cleanup fails.
   */
  it("handles error during session clearing gracefully", async () => {
    // Arrange: Mock a verified session but force an error during cleanup.
    const { getAuthSession, clearAuthSession } = await import("@/lib/auth");

    vi.mocked(getAuthSession).mockResolvedValue({
      userId: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      verified: true,
    } as never);
    vi.mocked(clearAuthSession).mockRejectedValue(new Error("Session clear failed"));

    // Act: Attempt completion.
    const result = await completeRecoverySignin();

    // Assert: Check for the generic completion failure message.
    expect(result).toEqual({
      error: "Failed to complete signin.",
    });
  });
});
