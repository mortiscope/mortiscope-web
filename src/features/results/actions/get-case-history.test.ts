import { Session } from "next-auth";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

// Define hoisted mocks to simulate database query methods for cases and audit logs.
const { mockFindFirst, mockFindMany } = vi.hoisted(() => {
  return {
    mockFindFirst: vi.fn(),
    mockFindMany: vi.fn(),
  };
});

import { auth } from "@/auth";
import { getCaseHistory } from "@/features/results/actions/get-case-history";

// Mock the authentication module to handle session state simulation.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept queries to cases and audit log tables.
vi.mock("@/db", () => ({
  db: {
    query: {
      cases: {
        findFirst: mockFindFirst,
      },
      caseAuditLogs: {
        findMany: mockFindMany,
      },
    },
  },
}));

// Mock the database schema to provide valid column references for the query builder.
vi.mock("@/db/schema", () => ({
  cases: {
    id: "id",
    userId: "userId",
  },
  caseAuditLogs: {
    caseId: "caseId",
    timestamp: "timestamp",
  },
}));

/**
 * Test suite for the `getCaseHistory` server action.
 */
describe("getCaseHistory", () => {
  // Clear mock history before each test to ensure a clean state for assertions.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that an error is thrown when no active session is detected.
   */
  it("throws an error if the user is not authenticated", async () => {
    // Arrange: Mock the `auth` function to return null.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Assert: Verify that the action rejects with an Unauthorized error and skips database queries.
    await expect(getCaseHistory("case-123")).rejects.toThrow("Unauthorized");
    expect(mockFindFirst).not.toHaveBeenCalled();
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that access is denied if the case does not exist or does not belong to the user.
   */
  it("throws an error if access is denied or case is not found", async () => {
    // Arrange: Mock an active session but simulate a database miss for the ownership check.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    mockFindFirst.mockResolvedValue(null);

    // Assert: Verify that the specific error message is thrown and logs are never fetched.
    await expect(getCaseHistory("case-123")).rejects.toThrow("Case not found or access denied.");
    expect(mockFindFirst).toHaveBeenCalled();
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that audit logs are returned when the user is authorized to view the case.
   */
  it("returns the audit log history when access is verified", async () => {
    // Arrange: Mock a valid session and successful ownership verification.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    mockFindFirst.mockResolvedValue({ id: "case-123" });

    // Define a sample set of audit log records.
    const mockHistory = [
      {
        id: "log-1",
        field: "status",
        oldValue: "draft",
        newValue: "active",
        user: { name: "User", image: "image.jpg" },
      },
      {
        id: "log-2",
        field: "caseName",
        oldValue: "Untitled",
        newValue: "Case 1",
        user: { name: "User", image: "image.jpg" },
      },
    ];

    mockFindMany.mockResolvedValue(mockHistory);

    // Act: Invoke the action to retrieve the history for `case-123`.
    const result = await getCaseHistory("case-123");

    // Assert: Check that the result matches the mocked audit logs and both database calls were made.
    expect(result).toEqual(mockHistory);
    expect(mockFindFirst).toHaveBeenCalled();
    expect(mockFindMany).toHaveBeenCalled();
  });
});
