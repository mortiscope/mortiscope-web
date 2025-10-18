import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { emailChangeTokens, users } from "@/db/schema";
import {
  deleteEmailChangeToken,
  getEmailChangeTokenByToken,
} from "@/features/account/tokens/email-change-token";

/**
 * Integration test suite for email change token database operations.
 */
describe("email-change-token (integration)", () => {
  const testUserId = mockUsers.primaryUser.id;

  /**
   * Resets the mock state and database before each test execution.
   */
  beforeEach(async () => {
    // Arrange: Clear mock history and reset the database to a clean state.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Seed the `users` table with a primary test user record.
    await db.insert(users).values({
      id: testUserId,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Utility function to insert an email change token into the database.
   * @param {string} id - The unique record identifier.
   * @param {string} token - The secure verification token string.
   * @param {Date} expires - The expiration timestamp for the token.
   * @param {string} newEmail - The pending email address associated with the token.
   */
  const insertToken = async (id: string, token: string, expires: Date, newEmail: string) => {
    // Arrange: Insert the token record into the `emailChangeTokens` table.
    await db.insert(emailChangeTokens).values({
      id,
      token,
      expires,
      userId: testUserId,
      newEmail,
    });
  };

  /**
   * Test suite for the retrieval of email change tokens by their token string.
   */
  describe("getEmailChangeTokenByToken", () => {
    /**
     * Test case to verify that a valid token is correctly fetched from the database.
     */
    it("returns the token object when it exists", async () => {
      // Arrange: Define test constants and seed a valid token record.
      const testId = "vy8lxd9qbr7s0ace3gvh4jof";
      const testToken = "wx9mze0qcs8t1bdf4hwi5kpg";
      const testExpires = new Date("2025-02-01T00:00:00.000Z");
      const testNewEmail = "newemail@example.com";

      await insertToken(testId, testToken, testExpires, testNewEmail);

      // Act: Attempt to retrieve the token object using the `testToken` string.
      const result = await getEmailChangeTokenByToken(testToken);

      // Assert: Verify the returned record matches all seeded properties.
      expect(result).not.toBeUndefined();
      expect(result?.id).toBe(testId);
      expect(result?.token).toBe(testToken);
      expect(result?.expires).toEqual(testExpires);
      expect(result?.userId).toBe(testUserId);
      expect(result?.newEmail).toBe(testNewEmail);
    });

    /**
     * Test case to verify that a search for a non-existent token results in an undefined response.
     */
    it("returns undefined when the token is not found", async () => {
      // Act: Search for a token string that does not exist in the database.
      const result = await getEmailChangeTokenByToken("yx0naf1rdt9u2ceg5ixj6lqh");

      // Assert: Verify the result is undefined.
      expect(result).toBeUndefined();
    });

    /**
     * Test case to verify that database exceptions during retrieval return null.
     */
    it("returns null when a database error occurs", async () => {
      // Arrange: Force the database query to reject with an error.
      const dbError = new Error("Connection failed");
      vi.spyOn(db.query.emailChangeTokens, "findFirst").mockRejectedValue(dbError);

      // Act: Attempt to retrieve a token while the database is failing.
      const result = await getEmailChangeTokenByToken("zy1obg2seu0v3dfh6jyk7mri");

      // Assert: Verify the error handling returns null.
      expect(result).toBeNull();
    });
  });

  /**
   * Test suite for the deletion of email change tokens from the database.
   */
  describe("deleteEmailChangeToken", () => {
    /**
     * Test case to verify that an existing token is successfully removed by its ID.
     */
    it("successfully deletes an existing token", async () => {
      // Arrange: Seed a token record for deletion testing.
      const testId = "az2pch3tfv1w4egi7kzl8nsj";
      const testToken = "ba3qdi4ugw2x5fhj8la19otk";

      await insertToken(
        testId,
        testToken,
        new Date("2025-02-01T00:00:00.000Z"),
        "delete@example.com"
      );

      // Arrange: Confirm the token exists before proceeding with deletion.
      const beforeDelete = await getEmailChangeTokenByToken(testToken);
      expect(beforeDelete).not.toBeUndefined();

      // Act: Delete the token using its unique `testId`.
      await deleteEmailChangeToken(testId);

      // Assert: Verify the token no longer exists in the database.
      const afterDelete = await getEmailChangeTokenByToken(testToken);
      expect(afterDelete).toBeUndefined();
    });

    /**
     * Test case to verify that deletion errors are logged correctly.
     */
    it("logs error when a database error occurs", async () => {
      // Arrange: Mock the console and force the delete operation to throw an error.
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const dbError = new Error("Delete failed");

      vi.spyOn(db, "delete").mockImplementation(() => {
        throw dbError;
      });

      // Act: Attempt to delete a token while the database is failing.
      await deleteEmailChangeToken("cb4rej5vhx3y6gik9mb20pul");

      // Assert: Verify the expected error was logged to the console.
      expect(consoleSpy).toHaveBeenCalledWith("Error deleting email change token:", dbError);

      // Arrange: Restore the original console implementation.
      consoleSpy.mockRestore();
    });
  });
});
