"use server";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { users, userTwoFactor } from "@/db/schema";
import { clearTwoFactorSession, verifySigninTwoFactor } from "@/features/auth/actions/two-factor";

// Mock the next/headers module to simulate request headers and retrieve client IP addresses.
vi.mock("next/headers", () => ({
  headers: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue("127.0.0.1"),
  }),
}));

// Mock the auth utility to manage session state and verification status during testing.
vi.mock("@/lib/auth", () => ({
  getAuthSession: vi.fn(),
  clearAuthSession: vi.fn().mockResolvedValue(undefined),
  updateAuthSessionVerification: vi.fn().mockResolvedValue(undefined),
}));

// Mock the logging system to verify that security events are correctly recorded.
vi.mock("@/lib/logger", () => ({
  authLogger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
  logUserAction: vi.fn(),
}));

// Mock the rate limiter to test request throttling logic.
vi.mock("@/lib/rate-limiter", () => ({
  publicActionLimiter: {
    limit: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock the otplib library to control the outcome of TOTP code verification.
vi.mock("otplib", () => ({
  verify: vi.fn().mockResolvedValue({ valid: true }),
}));

/**
 * Integration test suite for `twoFactor` server action.
 */
describe("verifySigninTwoFactor (integration)", () => {
  const validToken = "123456";

  /**
   * Resets the test environment and seeds a primary user before each test case.
   */
  beforeEach(async () => {
    // Arrange: Clear mock call history and reset the database.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Configure the headers mock to return a standard local IP.
    const { headers } = await import("next/headers");
    vi.mocked(headers).mockReturnValue({
      get: vi.fn().mockReturnValue("127.0.0.1"),
    } as never);

    // Arrange: Seed the database with the primary test user record.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Test suite for verifying rate limiting behavior on 2FA attempts.
   */
  describe("rate limiting", () => {
    /**
     * Verifies that the action blocks requests when the rate limit threshold is met.
     */
    it("returns error when rate limit exceeded", async () => {
      // Arrange: Set the rate limiter to return a failure status.
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: false } as never);

      // Act: Attempt to verify a 2FA token.
      const result = await verifySigninTwoFactor(validToken);

      // Assert: Verify the rate limit error response.
      expect(result).toEqual({
        error: "Too many attempts. Please try again in a moment.",
      });
    });

    /**
     * Verifies that the system identifies the client IP using a fallback if headers are null.
     */
    it("uses fallback IP when x-forwarded-for is null", async () => {
      // Arrange: Simulate a request environment where the IP header is missing.
      const { headers } = await import("next/headers");
      const { publicActionLimiter } = await import("@/lib/rate-limiter");

      vi.mocked(headers).mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      } as never);
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);

      // Act: Trigger the verification action.
      await verifySigninTwoFactor(validToken);

      // Assert: Confirm the rate limiter was called with the fallback `127.0.0.1` address.
      expect(publicActionLimiter.limit).toHaveBeenCalledWith("127.0.0.1");
    });
  });

  /**
   * Test suite for verifying verification code format requirements.
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
     * Verifies rejection of empty strings as verification codes.
     */
    it("returns error for empty token", async () => {
      // Act: Submit an empty string to the verification action.
      const result = await verifySigninTwoFactor("");

      // Assert: Check for the format validation error.
      expect(result).toEqual({ error: "Invalid verification code format." });
    });

    /**
     * Verifies rejection of codes containing non-numeric characters.
     */
    it("returns error for invalid token format (non-numeric)", async () => {
      // Act: Submit a code containing alphabetic characters.
      const result = await verifySigninTwoFactor("abcdef");

      // Assert: Check for the format validation error.
      expect(result).toEqual({ error: "Invalid verification code format." });
    });

    /**
     * Verifies rejection of codes that do not meet the expected 6-digit length.
     */
    it("returns error for wrong length token", async () => {
      // Act: Submit a numeric code with an incorrect length.
      const result = await verifySigninTwoFactor("12345");

      // Assert: Check for the format validation error.
      expect(result).toEqual({ error: "Invalid verification code format." });
    });
  });

  /**
   * Test suite for verifying active authentication session state.
   */
  describe("session validation", () => {
    /**
     * Configures the rate limiter for session validation tests.
     */
    beforeEach(async () => {
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);
    });

    /**
     * Verifies failure when the authentication session has expired or does not exist.
     */
    it("returns error when no auth session exists", async () => {
      // Arrange: Force the session lookup to return `null`.
      const { getAuthSession } = await import("@/lib/auth");
      vi.mocked(getAuthSession).mockResolvedValue(null);

      // Act: Attempt token verification.
      const result = await verifySigninTwoFactor(validToken);

      // Assert: Check for the session expiration error.
      expect(result).toEqual({
        error: "Session expired. Please sign in again.",
      });
    });
  });

  /**
   * Test suite for verifying user record existence.
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
     * Verifies failure and session cleanup when the session user is not found in the database.
     */
    it("returns error when user not found", async () => {
      // Arrange: Access the mocked session cleanup utility.
      const { clearAuthSession } = await import("@/lib/auth");

      // Act: Attempt verification for the non-existent user.
      const result = await verifySigninTwoFactor(validToken);

      // Assert: Check for the user not found error message.
      expect(result).toEqual({
        error: "User not found. Please sign in again.",
      });
      // Assert: Confirm the invalid session was cleared.
      expect(clearAuthSession).toHaveBeenCalled();
    });
  });

  /**
   * Test suite for verifying 2FA configuration state.
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
     * Verifies failure and session cleanup when the user record has 2FA disabled.
     */
    it("returns error when 2FA not enabled", async () => {
      // Arrange: Access the session cleanup utility.
      const { clearAuthSession } = await import("@/lib/auth");

      // Act: Attempt verification without a `userTwoFactor` record.
      const result = await verifySigninTwoFactor(validToken);

      // Assert: Check for the 2FA not enabled error message.
      expect(result).toEqual({
        error: "Two-factor authentication is not enabled for this account.",
      });
      // Assert: Confirm the session was cleared.
      expect(clearAuthSession).toHaveBeenCalled();
    });

    /**
     * Verifies failure when 2FA is marked as enabled but lacks a verification secret.
     */
    it("returns error when 2FA has no secret", async () => {
      // Arrange: Seed an invalid 2FA record with an empty secret string.
      const { clearAuthSession } = await import("@/lib/auth");

      await db.insert(userTwoFactor).values({
        id: "2fa-1",
        userId: mockUsers.primaryUser.id,
        secret: "",
        enabled: true,
        backupCodesGenerated: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Act: Attempt verification.
      const result = await verifySigninTwoFactor(validToken);

      // Assert: Check for the 2FA not enabled error.
      expect(result).toEqual({
        error: "Two-factor authentication is not enabled for this account.",
      });
      // Assert: Confirm session cleanup occurred.
      expect(clearAuthSession).toHaveBeenCalled();
    });
  });

  /**
   * Test suite for verifying the core TOTP verification logic.
   */
  describe("TOTP verification", () => {
    /**
     * Seeds a valid session and a 2FA record with a secret before each TOTP test.
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
        secret: "ABCDEFGHIJ",
        enabled: true,
        backupCodesGenerated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    /**
     * Verifies failure when the provided TOTP token is incorrect.
     */
    it("returns error when token is invalid", async () => {
      // Arrange: Configure the authenticator to return a verification failure.
      const { verify: verifyTotp } = await import("otplib");
      vi.mocked(verifyTotp).mockResolvedValue({ valid: false } as never);

      // Act: Attempt verification with an incorrect code.
      const result = await verifySigninTwoFactor(validToken);

      // Assert: Check for the invalid code error message.
      expect(result).toEqual({
        error: "Invalid verification code. Please try again.",
      });
    });

    /**
     * Verifies the success path including session verification update.
     */
    it("successfully verifies valid token", async () => {
      // Arrange: Configure the authenticator to succeed and mock the session update utility.
      const { verify: verifyTotp } = await import("otplib");
      const { updateAuthSessionVerification } = await import("@/lib/auth");

      vi.mocked(verifyTotp).mockResolvedValue({ valid: true } as never);

      // Act: Submit a valid token for verification.
      const result = await verifySigninTwoFactor(validToken);

      // Assert: Verify the success response containing user details.
      expect(result).toEqual({
        success: "Two-factor authentication verified successfully.",
        verified: true,
        email: mockUsers.primaryUser.email,
        userId: mockUsers.primaryUser.id,
      });
      // Assert: Confirm the session was updated to a verified state.
      expect(updateAuthSessionVerification).toHaveBeenCalledWith(true);
    });

    /**
     * Verifies that the system defaults the provider to credentials if undefined in the session.
     */
    it("uses credentials as default provider when undefined", async () => {
      // Arrange: Simulate a session where the provider field is missing.
      const { getAuthSession } = await import("@/lib/auth");
      const { logUserAction } = await import("@/lib/logger");
      const { verify: verifyTotp } = await import("otplib");

      vi.mocked(getAuthSession).mockResolvedValue({
        userId: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        provider: undefined,
        verified: false,
      } as never);
      vi.mocked(verifyTotp).mockResolvedValue({ valid: true } as never);

      // Act: Perform verification.
      await verifySigninTwoFactor(validToken);

      // Assert: Confirm the log action received `credentials` as the provider.
      expect(logUserAction).toHaveBeenCalledWith(
        expect.anything(),
        "signin_2fa_verified",
        mockUsers.primaryUser.id,
        expect.objectContaining({
          provider: "credentials",
        })
      );
    });
  });

  /**
   * Test suite for handling unexpected exceptions during TOTP processing.
   */
  describe("error handling", () => {
    /**
     * Sets up a valid user and 2FA configuration to test deep error handling.
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
        secret: "ABCDEFGHIJ",
        enabled: true,
        backupCodesGenerated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    /**
     * Verifies that internal errors are caught and return a generic error message.
     */
    it("handles unexpected errors gracefully", async () => {
      // Arrange: Force the TOTP library to throw an exception.
      const { verify: verifyTotp } = await import("otplib");
      vi.mocked(verifyTotp).mockImplementation(() => {
        throw new Error("TOTP error");
      });

      // Act: Attempt verification.
      const result = await verifySigninTwoFactor(validToken);

      // Assert: Verify the generic error response.
      expect(result).toEqual({
        error: "An unexpected error occurred. Please try again.",
      });
    });
  });
});

/**
 * Integration test suite for the session clearing action.
 */
describe("clearTwoFactorSession (integration)", () => {
  /**
   * Resets all mocks before each test case.
   */
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Verifies that the auth session is successfully destroyed.
   */
  it("clears session successfully", async () => {
    // Arrange: Mock the session cleanup utility to resolve successfully.
    const { clearAuthSession } = await import("@/lib/auth");
    vi.mocked(clearAuthSession).mockResolvedValue(undefined);

    // Act: Invoke the clearing action.
    const result = await clearTwoFactorSession();

    // Assert: Verify the success response.
    expect(result).toEqual({ success: "Session cleared successfully." });
    // Assert: Confirm the internal utility was called.
    expect(clearAuthSession).toHaveBeenCalled();
  });

  /**
   * Verifies that failure to clear the session is caught and returned as an error.
   */
  it("handles error during session clearing", async () => {
    // Arrange: Force the cleanup utility to fail.
    const { clearAuthSession } = await import("@/lib/auth");
    vi.mocked(clearAuthSession).mockRejectedValue(new Error("Clear failed"));

    // Act: Attempt to clear the session.
    const result = await clearTwoFactorSession();

    // Assert: Check for the failure error message.
    expect(result).toEqual({ error: "Failed to clear session." });
  });
});
