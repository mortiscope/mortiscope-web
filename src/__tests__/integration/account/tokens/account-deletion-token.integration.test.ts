import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockIds, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { accountDeletionTokens } from "@/db/schema";
import { getAccountDeletionTokenByToken } from "@/features/account/tokens/account-deletion-token";

/**
 * Integration test suite for the account deletion token retrieval logic.
 */
describe("getAccountDeletionTokenByToken (integration)", () => {
  /**
   * Resets the mock state and database before each test execution.
   */
  beforeEach(() => {
    // Arrange: Clear mock history and reset the database to a clean state.
    vi.clearAllMocks();
    resetMockDb();
  });

  /**
   * Utility function to insert an account deletion token into the database.
   * @param {string} identifier - The user identifier associated with the token.
   * @param {string} token - The unique verification token string.
   * @param {Date} expires - The expiration timestamp for the token.
   */
  const insertToken = async (identifier: string, token: string, expires: Date) => {
    // Arrange: Seed the `accountDeletionTokens` table with the provided values.
    await db.insert(accountDeletionTokens).values({
      identifier,
      token,
      expires,
    });
  };

  /**
   * Test case to verify that an existing token is correctly retrieved from the database.
   */
  it("returns the token object when it exists", async () => {
    // Arrange: Define test constants and seed a valid token in the database.
    const testIdentifier = mockUsers.primaryUser.email;
    const testToken = mockIds.firstSession;
    const testExpires = new Date("2025-02-01T00:00:00.000Z");

    await insertToken(testIdentifier, testToken, testExpires);

    // Act: Invoke the retrieval function using the seeded token string.
    const result = await getAccountDeletionTokenByToken(testToken);

    // Assert: Verify that the returned object matches the seeded database record.
    expect(result).not.toBeNull();
    expect(result?.identifier).toBe(testIdentifier);
    expect(result?.token).toBe(testToken);
    expect(result?.expires).toEqual(testExpires);
  });

  /**
   * Test case to verify that searching for a non-existent token returns null.
   */
  it("returns null when the token is not found", async () => {
    // Act: Attempt to retrieve a token that has not been seeded in the database.
    const result = await getAccountDeletionTokenByToken(mockIds.secondSession);

    // Assert: Verify that the result is null.
    expect(result).toBeNull();
  });

  /**
   * Test case to verify that database exceptions are caught and reported correctly.
   */
  it("returns null and logs error when a database error occurs", async () => {
    // Arrange: Mock the console error output and force a database query rejection.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const dbError = new Error("Connection failed");

    vi.spyOn(db.query.accountDeletionTokens, "findFirst").mockRejectedValue(dbError);

    // Act: Attempt to retrieve a token while the database query is failing.
    const result = await getAccountDeletionTokenByToken(mockIds.thirdSession);

    // Assert: Verify the result is null and the expected error was logged to the console.
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "DATABASE_ERROR: Failed to retrieve account deletion token.",
      dbError
    );

    // Arrange: Restore the original console error implementation.
    consoleSpy.mockRestore();
  });
});
