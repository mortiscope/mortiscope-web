import { notFound } from "next/navigation";
import { Session } from "next-auth";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

// Define hoisted mocks for the database query layer to ensure availability during module loading.
const { mockFindFirst } = vi.hoisted(() => {
  return { mockFindFirst: vi.fn() };
});

import { auth } from "@/auth";
import { getCaseById } from "@/features/results/actions/get-case-by-id";

// Mock the authentication utility to simulate various login states.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock Next.js navigation to verify the behavior of the notFound utility.
vi.mock("next/navigation", () => ({
  notFound: vi.fn().mockImplementation(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

// Mock the database client to use the hoisted findFirst function.
vi.mock("@/db", () => ({
  db: {
    query: {
      cases: {
        findFirst: mockFindFirst,
      },
    },
  },
}));

// Mock database schema constants for case and user identification.
vi.mock("@/db/schema", () => ({
  cases: {
    id: "id",
    userId: "userId",
  },
}));

/**
 * Test suite for the `getCaseById` server action.
 */
describe("getCaseById", () => {
  // Reset all mock states before each test case to maintain test independence.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that unauthenticated requests are rejected immediately.
   */
  it("throws an error if the user is not authenticated", async () => {
    // Arrange: Set the mock session to null to simulate a logged-out state.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Assert: Verify that an Unauthorized error is thrown and the database is not queried.
    await expect(getCaseById("case-123")).rejects.toThrow("Unauthorized");
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that missing or restricted records trigger the Next.js notFound behavior.
   */
  it("calls notFound if the case does not exist or belongs to another user", async () => {
    // Arrange: Provide a valid session but return no results from the database.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    mockFindFirst.mockResolvedValue(undefined);

    // Act & Assert: Check that the error is re-thrown as Case not found and the `notFound` utility is triggered.
    await expect(getCaseById("case-123")).rejects.toThrow("Case not found");

    expect(mockFindFirst).toHaveBeenCalled();
    expect(notFound).toHaveBeenCalled();
  });

  /**
   * Test case to verify that valid requests return the appropriate case data objects.
   */
  it("returns the complete case data if found", async () => {
    // Arrange: Set up a valid session and mock data for a successful database retrieval.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    const mockCaseData = {
      id: "case-123",
      caseName: "Test Case",
      uploads: [],
      analysisResult: null,
    };

    mockFindFirst.mockResolvedValue(mockCaseData);

    // Act: Execute the retrieval logic for the specified `caseId`.
    const result = await getCaseById("case-123");

    // Assert: Verify the returned object matches `mockCaseData` and `notFound` was never called.
    expect(result).toEqual(mockCaseData);
    expect(mockFindFirst).toHaveBeenCalled();
    expect(notFound).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that soft-deleted detections are filtered out from uploads.
   */
  it("filters out soft-deleted detections from uploads", async () => {
    // Arrange: Set up a valid session and mock data with soft-deleted detections.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    const mockCaseData = {
      id: "case-123",
      caseName: "Test Case",
      uploads: [
        {
          id: "upload-1",
          detections: [
            { id: "detection-1", deletedAt: null },
            { id: "detection-2", deletedAt: new Date("2025-01-01") },
            { id: "detection-3", deletedAt: null },
          ],
        },
        {
          id: "upload-2",
          detections: [{ id: "detection-4", deletedAt: new Date("2025-01-02") }],
        },
      ],
      analysisResult: null,
    };

    mockFindFirst.mockResolvedValue(mockCaseData);

    // Act: Execute the retrieval logic for the specified `caseId`.
    const result = await getCaseById("case-123");

    // Assert: Verify soft-deleted detections are filtered out.
    expect(result.uploads).toHaveLength(2);
    expect(result.uploads[0].detections).toHaveLength(2);
    expect(result.uploads[0].detections).toEqual([
      { id: "detection-1", deletedAt: null },
      { id: "detection-3", deletedAt: null },
    ]);
    expect(result.uploads[1].detections).toHaveLength(0);
    expect(notFound).not.toHaveBeenCalled();
  });
});
