import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockIds, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { verificationTokens } from "@/db/schema";
import {
  getVerificationTokenByEmail,
  getVerificationTokenByToken,
} from "@/features/auth/tokens/verification-token";

/**
 * Integration test suite for verifying the retrieval of email verification tokens from the database.
 */
describe("verification-token (integration)", () => {
  /**
   * Clears mocks and resets the database state before each test case to ensure data isolation.
   */
  beforeEach(() => {
    // Arrange: Reset all mock call statistics and implementations.
    vi.clearAllMocks();
    // Arrange: Wipe the database tables and reset the schema state.
    resetMockDb();
  });

  // Helper function to seed the `verificationTokens` table with specific test data.
  const insertToken = async (identifier: string, token: string, expires: Date) => {
    await db.insert(verificationTokens).values({
      identifier,
      token,
      expires,
    });
  };

  /**
   * Test suite for the function that retrieves tokens based on the associated email address.
   */
  describe("getVerificationTokenByEmail", () => {
    /**
     * Verifies that the correct token object is returned when a matching record exists in the database.
     */
    it("returns the token object when it exists", async () => {
      // Arrange: Initialize test data using existing mock constants.
      const testEmail = mockUsers.primaryUser.email;
      const testToken = mockIds.firstSession;
      const testExpires = new Date("2025-01-01T00:00:00.000Z");

      // Arrange: Populate the `verificationTokens` table with the test record.
      await insertToken(testEmail, testToken, testExpires);

      // Act: Execute the retrieval function for the specified email.
      const result = await getVerificationTokenByEmail(testEmail);

      // Assert: Confirm the returned record matches the expected data and is not undefined.
      expect(result).not.toBeUndefined();
      expect(result?.identifier).toBe(testEmail);
      expect(result?.token).toBe(testToken);
      expect(result?.expires).toEqual(testExpires);
    });

    /**
     * Verifies that the function returns undefined when no record exists for the provided email.
     */
    it("returns undefined when the email is not found", async () => {
      // Act: Attempt to retrieve a token using an email that has not been seeded.
      const result = await getVerificationTokenByEmail("nonexistent@example.com");

      // Assert: Confirm that the result of the query is `undefined`.
      expect(result).toBeUndefined();
    });

    /**
     * Verifies that the function catches database errors and returns null as a fallback.
     */
    it("returns null when a database error occurs", async () => {
      // Arrange: Mock the database driver to simulate a connection failure.
      const dbError = new Error("Connection failed");
      vi.spyOn(db.query.verificationTokens, "findFirst").mockRejectedValue(dbError);

      // Act: Invoke the function which triggers the forced rejection.
      const result = await getVerificationTokenByEmail(mockUsers.secondaryUser.email);

      // Assert: Verify that the error is handled gracefully by returning `null`.
      expect(result).toBeNull();
    });
  });

  /**
   * Test suite for the function that retrieves tokens based on the unique token string.
   */
  describe("getVerificationTokenByToken", () => {
    /**
     * Verifies that the correct token object is returned when a matching token string is provided.
     */
    it("returns the token object when it exists", async () => {
      // Arrange: Initialize test data for the record to be inserted.
      const testEmail = mockUsers.primaryUser.email;
      const testToken = mockIds.secondSession;
      const testExpires = new Date("2025-02-15T00:00:00.000Z");

      // Arrange: Seed the database with the unique token string record.
      await insertToken(testEmail, testToken, testExpires);

      // Act: Execute the retrieval function for the specific token string.
      const result = await getVerificationTokenByToken(testToken);

      // Assert: Confirm the returned record accurately reflects the seeded values.
      expect(result).not.toBeUndefined();
      expect(result?.identifier).toBe(testEmail);
      expect(result?.token).toBe(testToken);
      expect(result?.expires).toEqual(testExpires);
    });

    /**
     * Verifies that the function returns undefined when the provided token string is not found.
     */
    it("returns undefined when the token is not found", async () => {
      // Act: Attempt to retrieve a record using a non-existent token identifier.
      const result = await getVerificationTokenByToken(mockIds.thirdSession);

      // Assert: Confirm the retrieval logic returns `undefined`.
      expect(result).toBeUndefined();
    });

    /**
     * Verifies that the function catches database errors during token string lookups and returns null.
     */
    it("returns null when a database error occurs", async () => {
      // Arrange: Force the database query to reject with a mock error.
      const dbError = new Error("Connection failed");
      vi.spyOn(db.query.verificationTokens, "findFirst").mockRejectedValue(dbError);

      // Act: Invoke the function to trigger the mocked exception.
      const result = await getVerificationTokenByToken(mockIds.fourthSession);

      // Assert: Verify that the internal catch block returns `null`.
      expect(result).toBeNull();
    });
  });
});
