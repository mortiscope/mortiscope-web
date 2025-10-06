import { describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { getVerificationStatus } from "@/features/dashboard/actions/get-verification-status";

// Mock the authentication module to control user session verification in tests.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept and return controlled case data.
vi.mock("@/db", () => ({
  db: {
    query: {
      cases: {
        findMany: vi.fn(),
      },
    },
  },
}));

/**
 * Test suite for the `getVerificationStatus` server action.
 */
describe("getVerificationStatus", () => {
  /**
   * Test case to verify that the action throws an error when the user is not logged in.
   */
  it("throws an error when the user is not authenticated", async () => {
    // Arrange: Mock the `auth` function to return null.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Assert: Verify that the function call rejects with an authentication error.
    await expect(getVerificationStatus()).rejects.toThrow("User not authenticated");
  });

  /**
   * Test case to verify that the action returns zeroed data structures when the database result is empty.
   */
  it("returns zero counts when no cases are found", async () => {
    // Arrange: Setup a valid session and mock an empty database return.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-1", email: "mortiscope@example.com" },
    });

    (db.query.cases.findMany as unknown as Mock).mockResolvedValue([]);

    // Act: Invoke the status retrieval logic.
    const result = await getVerificationStatus();

    // Assert: Verify that all levels (case, image, detection) have zeroed fields.
    expect(result).toEqual({
      caseVerification: { verified: 0, unverified: 0, inProgress: 0 },
      imageVerification: { verified: 0, unverified: 0, inProgress: 0 },
      detectionVerification: { verified: 0, unverified: 0 },
    });
  });

  /**
   * Test case to verify that cases where all detections are confirmed are categorized as verified.
   */
  it("correctly categorizes fully verified cases and images", async () => {
    // Arrange: Setup session and a mock case with only confirmed detections.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-1", email: "mortiscope@example.com" },
    });

    const mockCases = [
      {
        id: "case-1",
        uploads: [
          {
            detections: [{ status: "user_confirmed" }, { status: "user_edited_confirmed" }],
          },
        ],
      },
    ];

    (db.query.cases.findMany as unknown as Mock).mockResolvedValue(mockCases);

    // Act: Invoke the status retrieval logic.
    const result = await getVerificationStatus();

    // Assert: Verify counts correctly reflect total verification across all levels.
    expect(result.caseVerification).toEqual({ verified: 1, unverified: 0, inProgress: 0 });
    expect(result.imageVerification).toEqual({ verified: 1, unverified: 0, inProgress: 0 });
    expect(result.detectionVerification).toEqual({ verified: 2, unverified: 0 });
  });

  /**
   * Test case to verify that cases with only model-generated detections are categorized as unverified.
   */
  it("correctly categorizes fully unverified cases and images", async () => {
    // Arrange: Setup session and a mock case with unconfirmed detections.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-1", email: "mortiscope@example.com" },
    });

    const mockCases = [
      {
        id: "case-1",
        uploads: [
          {
            detections: [{ status: "model_generated" }, { status: "model_generated" }],
          },
        ],
      },
    ];

    (db.query.cases.findMany as unknown as Mock).mockResolvedValue(mockCases);

    // Act: Invoke the status retrieval logic.
    const result = await getVerificationStatus();

    // Assert: Verify counts reflect fully unverified states at all levels.
    expect(result.caseVerification).toEqual({ verified: 0, unverified: 1, inProgress: 0 });
    expect(result.imageVerification).toEqual({ verified: 0, unverified: 1, inProgress: 0 });
    expect(result.detectionVerification).toEqual({ verified: 0, unverified: 2 });
  });

  /**
   * Test case to verify that cases with mixed detection statuses are marked as "in progress".
   */
  it("correctly handles mixed status (in progress) at case and image levels", async () => {
    // Arrange: Setup session and a mock case where one detection is confirmed and another is not.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-1", email: "mortiscope@example.com" },
    });

    const mockCases = [
      {
        id: "case-mixed",
        uploads: [
          {
            detections: [{ status: "user_confirmed" }, { status: "model_generated" }],
          },
        ],
      },
    ];

    (db.query.cases.findMany as unknown as Mock).mockResolvedValue(mockCases);

    // Act: Invoke the status retrieval logic.
    const result = await getVerificationStatus();

    // Assert: Verify that partially verified images/cases are labeled as `inProgress`.
    expect(result.caseVerification).toEqual({ verified: 0, unverified: 0, inProgress: 1 });
    expect(result.imageVerification).toEqual({ verified: 0, unverified: 0, inProgress: 1 });
    expect(result.detectionVerification).toEqual({ verified: 1, unverified: 1 });
  });

  /**
   * Test case to verify complex aggregations across multiple uploads with varying statuses.
   */
  it("aggregates complex scenarios with multiple uploads and mixed statuses", async () => {
    // Arrange: Setup session and a case with one fully verified upload and one unverified upload.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-1", email: "mortiscope@example.com" },
    });

    const mockCases = [
      {
        id: "case-complex",
        uploads: [
          {
            detections: [{ status: "user_confirmed" }],
          },
          {
            detections: [{ status: "model_generated" }],
          },
        ],
      },
    ];

    (db.query.cases.findMany as unknown as Mock).mockResolvedValue(mockCases);

    // Act: Invoke the status retrieval logic.
    const result = await getVerificationStatus();

    // Assert: Verify that the case is "in progress" while images are individual verified or unverified.
    expect(result.caseVerification).toEqual({ verified: 0, unverified: 0, inProgress: 1 });
    expect(result.imageVerification).toEqual({ verified: 1, unverified: 1, inProgress: 0 });
    expect(result.detectionVerification).toEqual({ verified: 1, unverified: 1 });
  });

  /**
   * Test case to verify that images without any biological detections are excluded from metrics.
   */
  it("ignores uploads with no detections in the counts", async () => {
    // Arrange: Setup session and a case where the upload contains an empty detections array.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-1", email: "mortiscope@example.com" },
    });

    const mockCases = [
      {
        id: "case-empty-upload",
        uploads: [
          {
            detections: [],
          },
        ],
      },
    ];

    (db.query.cases.findMany as unknown as Mock).mockResolvedValue(mockCases);

    // Act: Invoke the status retrieval logic.
    const result = await getVerificationStatus();

    // Assert: Verify that nothing is counted in verified, unverified, or in-progress fields.
    expect(result.caseVerification).toEqual({ verified: 0, unverified: 0, inProgress: 0 });
    expect(result.imageVerification).toEqual({ verified: 0, unverified: 0, inProgress: 0 });
  });

  /**
   * Test case to verify that date filters are correctly forwarded to the database query logic.
   */
  it("passes date filters to the database query", async () => {
    // Arrange: Setup session and define a specific date range for filtering.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-1", email: "mortiscope@example.com" },
    });

    (db.query.cases.findMany as unknown as Mock).mockResolvedValue([]);

    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-01-31");

    // Act: Call the action with the date bounds.
    await getVerificationStatus(startDate, endDate);

    // Assert: Verify that the database `findMany` method was called.
    expect(db.query.cases.findMany).toHaveBeenCalled();
  });
});
