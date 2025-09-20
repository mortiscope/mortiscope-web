import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

// Define hoisted mock functions to be used within module mocks.
const {
  mockFindFirst,
  mockUpdate,
  mockInsert,
  mockSet,
  mockWhere,
  mockValues,
  mockOnConflict,
  mockInngestSend,
} = vi.hoisted(() => {
  const findFirst = vi.fn();
  const where = vi.fn();
  const set = vi.fn(() => ({ where }));
  const update = vi.fn(() => ({ set }));

  const onConflict = vi.fn();
  const values = vi.fn(() => ({ onConflictDoUpdate: onConflict }));
  const insert = vi.fn(() => ({ values }));

  const send = vi.fn();

  return {
    mockFindFirst: findFirst,
    mockUpdate: update,
    mockInsert: insert,
    mockSet: set,
    mockWhere: where,
    mockValues: values,
    mockOnConflict: onConflict,
    mockInngestSend: send,
  };
});

// Mock the authentication module to control session state.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept query and mutation operations.
vi.mock("@/db", () => ({
  db: {
    query: {
      cases: {
        findFirst: mockFindFirst,
      },
    },
    update: mockUpdate,
    insert: mockInsert,
  },
}));

// Mock the Inngest client to track event triggers.
vi.mock("@/lib/inngest", () => ({
  inngest: {
    send: mockInngestSend,
  },
}));

// Mock Drizzle ORM helper functions while preserving other exports.
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual("drizzle-orm");
  return {
    ...actual,
    and: vi.fn(),
    eq: vi.fn(),
  };
});

import { auth } from "@/auth";
import { submitAnalysis } from "@/features/analyze/actions/submit-analysis";

type MockSession = {
  user: {
    id: string;
  };
};

// Groups related tests for the submit analysis server action.
describe("submitAnalysis", () => {
  const mockSession: MockSession = { user: { id: "user-123" } };
  const validCaseId = "cjld2cjxh0000qzrmn831i7rn";
  const mockAuth = auth as unknown as Mock<() => Promise<MockSession | null>>;

  // Reset all mocks before each test to ensure test isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the action returns an unauthorized error if the user is not logged in.
   */
  it("returns unauthorized error if user is not logged in", async () => {
    // Arrange: Mock auth to return null (no session).
    mockAuth.mockResolvedValue(null);

    // Act: Call the server action with a valid case ID.
    const result = await submitAnalysis({ caseId: validCaseId });

    // Assert: Verify that the result contains the unauthorized error message.
    expect(result).toEqual({ success: false, error: "Unauthorized" });
    // Assert: Ensure no database query was executed.
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the action returns an invalid input error for malformed case IDs.
   */
  it("returns invalid input error for malformed case ID", async () => {
    // Arrange: Mock auth to return a valid session.
    mockAuth.mockResolvedValue(mockSession);

    // Act: Call the server action with an invalid case ID.
    const result = await submitAnalysis({ caseId: "invalid-id" });

    // Assert: Verify that the result contains the validation error message.
    expect(result).toEqual({ success: false, error: "Invalid input provided." });
    // Assert: Ensure no database query was executed.
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the action returns an error if the case is not found or not in draft status.
   */
  it("returns error if case is not found or not in draft status", async () => {
    // Arrange: Mock auth to return a valid session.
    mockAuth.mockResolvedValue(mockSession);
    // Arrange: Mock findFirst to return undefined (case not found).
    mockFindFirst.mockResolvedValue(undefined);

    // Act: Call the server action.
    const result = await submitAnalysis({ caseId: validCaseId });

    // Assert: Verify that the result contains the specific not found error.
    expect(result).toEqual({
      success: false,
      error: "Case not found or has already been submitted.",
    });
    // Assert: Ensure no update operation was attempted.
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the action successfully submits the analysis, updates the database, and triggers the event.
   */
  it("successfully submits analysis, updates db, and triggers event", async () => {
    // Arrange: Mock auth to return a valid session.
    mockAuth.mockResolvedValue(mockSession);
    // Arrange: Mock findFirst to return a valid case record.
    mockFindFirst.mockResolvedValue({ id: validCaseId });
    // Arrange: Mock successful database operations.
    mockWhere.mockResolvedValue(undefined);
    mockOnConflict.mockResolvedValue(undefined);
    // Arrange: Mock successful Inngest event sending.
    mockInngestSend.mockResolvedValue({ ids: ["event-id"] });

    // Act: Call the server action.
    const result = await submitAnalysis({ caseId: validCaseId });

    // Assert: Verify that the case status update was initiated.
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith({ status: "active" });

    // Assert: Verify that the analysis record insertion was initiated.
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({
      caseId: validCaseId,
      status: "pending",
    });

    // Assert: Check that the analysis request event was sent via Inngest.
    expect(mockInngestSend).toHaveBeenCalledWith({
      name: "analysis/request.sent",
      data: { caseId: validCaseId },
    });

    // Assert: Verify the success response structure.
    expect(result).toEqual({
      success: true,
      message: "Analysis has been successfully submitted.",
    });
  });

  /**
   * Test case to verify that database errors are handled gracefully.
   */
  it("handles database errors gracefully", async () => {
    // Arrange: Spy on console error and mock a database rejection.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockAuth.mockResolvedValue(mockSession);
    mockFindFirst.mockRejectedValue(new Error("DB Connection Failed"));

    // Act: Call the server action.
    const result = await submitAnalysis({ caseId: validCaseId });

    // Assert: Verify that the error was logged to the console.
    expect(consoleSpy).toHaveBeenCalledWith("Error submitting analysis:", expect.any(Error));
    // Assert: Check that the result contains a generic server error message.
    expect(result).toEqual({
      success: false,
      error: "An internal server error occurred.",
    });
  });
});
