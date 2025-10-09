import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getAccountDeletionTokenByToken } from "@/features/account/tokens/account-deletion-token";

// Define a mock function to intercept and control database query behavior.
const mockFindFirst = vi.fn();

// Mock the database module to isolate the token retrieval logic from actual database connections.
vi.mock("@/db", () => ({
  db: {
    query: {
      accountDeletionTokens: {
        findFirst: (...args: unknown[]) => mockFindFirst(...args),
      },
    },
  },
}));

/**
 * Test suite for the `getAccountDeletionTokenByToken` utility function.
 */
describe("getAccountDeletionTokenByToken", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  // Reset all mocks and suppress console error output before each test case to ensure isolation.
  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // Restore the original global mock states after each test to prevent side effects in other suites.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test case to verify that the function successfully retrieves and returns a valid token object.
   */
  it("returns the token object when it exists", async () => {
    // Arrange: Create a mock token object and configure the database mock to resolve with it.
    const mockToken = {
      identifier: "user-123",
      token: "valid-token-123",
      expires: new Date(),
    };

    mockFindFirst.mockResolvedValue(mockToken);

    // Act: Execute the function with a specific token string.
    const result = await getAccountDeletionTokenByToken("valid-token-123");

    // Assert: Verify that the returned object matches the mock and the database was queried once.
    expect(result).toEqual(mockToken);
    expect(mockFindFirst).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that the function returns `null` when no matching token is found in the database.
   */
  it("returns null when the token is not found", async () => {
    // Arrange: Configure the database mock to resolve with `undefined`, simulating a missing record.
    mockFindFirst.mockResolvedValue(undefined);

    // Act: Attempt to retrieve a token that does not exist.
    const result = await getAccountDeletionTokenByToken("non-existent-token");

    // Assert: Check that the result is correctly identified as `null`.
    expect(result).toBeNull();
  });

  /**
   * Test case to verify that database exceptions are caught, return `null`, and log the error.
   */
  it("returns null and logs error when a database error occurs", async () => {
    // Arrange: Simulate a database rejection by throwing an error.
    const dbError = new Error("Connection failed");
    mockFindFirst.mockRejectedValue(dbError);

    // Act: Attempt to retrieve a token during a simulated database failure.
    const result = await getAccountDeletionTokenByToken("token-causing-error");

    // Assert: Verify that the function returns `null` and logs the specific error message to the console.
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith(
      "DATABASE_ERROR: Failed to retrieve account deletion token.",
      dbError
    );
  });
});
