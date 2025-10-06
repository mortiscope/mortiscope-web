import { describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { getUserCorrectionRatio } from "@/features/dashboard/actions/get-user-correction-ratio";

// Mock the authentication module to control session responses.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept case and detection data queries.
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
 * Test suite for the `getUserCorrectionRatio` server action.
 */
describe("getUserCorrectionRatio", () => {
  /**
   * Test case to verify that the action throws an error when no authenticated session is present.
   */
  it("throws an error when the user is not authenticated", async () => {
    // Arrange: Mock the `auth` function to return null.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Assert: Verify that the function call results in an authentication error.
    await expect(getUserCorrectionRatio()).rejects.toThrow("User not authenticated");
  });

  /**
   * Test case to verify that the action returns zeroed quantities when the database contains no matching records.
   */
  it("returns zero counts when no cases are found", async () => {
    // Arrange: Mock a valid user session.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-1", email: "mortiscope@example.com" },
    });

    // Arrange: Mock the database to return an empty array for cases.
    (db.query.cases.findMany as unknown as Mock).mockResolvedValue([]);

    // Act: Invoke the ratio calculation.
    const result = await getUserCorrectionRatio();

    // Assert: Verify that both `verified_prediction` and `corrected_prediction` return a quantity of 0.
    expect(result).toEqual([
      { name: "verified_prediction", quantity: 0 },
      { name: "corrected_prediction", quantity: 0 },
    ]);
  });

  /**
   * Test case to verify the correct summation of confirmed and edited predictions across multiple cases and uploads.
   */
  it("correctly aggregates verified and corrected predictions from multiple cases", async () => {
    // Arrange: Setup an authorized session.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-1", email: "mortiscope@example.com" },
    });

    // Arrange: Define mock cases with nested detections containing mixed statuses.
    const mockCases = [
      {
        uploads: [
          {
            detections: [
              { status: "user_confirmed" },
              { status: "user_edited_confirmed" },
              { status: "model_generated" },
            ],
          },
          {
            detections: [{ status: "user_confirmed" }],
          },
        ],
      },
      {
        uploads: [
          {
            detections: [{ status: "user_edited_confirmed" }, { status: "user_edited_confirmed" }],
          },
        ],
      },
    ];

    (db.query.cases.findMany as unknown as Mock).mockResolvedValue(mockCases);

    // Act: Invoke the aggregation logic.
    const result = await getUserCorrectionRatio();

    // Assert: Verify that the `quantity` fields reflect the correct count of each specific status.
    expect(result).toEqual([
      { name: "verified_prediction", quantity: 2 },
      { name: "corrected_prediction", quantity: 3 },
    ]);
  });

  /**
   * Test case to verify that date filtering parameters are accepted and passed to the database query logic.
   */
  it("handles date filters without errors", async () => {
    // Arrange: Setup authorized session.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-1", email: "mortiscope@example.com" },
    });

    // Arrange: Mock empty database return.
    (db.query.cases.findMany as unknown as Mock).mockResolvedValue([]);

    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-12-31");

    // Act: Call the action with a defined date range.
    await getUserCorrectionRatio(startDate, endDate);

    // Assert: Verify that the database query was triggered.
    expect(db.query.cases.findMany).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the calculation logic strictly includes only finalized confirmation statuses and ignores intermediate or raw states.
   */
  it("ignores detections with statuses other than confirmed or edited", async () => {
    // Arrange: Setup authorized session.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-1", email: "mortiscope@example.com" },
    });

    // Arrange: Mock data with statuses that should be excluded from final ratio counts.
    const mockCases = [
      {
        uploads: [
          {
            detections: [
              { status: "model_generated" },
              { status: "user_created" },
              { status: "user_edited" },
            ],
          },
        ],
      },
    ];

    (db.query.cases.findMany as unknown as Mock).mockResolvedValue(mockCases);

    // Act: Invoke the ratio calculation.
    const result = await getUserCorrectionRatio();

    // Assert: Verify that none of the non-finalized statuses were counted in the results.
    expect(result).toEqual([
      { name: "verified_prediction", quantity: 0 },
      { name: "corrected_prediction", quantity: 0 },
    ]);
  });
});
