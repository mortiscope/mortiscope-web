import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Define hoisted mocks to ensure the mock function is initialized before imports are evaluated.
const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

// Mock the database client to isolate data access logic from the actual database.
vi.mock("@/db", () => ({
  db: {
    query: {
      forgotPasswordTokens: {
        findFirst: mocks.findFirst,
      },
    },
  },
}));

import {
  getForgotPasswordTokenByEmail,
  getForgotPasswordTokenByToken,
} from "@/features/auth/tokens/forgot-password-token";

/**
 * Test suite for the data access layer responsible for retrieving forgot password tokens.
 */
describe("Forgot Password Token Data Access", () => {
  const mockToken = {
    identifier: "mortiscope@example.com",
    token: "valid-reset-token-123",
    expires: new Date(),
  };

  // Clear mock history before each test to ensure isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Reset mock implementations after each test to prevent side effects.
  afterEach(() => {
    vi.resetAllMocks();
  });

  /**
   * Group of tests for retrieving tokens using an email address.
   */
  describe("getForgotPasswordTokenByEmail", () => {
    /**
     * Test case to verify that the token is retrieved successfully by email.
     */
    it("returns the token when found in database", async () => {
      // Arrange: Mock the database query to return a valid token object.
      mocks.findFirst.mockResolvedValue(mockToken);

      // Act: Retrieve the token using the email identifier.
      const result = await getForgotPasswordTokenByEmail("mortiscope@example.com");

      // Assert: Verify the returned token matches the mock data and the query was executed.
      expect(result).toEqual(mockToken);
      expect(mocks.findFirst).toHaveBeenCalledTimes(1);
    });

    /**
     * Test case to verify that undefined is returned when the token does not exist.
     */
    it("returns undefined when token is not found", async () => {
      // Arrange: Mock the database query to return undefined.
      mocks.findFirst.mockResolvedValue(undefined);

      // Act: Attempt to retrieve a token for a non-existent email.
      const result = await getForgotPasswordTokenByEmail("nonexistent@example.com");

      // Assert: Check that the result is undefined.
      expect(result).toBeUndefined();
    });

    /**
     * Test case to verify that null is returned when a database error occurs.
     */
    it("returns null when a database error occurs", async () => {
      // Arrange: Mock the database query to throw an error.
      mocks.findFirst.mockRejectedValue(new Error("Database connection failed"));

      // Act: Attempt to retrieve the token.
      const result = await getForgotPasswordTokenByEmail("mortiscope@example.com");

      // Assert: Verify that the error is caught and handled by returning null.
      expect(result).toBeNull();
    });
  });

  /**
   * Group of tests for retrieving tokens using the token string itself.
   */
  describe("getForgotPasswordTokenByToken", () => {
    /**
     * Test case to verify that the token is retrieved successfully by token string.
     */
    it("returns the token when found in database", async () => {
      // Arrange: Mock the database query to return a valid token object.
      mocks.findFirst.mockResolvedValue(mockToken);

      // Act: Retrieve the token using the token string.
      const result = await getForgotPasswordTokenByToken("valid-reset-token-123");

      // Assert: Verify the returned token matches the mock data and the query was executed.
      expect(result).toEqual(mockToken);
      expect(mocks.findFirst).toHaveBeenCalledTimes(1);
    });

    /**
     * Test case to verify that undefined is returned when the token string is invalid.
     */
    it("returns undefined when token is not found", async () => {
      // Arrange: Mock the database query to return undefined.
      mocks.findFirst.mockResolvedValue(undefined);

      // Act: Attempt to retrieve a non-existent token.
      const result = await getForgotPasswordTokenByToken("invalid-token");

      // Assert: Check that the result is undefined.
      expect(result).toBeUndefined();
    });

    /**
     * Test case to verify that null is returned when the database query fails.
     */
    it("returns null when a database error occurs", async () => {
      // Arrange: Mock the database query to throw an error.
      mocks.findFirst.mockRejectedValue(new Error("Database connection failed"));

      // Act: Attempt to retrieve the token.
      const result = await getForgotPasswordTokenByToken("valid-reset-token-123");

      // Assert: Verify that the error is caught and handled by returning null.
      expect(result).toBeNull();
    });
  });
});
