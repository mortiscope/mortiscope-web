import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

// Define hoisted mock functions to be used within module mocks.
const {
  mockTransaction,
  mockLimit,
  mockTxSelect,
  mockTxFrom,
  mockTxWhere,
  mockTxDelete,
  mockTxUpdate,
  mockTxSet,
} = vi.hoisted(() => {
  // Mock the transaction's select chain: tx.select().from().where()
  const txWhere = vi.fn();
  const txFrom = vi.fn(() => ({ where: txWhere }));
  const txSelect = vi.fn(() => ({ from: txFrom }));

  // Mock the transaction's delete chain: tx.delete().where()
  const txDeleteWhere = vi.fn();
  const txDelete = vi.fn(() => ({ where: txDeleteWhere }));

  // Mock the transaction's update chain: tx.update().set().where()
  const txUpdateWhere = vi.fn();
  const txSet = vi.fn(() => ({ where: txUpdateWhere }));
  const txUpdate = vi.fn(() => ({ set: txSet }));

  // Mock the transaction function itself.
  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<void>) => {
    const tx = {
      select: txSelect,
      delete: txDelete,
      update: txUpdate,
    };
    await callback(tx);
  });

  // Mock rate limiter.
  const limit = vi.fn();

  return {
    mockTransaction: transaction,
    mockLimit: limit,
    mockTxSelect: txSelect,
    mockTxFrom: txFrom,
    mockTxWhere: txWhere,
    mockTxDelete: txDelete,
    mockTxUpdate: txUpdate,
    mockTxSet: txSet,
  };
});

// Mock the authentication module to control session state.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept transaction operations.
vi.mock("@/db", () => ({
  db: {
    transaction: mockTransaction,
  },
}));

// Mock the rate limiter to test throttling logic.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: mockLimit,
  },
}));

// Mock Drizzle ORM to handle query builder functions.
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual("drizzle-orm");
  return {
    ...actual,
    eq: vi.fn(),
    inArray: vi.fn(),
  };
});

import { auth } from "@/auth";
import { db } from "@/db";
import { cancelAnalysis } from "@/features/analyze/actions/cancel-analysis";

type MockSession = {
  user: {
    id: string;
  };
};

// Groups related tests for the cancelAnalysis server action.
describe("cancelAnalysis", () => {
  const mockSession: MockSession = { user: { id: "user-123" } };
  // A valid CUID string to pass input validation checks.
  const validCaseId = "cjld2cjxh0000qzrmn831i7rn";

  const mockAuth = auth as unknown as Mock<() => Promise<MockSession | null>>;

  // Reset all mocks before each test to ensure test isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test suite for verifying authentication-related security checks.
   */
  describe("authentication", () => {
    /**
     * Test case to verify that the action returns an error if the user is not authenticated.
     */
    it("returns error if user is not authenticated", async () => {
      // Arrange: Mock auth to return null (no session).
      mockAuth.mockResolvedValue(null);

      // Act: Call the server action.
      const result = await cancelAnalysis({ caseId: validCaseId });

      // Assert: Verify that an authentication error is returned.
      expect(result).toEqual({
        status: "error",
        message: "You must be logged in to perform this action.",
      });
      // Assert: Ensure no database operations were attempted.
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  /**
   * Test suite for verifying the enforcement of rate limits.
   */
  describe("rate limiting", () => {
    /**
     * Test case to verify that the action returns an error if the rate limit is exceeded.
     */
    it("returns error if rate limit is exceeded", async () => {
      // Arrange: Mock auth to return a valid session.
      mockAuth.mockResolvedValue(mockSession);

      // Arrange: Mock the rate limiter to return a failure status.
      mockLimit.mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: 0,
        pending: Promise.resolve(),
      });

      // Act: Call the server action.
      const result = await cancelAnalysis({ caseId: validCaseId });

      // Assert: Verify that a rate limit error is returned.
      expect(result).toEqual({
        status: "error",
        message: "Rate limit exceeded. Please try again later.",
      });
      // Assert: Ensure no database operations were attempted.
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  /**
   * Test suite for verifying input schema validation.
   */
  describe("input validation", () => {
    /**
     * Test case to verify that the action returns an error if the input caseId is invalid.
     */
    it("returns error if input validation fails (invalid CUID)", async () => {
      // Arrange: Mock auth to return a valid session.
      mockAuth.mockResolvedValue(mockSession);

      // Arrange: Mock the rate limiter to allow the request.
      mockLimit.mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: 0,
        pending: Promise.resolve(),
      });

      // Act: Call the server action with an invalid CUID string.
      const result = await cancelAnalysis({ caseId: "invalid-id" });

      // Assert: Verify that an input validation error is returned.
      expect(result).toEqual({
        status: "error",
        message: "Invalid input provided. Please try again.",
      });
      // Assert: Ensure no database operations were attempted.
      expect(db.transaction).not.toHaveBeenCalled();
    });
  });

  /**
   * Test suite for successful analysis cancellation paths.
   */
  describe("successful cancellation", () => {
    /**
     * Sets up valid preconditions for successful cancellation tests.
     */
    beforeEach(() => {
      // Arrange: Mock auth to return a valid session.
      mockAuth.mockResolvedValue(mockSession);

      // Arrange: Mock the rate limiter to allow the request.
      mockLimit.mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: 0,
        pending: Promise.resolve(),
      });
    });

    /**
     * Test case to verify that the action successfully cancels the analysis when inputs are valid.
     */
    it("successfully cancels analysis with transaction and returns success message", async () => {
      // Arrange: Mock the transaction operations to simulate a case with uploads.
      mockTxWhere.mockResolvedValue([{ id: "upload-1" }, { id: "upload-2" }]);

      // Act: Call the server action with a valid ID.
      const result = await cancelAnalysis({ caseId: validCaseId });

      // Assert: Verify that the transaction was initiated.
      expect(db.transaction).toHaveBeenCalledTimes(1);
      // Assert: Verify the select chain was called to fetch uploads.
      expect(mockTxSelect).toHaveBeenCalled();
      expect(mockTxFrom).toHaveBeenCalled();
      expect(mockTxWhere).toHaveBeenCalled();
      // Assert: Verify detections were deleted.
      expect(mockTxDelete).toHaveBeenCalled();
      // Assert: Verify the case status was reverted to "draft".
      expect(mockTxUpdate).toHaveBeenCalled();
      expect(mockTxSet).toHaveBeenCalledWith({ status: "draft" });
      // Assert: Verify the success response structure.
      expect(result).toEqual({
        status: "success",
        message: "Analysis has been successfully cancelled.",
      });
    });

    /**
     * Test case to verify that the action handles cases with no uploads gracefully.
     */
    it("handles cases with no uploads (skips detection deletion)", async () => {
      // Arrange: Mock the transaction to return no uploads.
      mockTxWhere.mockResolvedValue([]);

      // Act: Call the server action.
      const result = await cancelAnalysis({ caseId: validCaseId });

      // Assert: Verify the transaction completed successfully.
      expect(db.transaction).toHaveBeenCalledTimes(1);
      // Assert: Verify deletion and update were still called.
      expect(mockTxDelete).toHaveBeenCalled();
      expect(mockTxUpdate).toHaveBeenCalled();
      // Assert: Verify the success response.
      expect(result).toEqual({
        status: "success",
        message: "Analysis has been successfully cancelled.",
      });
    });
  });

  /**
   * Test suite for verifying handling of unexpected system failures.
   */
  describe("error handling", () => {
    /**
     * Sets up valid preconditions for error handling tests.
     */
    beforeEach(() => {
      // Arrange: Mock auth to return a valid session.
      mockAuth.mockResolvedValue(mockSession);

      // Arrange: Mock the rate limiter to allow the request.
      mockLimit.mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: 0,
        pending: Promise.resolve(),
      });
    });

    /**
     * Test case to verify that the action handles unexpected database errors gracefully.
     */
    it("handles database errors gracefully", async () => {
      // Arrange: Force the transaction to throw an error.
      mockTransaction.mockRejectedValue(new Error("DB Connection Failed"));

      // Arrange: Suppress the expected console.error output from the action.
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act: Call the server action.
      const result = await cancelAnalysis({ caseId: validCaseId });

      // Assert: Verify that a generic error message is returned.
      expect(result).toEqual({
        status: "error",
        message: "A database error occurred. Please try again.",
      });

      // Cleanup: Restore console.error.
      consoleSpy.mockRestore();
    });

    /**
     * Test case to verify that the action handles transaction rollback on partial failure.
     */
    it("handles transaction rollback on partial failure", async () => {
      // Arrange: Mock upload fetch to succeed but force a later operation to fail.
      mockTxWhere.mockResolvedValueOnce([{ id: "upload-1" }]);
      mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => {
        const tx = {
          select: mockTxSelect,
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockRejectedValue(new Error("Delete failed")),
          }),
          update: mockTxUpdate,
        };
        await callback(tx);
      });

      // Arrange: Suppress the expected console.error output.
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Act: Call the server action.
      const result = await cancelAnalysis({ caseId: validCaseId });

      // Assert: Verify that an error is returned due to transaction failure.
      expect(result).toEqual({
        status: "error",
        message: "A database error occurred. Please try again.",
      });

      // Cleanup: Restore console.error.
      consoleSpy.mockRestore();
    });
  });
});
