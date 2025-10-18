"use server";

import { eq } from "drizzle-orm";
import { authenticator } from "otplib";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { twoFactorRecoveryCodes, users, userTwoFactor } from "@/db/schema";
import { verifyTwoFactor } from "@/features/account/actions/verify-two-factor";
import { privateActionLimiter } from "@/lib/rate-limiter";
import * as twoFactorLib from "@/lib/two-factor";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the rate limiter to control request limits during testing.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
}));

/**
 * Integration test suite for the `verifyTwoFactor` server action.
 */
describe("verifyTwoFactor (integration)", () => {
  const mockUserId = "test-user-id";
  const mockSecret = authenticator.generateSecret();
  const mockToken = authenticator.generate(mockSecret);

  /**
   * Sets up a fresh test user and default mock configurations before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear mock history and reset the database to a clean state.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Configure auth to return an authenticated test user session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: mockUserId },
    });

    // Arrange: Configure the rate limiter to permit the verification request.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Arrange: Seed the `users` table with a corresponding test user record.
    await db.insert(users).values({
      id: mockUserId,
      email: "test@example.com",
      name: "MortiScope Account",
    });
  });

  /**
   * Test suite for basic input format and presence validation.
   */
  describe("input validation", () => {
    /**
     * Test case to verify that empty strings for secret or token return a validation error.
     */
    it("returns error when input validation fails", async () => {
      // Act: Attempt to verify 2FA with empty input fields.
      const result = await verifyTwoFactor({ secret: "", token: "" });

      // Assert: Verify the generic invalid input error response.
      expect(result.error).toBe("Invalid input.");
    });
  });

  /**
   * Test suite for session integrity and rate limit enforcement.
   */
  describe("authentication and rate limiting", () => {
    /**
     * Test case to verify that the action fails when no user session is active.
     */
    it("returns unauthorized error when session is missing", async () => {
      // Arrange: Simulate an unauthenticated request.
      (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

      // Act: Attempt to verify 2FA without an active session.
      const result = await verifyTwoFactor({ secret: mockSecret, token: mockToken });

      // Assert: Verify the unauthorized error response.
      expect(result.error).toBe("Unauthorized.");
    });

    /**
     * Test case to verify that the action fails when the session lacks user identity details.
     */
    it("returns unauthorized when session has no user id", async () => {
      // Arrange: Simulate a malformed session object.
      (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
        user: {},
      });

      // Act: Attempt to verify 2FA.
      const result = await verifyTwoFactor({ secret: mockSecret, token: mockToken });

      // Assert: Verify the unauthorized error response.
      expect(result.error).toBe("Unauthorized.");
    });

    /**
     * Test case to verify that the rate limiter prevents brute-force attempts on TOTP codes.
     */
    it("returns rate limit error when limit exceeded", async () => {
      // Arrange: Configure the rate limiter to block the request.
      vi.mocked(privateActionLimiter.limit).mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now(),
        pending: Promise.resolve(),
      });

      // Act: Attempt to verify 2FA while rate limited.
      const result = await verifyTwoFactor({ secret: mockSecret, token: mockToken });

      // Assert: Verify the rate limit error message.
      expect(result.error).toBe(
        "You are attempting to verify two-factor authentication too frequently."
      );
    });
  });

  /**
   * Test suite for Time-based One-Time Password (TOTP) algorithmic verification.
   */
  describe("TOTP verification", () => {
    /**
     * Test case to verify failure when a code does not match the provided secret.
     */
    it("returns error when TOTP token is invalid", async () => {
      // Arrange: Define an obviously incorrect token.
      const invalidToken = "000000";

      // Act: Attempt verification with the wrong token.
      const result = await verifyTwoFactor({ secret: mockSecret, token: invalidToken });

      // Assert: Verify the invalid verification code error message.
      expect(result.error).toBe("Invalid verification code.");
    });

    /**
     * Test case to verify success when a valid token is generated from the shared secret.
     */
    it("verifies token with correct secret and token", async () => {
      // Arrange: Generate a fresh token using the shared secret.
      const freshToken = authenticator.generate(mockSecret);

      // Act: Attempt verification with the correct token and secret.
      const result = await verifyTwoFactor({ secret: mockSecret, token: freshToken });

      // Assert: Verify the success response message for enabling 2FA.
      expect(result.success).toBe("Two-factor authentication has been successfully enabled.");
    });
  });

  /**
   * Test suite for preventing redundant activation of 2FA.
   */
  describe("2FA already enabled", () => {
    /**
     * Test case to verify that 2FA cannot be "enabled" if the record is already active.
     */
    it("returns error if 2FA is already enabled", async () => {
      // Arrange: Seed an existing active 2FA record for the user.
      await db.insert(userTwoFactor).values({
        userId: mockUserId,
        secret: mockSecret,
        enabled: true,
      });

      // Act: Attempt to verify 2FA again.
      const freshToken = authenticator.generate(mockSecret);
      const result = await verifyTwoFactor({ secret: mockSecret, token: freshToken });

      // Assert: Verify the error regarding duplicate enablement.
      expect(result.error).toBe("Two-factor authentication is already enabled for this account.");
    });
  });

  /**
   * Test suite for successful 2FA activation and recovery code generation.
   */
  describe("successful 2FA setup", () => {
    /**
     * Test case to verify that enabling 2FA creates recovery codes and persists the secret.
     */
    it("enables 2FA and updates db record", async () => {
      // Act: Successfully verify a fresh token.
      const freshToken = authenticator.generate(mockSecret);
      const result = await verifyTwoFactor({ secret: mockSecret, token: freshToken });

      // Assert: Verify success status and that 16 recovery codes were returned.
      expect(result.success).toBe("Two-factor authentication has been successfully enabled.");
      expect(result.data?.recoveryCodes).toHaveLength(16);

      // Assert: Confirm the `userTwoFactor` record is enabled and contains the secret.
      const twoFactorRecord = await db.query.userTwoFactor.findFirst({
        where: eq(userTwoFactor.userId, mockUserId),
      });

      expect(twoFactorRecord).toBeDefined();
      expect(twoFactorRecord?.enabled).toBe(true);
      expect(twoFactorRecord?.secret).toBe(mockSecret);
      expect(twoFactorRecord?.backupCodesGenerated).toBe(true);

      // Assert: Verify that 16 hashed recovery codes were stored in the `twoFactorRecoveryCodes` table.
      const recoveryCodes = await db.query.twoFactorRecoveryCodes.findMany({
        where: eq(twoFactorRecoveryCodes.userId, mockUserId),
      });
      expect(recoveryCodes).toHaveLength(16);
    });

    /**
     * Test case to verify that an existing but disabled 2FA record is updated correctly.
     */
    it("updates existing disabled 2FA record", async () => {
      // Arrange: Seed an inactive 2FA record with an old secret.
      await db.insert(userTwoFactor).values({
        userId: mockUserId,
        secret: "OLD_SECRET",
        enabled: false,
      });

      // Act: Verify 2FA with a new secret and token.
      const freshToken = authenticator.generate(mockSecret);
      const result = await verifyTwoFactor({ secret: mockSecret, token: freshToken });

      // Assert: Verify success response.
      expect(result.success).toBe("Two-factor authentication has been successfully enabled.");

      // Assert: Confirm the record was updated with the new secret and enabled status.
      const twoFactorRecord = await db.query.userTwoFactor.findFirst({
        where: eq(userTwoFactor.userId, mockUserId),
      });

      expect(twoFactorRecord?.enabled).toBe(true);
      expect(twoFactorRecord?.secret).toBe(mockSecret);
    });
  });

  /**
   * Test suite for handling internal errors during the verification process.
   */
  describe("error handling", () => {
    /**
     * Test case to verify that database or hashing failures return a generic error.
     */
    it("handles database errors gracefully", async () => {
      // Arrange: Suppress console error output for clean test logs.
      vi.spyOn(console, "error").mockImplementation(() => {});

      // Arrange: Force a failure during the recovery code hashing process.
      vi.spyOn(twoFactorLib, "hashRecoveryCode").mockRejectedValueOnce(
        new Error("Unexpected Error")
      );

      // Act: Attempt 2FA verification.
      const freshToken = authenticator.generate(mockSecret);
      const result = await verifyTwoFactor({ secret: mockSecret, token: freshToken });

      // Assert: Verify the fallback error message for failed verification.
      expect(result.error).toBe("Failed to verify two-factor authentication code.");
    });
  });
});
