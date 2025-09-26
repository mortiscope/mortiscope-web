import { Session } from "next-auth";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

// Define hoisted mocks to simulate the fluent interface of the database query builder.
const { mockLimit, mockWhere, mockInnerJoin, mockFrom, mockSelect } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockInnerJoin = vi.fn(() => ({ where: mockWhere }));
  const mockFrom = vi.fn(() => ({ innerJoin: mockInnerJoin }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  return { mockLimit, mockWhere, mockInnerJoin, mockFrom, mockSelect };
});

import { auth } from "@/auth";
import { getAnalysisStatus } from "@/features/results/actions/get-analysis-status";

// Mock the authentication module to control session availability.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database object to utilize the hoisted query builder mocks.
vi.mock("@/db", () => ({
  db: {
    select: mockSelect,
  },
}));

// Mock the database schema constants for table and column references.
vi.mock("@/db/schema", () => ({
  analysisResults: {
    status: "status",
    caseId: "caseId",
  },
  cases: {
    id: "id",
    userId: "userId",
  },
}));

/**
 * Test suite for the `getAnalysisStatus` server action.
 */
describe("getAnalysisStatus", () => {
  // Reset all mocks and reconstruct the fluent mock chain before each test case to ensure isolation.
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockInnerJoin.mockClear();
    mockWhere.mockClear();
    mockLimit.mockClear();
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ innerJoin: mockInnerJoin });
    mockInnerJoin.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
  });

  /**
   * Test case to verify that an error is thrown when no session exists.
   */
  it("throws an error if the user is not authenticated", async () => {
    // Arrange: Mock the `auth` call to return a null value.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Assert: Verify that the function rejects with the expected authentication error message.
    await expect(getAnalysisStatus("case-123")).rejects.toThrow("User not authenticated");
  });

  /**
   * Test case to verify that an error is thrown when a session exists but lacks a user identifier.
   */
  it("throws an error if the session has no user ID", async () => {
    // Arrange: Mock the `auth` call to return a session object with an empty user property.
    (auth as unknown as Mock).mockResolvedValue({
      user: {},
    } as Session);

    // Assert: Verify that the missing `id` property triggers an authentication rejection.
    await expect(getAnalysisStatus("case-123")).rejects.toThrow("User not authenticated");
  });

  /**
   * Test case to verify that the status is correctly retrieved when a valid database record is found.
   */
  it("returns the status from the database if a record is found", async () => {
    // Arrange: Mock a valid user session and a database record with a processing status.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    mockLimit.mockResolvedValue([{ status: "processing" }]);

    // Act: Invoke the action with a specific `caseId`.
    const status = await getAnalysisStatus("case-123");

    // Assert: Check that the returned status is correct and all database query segments were called.
    expect(status).toBe("processing");
    expect(mockSelect).toHaveBeenCalled();
    expect(mockFrom).toHaveBeenCalled();
    expect(mockInnerJoin).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalledWith(1);
  });

  /**
   * Test case to verify that the completed status is correctly returned from the database.
   */
  it("returns 'completed' status correctly", async () => {
    // Arrange: Mock a valid user session and a database record with a completed status.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    mockLimit.mockResolvedValue([{ status: "completed" }]);

    // Act: Retrieve the status for the given case.
    const status = await getAnalysisStatus("case-123");

    // Assert: Verify that the result matches the database value.
    expect(status).toBe("completed");
  });

  /**
   * Test case to verify that a default pending status is returned when no database record matches the query.
   */
  it("returns 'pending' if no record is found in the database", async () => {
    // Arrange: Mock a valid user session and an empty array from the database query.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    mockLimit.mockResolvedValue([]);

    // Act: Request the status for a case with no analysis result.
    const status = await getAnalysisStatus("case-123");

    // Assert: Verify that the system defaults to a pending state.
    expect(status).toBe("pending");
  });

  /**
   * Test case to verify that a default pending status is returned when the database record contains a null status.
   */
  it("returns 'pending' if the record exists but status is null or undefined", async () => {
    // Arrange: Mock a valid user session and a database record where the `status` column is null.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    mockLimit.mockResolvedValue([{ status: null }]);

    // Act: Retrieve the status for the case.
    const status = await getAnalysisStatus("case-123");

    // Assert: Verify that null status values are normalized to a pending string.
    expect(status).toBe("pending");
  });
});
