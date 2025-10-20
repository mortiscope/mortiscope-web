import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { forgotPasswordTokens } from "@/db/schema";
import {
  getForgotPasswordTokenByEmail,
  getForgotPasswordTokenByToken,
} from "@/features/auth/tokens/forgot-password-token";

/**
 * Integration test suite for password reset token retrieval functions.
 */
describe("forgot-password-token (integration)", () => {
  /**
   * Resets the database and mock state before each test execution to ensure isolation.
   */
  beforeEach(() => {
    // Arrange: Clear mock function call history.
    vi.clearAllMocks();
    // Arrange: Reset the database state to a clean baseline.
    resetMockDb();
  });

  // Helper function to seed the `forgotPasswordTokens` table for testing.
  const insertToken = async (identifier: string, token: string, expires: Date) => {
    await db.insert(forgotPasswordTokens).values({
      identifier,
      token,
      expires,
    });
  };

  /**
   * Test group for retrieving a forgot password token by an email identifier.
   */
  describe("getForgotPasswordTokenByEmail", () => {
    /**
     * Verifies that the correct token record is returned when a matching email exists.
     */
    it("returns the token object when it exists", async () => {
      // Arrange: Define test data for the `forgotPasswordTokens` table.
      const testEmail = mockUsers.primaryUser.email;
      const testToken = "vy8lxd9qbr7s0ace3gvh4jof";
      const testExpires = new Date("2025-02-01T00:00:00.000Z");

      // Arrange: Insert the test token into the database.
      await insertToken(testEmail, testToken, testExpires);

      // Act: Invoke the function with the `testEmail` value.
      const result = await getForgotPasswordTokenByEmail(testEmail);

      // Assert: Verify that the returned object matches the seeded database record.
      expect(result).not.toBeUndefined();
      expect(result?.identifier).toBe(testEmail);
      expect(result?.token).toBe(testToken);
      expect(result?.expires).toEqual(testExpires);
    });

    /**
     * Verifies that the function returns undefined when no record matches the email.
     */
    it("returns undefined when the email is not found", async () => {
      // Act: Invoke the function with an email that does not exist in the database.
      const result = await getForgotPasswordTokenByEmail("nonexistent@example.com");

      // Assert: Ensure the result is `undefined`.
      expect(result).toBeUndefined();
    });

    /**
     * Verifies that database exceptions are caught and result in a null value.
     */
    it("returns null when a database error occurs", async () => {
      // Arrange: Force the database query to throw an error.
      const dbError = new Error("Connection failed");
      vi.spyOn(db.query.forgotPasswordTokens, "findFirst").mockRejectedValue(dbError);

      // Act: Invoke the function and trigger the mocked database failure.
      const result = await getForgotPasswordTokenByEmail(mockUsers.secondaryUser.email);

      // Assert: Verify that the error is handled and returns `null`.
      expect(result).toBeNull();
    });
  });

  /**
   * Test group for retrieving a forgot password token by its token string.
   */
  describe("getForgotPasswordTokenByToken", () => {
    /**
     * Verifies that the correct token record is returned when a matching token string exists.
     */
    it("returns the token object when it exists", async () => {
      // Arrange: Define test data for the `forgotPasswordTokens` table.
      const testEmail = mockUsers.primaryUser.email;
      const testToken = "wx9mze0qcs8t1bdf4hwi5kpg";
      const testExpires = new Date("2025-02-15T00:00:00.000Z");

      // Arrange: Insert the test token into the database.
      await insertToken(testEmail, testToken, testExpires);

      // Act: Invoke the function with the `testToken` value.
      const result = await getForgotPasswordTokenByToken(testToken);

      // Assert: Verify that the returned object matches the seeded database record.
      expect(result).not.toBeUndefined();
      expect(result?.identifier).toBe(testEmail);
      expect(result?.token).toBe(testToken);
      expect(result?.expires).toEqual(testExpires);
    });

    /**
     * Verifies that the function returns undefined when the token string is not found.
     */
    it("returns undefined when the token is not found", async () => {
      // Act: Invoke the function with a token string that does not exist.
      const result = await getForgotPasswordTokenByToken("yx0naf1rdt9u2ceg5ixj6lqh");

      // Assert: Ensure the result is `undefined`.
      expect(result).toBeUndefined();
    });

    /**
     * Verifies that database exceptions are caught and result in a null value.
     */
    it("returns null when a database error occurs", async () => {
      // Arrange: Force the database query to throw an error.
      const dbError = new Error("Connection failed");
      vi.spyOn(db.query.forgotPasswordTokens, "findFirst").mockRejectedValue(dbError);

      // Act: Invoke the function and trigger the mocked database failure.
      const result = await getForgotPasswordTokenByToken("zy1obg2seu0v3dfh6jyk7mri");

      // Assert: Verify that the error is handled and returns `null`.
      expect(result).toBeNull();
    });
  });
});
