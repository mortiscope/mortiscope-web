import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { emailChangeTokens } from "@/db/schema";
import {
  deleteEmailChangeToken,
  getEmailChangeTokenByToken,
} from "@/features/account/tokens/email-change-token";

// Define mock functions to simulate Drizzle ORM query and mutation behaviors.
const mockFindFirst = vi.fn();
const mockWhere = vi.fn();
const mockDelete = vi.fn((...args: unknown[]) => {
  void args;
  return { where: mockWhere };
});

// Mock the database module to intercept calls to the `emailChangeTokens` table.
vi.mock("@/db", () => ({
  db: {
    query: {
      emailChangeTokens: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

/**
 * Test suite for the `getEmailChangeTokenByToken` utility function.
 */
describe("getEmailChangeTokenByToken", () => {
  // Reset mock state before each test to ensure isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the function returns the full token object when a match exists in the database.
   */
  it("returns the token object when found", async () => {
    // Arrange: Define a mock token object and configure the database mock to return it.
    const mockToken = {
      id: "token-id-1",
      token: "valid-token-string",
      userId: "user-1",
      newEmail: "mortiscope@example.com",
      expires: new Date(),
    };

    mockFindFirst.mockResolvedValue(mockToken);

    // Act: Request the token by its string value.
    const result = await getEmailChangeTokenByToken("valid-token-string");

    // Assert: Verify the result matches the mock data and the database was queried once.
    expect(result).toEqual(mockToken);
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the function returns `undefined` when the token string does not exist.
   */
  it("returns undefined when token is not found", async () => {
    // Arrange: Configure the database mock to return no result.
    mockFindFirst.mockResolvedValue(undefined);

    // Act: Attempt to retrieve a non-existent token.
    const result = await getEmailChangeTokenByToken("non-existent-token");

    // Assert: Check that the result is `undefined`.
    expect(result).toBeUndefined();
  });

  /**
   * Test case to verify that database exceptions are caught and result in a `null` return value.
   */
  it("returns null when a database error occurs", async () => {
    // Arrange: Configure the database mock to throw an error during the query.
    mockFindFirst.mockRejectedValue(new Error("DB Connection Failed"));

    // Act: Attempt to retrieve a token while the database is failing.
    const result = await getEmailChangeTokenByToken("error-token");

    // Assert: Verify that the error is handled and returns `null`.
    expect(result).toBeNull();
  });
});

/**
 * Test suite for the `deleteEmailChangeToken` utility function.
 */
describe("deleteEmailChangeToken", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  // Set up mocks and spy on console error output to verify error logging.
  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // Restore original console behavior after each test.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test case to verify that the function correctly triggers a database deletion for a specific token ID.
   */
  it("successfully deletes the token", async () => {
    // Arrange: Configure the delete mock to resolve successfully.
    mockWhere.mockResolvedValue(undefined);

    // Act: Call the deletion function with a target ID.
    await deleteEmailChangeToken("token-id-1");

    // Assert: Verify that the correct table and condition were targeted and no errors were logged.
    expect(mockDelete).toHaveBeenCalledWith(emailChangeTokens);
    expect(mockWhere).toHaveBeenCalledTimes(1);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that failures during the deletion process are logged to the console.
   */
  it("logs an error when deletion fails", async () => {
    // Arrange: Configure the database mock to fail during the deletion operation.
    const dbError = new Error("Delete failed");
    mockWhere.mockRejectedValue(dbError);

    // Act: Attempt to delete a token.
    await deleteEmailChangeToken("token-id-1");

    // Assert: Verify that the error was caught and sent to the console log.
    expect(consoleSpy).toHaveBeenCalledWith("Error deleting email change token:", dbError);
  });
});
