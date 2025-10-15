import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

// Define hoisted mock functions to be used within module mocks.
const { mockDelete, mockWhere, mockReturning, mockLimit, mockUpdate, mockSet } = vi.hoisted(() => {
  const returning = vi.fn();
  const where = vi.fn(() => ({ returning }));
  const del = vi.fn(() => ({ where }));
  const limit = vi.fn();
  const updateWhere = vi.fn();
  const set = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set }));

  return {
    mockDelete: del,
    mockWhere: where,
    mockReturning: returning,
    mockLimit: limit,
    mockUpdate: update,
    mockSet: set,
  };
});

// Mock the authentication module to control session state.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept delete and update operations.
vi.mock("@/db", () => ({
  db: {
    delete: mockDelete,
    update: mockUpdate,
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
    expect(db.delete).not.toHaveBeenCalled();
  });

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
    expect(db.delete).not.toHaveBeenCalled();
  });

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
    expect(db.delete).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the action successfully cancels the analysis when inputs are valid.
   */
  it("successfully cancels analysis and returns success message", async () => {
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

    // Arrange: Mock the database returning the deleted record ID.
    mockReturning.mockResolvedValue([{ id: validCaseId }]);

    // Act: Call the server action with a valid ID.
    const result = await cancelAnalysis({ caseId: validCaseId });

    // Assert: Verify that the database delete chain was called correctly.
    expect(db.delete).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(mockReturning).toHaveBeenCalled();
    // Assert: Verify the success response structure.
    expect(result).toEqual({
      status: "success",
      message: "Analysis cancelled. Your case is now editable again.",
    });
    // Assert: Verify the case status was reverted to "draft".
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith({ status: "draft" });
  });

  /**
   * Test case to verify that the action returns a specific success message if the record was not found.
   */
  it("returns success message even if no record was found (idempotent)", async () => {
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

    // Arrange: Mock the database returning an empty array (no record deleted).
    mockReturning.mockResolvedValue([]);

    // Act: Call the server action.
    const result = await cancelAnalysis({ caseId: validCaseId });

    // Assert: Verify the delete operation was attempted.
    expect(db.delete).toHaveBeenCalled();
    // Assert: Verify the case status was still reverted to "draft".
    expect(mockUpdate).toHaveBeenCalled();
    // Assert: Verify the specific message indicating the analysis is now editable.
    expect(result).toEqual({
      status: "success",
      message: "Analysis cancelled. Your case is now editable again.",
    });
  });

  /**
   * Test case to verify that the action handles unexpected database errors gracefully.
   */
  it("handles database errors gracefully", async () => {
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

    // Arrange: Force the database operation to throw an error.
    mockReturning.mockRejectedValue(new Error("DB Connection Failed"));

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
});
