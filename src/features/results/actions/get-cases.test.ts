import { Session } from "next-auth";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

// Define hoisted mocks for the database query layer to allow access before module imports.
const { mockFindMany } = vi.hoisted(() => {
  return { mockFindMany: vi.fn() };
});

import { auth } from "@/auth";
import { getCases } from "@/features/results/actions/get-cases";

// Mock the authentication module to control user session simulation.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept data retrieval for cases.
vi.mock("@/db", () => ({
  db: {
    query: {
      cases: {
        findMany: mockFindMany,
      },
    },
  },
}));

// Mock the database schema constants for consistent property referencing in queries.
vi.mock("@/db/schema", () => ({
  cases: {
    userId: "userId",
    status: "status",
    createdAt: "createdAt",
  },
  detections: {
    deletedAt: "deletedAt",
  },
}));

/**
 * Test suite for the `getCases` server action.
 */
describe("getCases", () => {
  // Clear all mock call histories before each test case to ensure isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that unauthenticated users cannot retrieve case data.
   */
  it("throws an error if the user is not authenticated", async () => {
    // Arrange: Mock the `auth` function to return null.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Assert: Verify that an authentication error is thrown and database calls are skipped.
    await expect(getCases()).rejects.toThrow("User not authenticated");
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that an empty array is returned when the database query yields no records.
   */
  it("returns transformed cases correctly when user has no cases", async () => {
    // Arrange: Mock a valid session and an empty set of cases from the database.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    mockFindMany.mockResolvedValue([]);

    // Act: Invoke the retrieval logic.
    const result = await getCases();

    // Assert: Check that the result is an empty array and the query was executed.
    expect(result).toEqual([]);
    expect(mockFindMany).toHaveBeenCalled();
  });

  /**
   * Test case to verify the calculation of the no_detections status for cases with zero uploads or findings.
   */
  it("calculates 'no_detections' status correctly", async () => {
    // Arrange: Mock a session and a case containing an upload with no detection records.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    mockFindMany.mockResolvedValue([
      {
        id: "case-1",
        uploads: [
          {
            id: "upload-1",
            detections: [],
          },
        ],
      },
    ]);

    // Act: Process the cases.
    const result = await getCases();

    // Assert: Verify the transformation logic identifies the absence of detections correctly.
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: "case-1",
        verificationStatus: "no_detections",
        hasDetections: false,
        totalDetections: 0,
        verifiedDetections: 0,
      })
    );
  });

  /**
   * Test case to verify the unverified status when all detections are model-generated and not yet reviewed.
   */
  it("calculates 'unverified' status correctly (all model_generated)", async () => {
    // Arrange: Mock a session and a case where all detections have the `status` set to `model_generated`.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    mockFindMany.mockResolvedValue([
      {
        id: "case-2",
        uploads: [
          {
            id: "upload-1",
            detections: [{ status: "model_generated" }, { status: "model_generated" }],
          },
        ],
      },
    ]);

    // Act: Process the cases.
    const result = await getCases();

    // Assert: Verify that the status is unverified and the detection count is accurate.
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: "case-2",
        verificationStatus: "unverified",
        hasDetections: true,
        totalDetections: 2,
        verifiedDetections: 0,
      })
    );
  });

  /**
   * Test case to verify the verified status when all detections have been manually confirmed or created by a user.
   */
  it("calculates 'verified' status correctly (no model_generated)", async () => {
    // Arrange: Mock a session and a case with only confirmed or user-created detection statuses.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    mockFindMany.mockResolvedValue([
      {
        id: "case-3",
        uploads: [
          {
            id: "upload-1",
            detections: [{ status: "user_confirmed" }, { status: "user_created" }],
          },
        ],
      },
    ]);

    // Act: Process the cases.
    const result = await getCases();

    // Assert: Verify the logic confirms all detections as verified.
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: "case-3",
        verificationStatus: "verified",
        hasDetections: true,
        totalDetections: 2,
        verifiedDetections: 2,
      })
    );
  });

  /**
   * Test case to verify the in_progress status when a case has a mix of verified and unverified detections.
   */
  it("calculates 'in_progress' status correctly (mixed statuses)", async () => {
    // Arrange: Mock a session and a case with one unverified and one confirmed detection.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    mockFindMany.mockResolvedValue([
      {
        id: "case-4",
        uploads: [
          {
            id: "upload-1",
            detections: [{ status: "model_generated" }, { status: "user_confirmed" }],
          },
        ],
      },
    ]);

    // Act: Process the cases.
    const result = await getCases();

    // Assert: Verify the logic correctly flags the case as being in progress.
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: "case-4",
        verificationStatus: "in_progress",
        hasDetections: true,
        totalDetections: 2,
        verifiedDetections: 1,
      })
    );
  });
});
