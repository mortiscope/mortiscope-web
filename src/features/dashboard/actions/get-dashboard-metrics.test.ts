import { and, eq, gte, lte } from "drizzle-orm";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { getDashboardMetrics } from "@/features/dashboard/actions/get-dashboard-metrics";

// Mock the authentication module to control user session verification during tests.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept case queries and return controlled mock data.
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
 * Test suite for the `getDashboardMetrics` server action.
 */
describe("getDashboardMetrics", () => {
  const mockUserId = "user-1";

  // Reset all mock functions before each test to ensure test isolation and prevent state leakage.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the action rejects requests from unauthenticated users.
   */
  it("throws an error if the user is not authenticated", async () => {
    // Arrange: Mock the `auth` function to return null, simulating an expired or missing session.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Assert: Verify that the function throws the specific authentication error.
    await expect(getDashboardMetrics()).rejects.toThrow("User not authenticated");
  });

  /**
   * Test case to verify that the database query includes correct user identification and date range filters.
   */
  it("fetches metrics with correct date filters", async () => {
    // Arrange: Setup a valid user session and mock an empty database response.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findMany as unknown as Mock).mockResolvedValue([]);

    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-01-31");

    // Act: Invoke the metrics action with a specific date range.
    await getDashboardMetrics(startDate, endDate);

    // Assert: Check if `findMany` was called with the correct `where` clause filters for `userId`, `status`, and dates.
    expect(db.query.cases.findMany).toHaveBeenCalledWith({
      where: and(
        eq(cases.userId, mockUserId),
        eq(cases.status, "active"),
        gte(cases.caseDate, startDate),
        lte(cases.caseDate, endDate)
      ),
      with: expect.any(Object),
    });
  });

  /**
   * Test case to verify the mathematical accuracy of derived metrics from a complex set of case data.
   */
  it("calculates complex metrics correctly from case data", async () => {
    // Arrange: Setup an authorized session.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });

    // Arrange: Define a set of cases with varying verification statuses, detections, and PMI values.
    const mockCases = [
      {
        id: "case-1",
        uploads: [
          {
            detections: [
              {
                status: "user_confirmed",
                confidence: 0.9,
                label: "instar_1",
                originalLabel: "instar_1",
              },
              {
                status: "user_edited_confirmed",
                confidence: 0.8,
                label: "instar_2",
                originalLabel: "instar_1",
              },
            ],
          },
        ],
        analysisResult: { pmiHours: 10 },
      },
      {
        id: "case-2",
        uploads: [
          {
            detections: [
              { status: "model_generated", confidence: 0.7, label: "pupa", originalLabel: "pupa" },
            ],
          },
        ],
        analysisResult: { pmiHours: 20 },
      },
      {
        id: "case-3",
        uploads: [],
        analysisResult: null,
      },
    ];

    (db.query.cases.findMany as unknown as Mock).mockResolvedValue(mockCases);

    // Act: Calculate the metrics.
    const metrics = await getDashboardMetrics();

    // Assert: Verify each calculated metric field against expected values based on the mock data.
    expect(metrics.totalCases).toBe(2);
    expect(metrics.verified).toBe(1);
    expect(metrics.totalImages).toBe(2);
    expect(metrics.verifiedImages).toBe(1);
    expect(metrics.totalDetectionsCount).toBe(3);
    expect(metrics.verifiedDetectionsCount).toBe(2);
    expect(metrics.averagePMI).toBe(15);
    expect(metrics.averageConfidence).toBeCloseTo(0.775);
    expect(metrics.correctionRate).toBeCloseTo(33.33);
  });

  /**
   * Test case to verify that zeroed metrics are returned when no database records match the criteria.
   */
  it("returns zeroed metrics when no cases are found", async () => {
    // Arrange: Setup session and mock an empty result from the database.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findMany as unknown as Mock).mockResolvedValue([]);

    // Act: Calculate the metrics.
    const metrics = await getDashboardMetrics();

    // Assert: Verify that all returned metric values are initialized to zero.
    expect(metrics).toEqual({
      verified: 0,
      totalCases: 0,
      totalImages: 0,
      verifiedImages: 0,
      totalDetectionsCount: 0,
      verifiedDetectionsCount: 0,
      averagePMI: 0,
      averageConfidence: 0,
      correctionRate: 0,
    });
  });

  /**
   * Test case to verify that the logic handles null confidence, missing uploads, or null PMI without failing.
   */
  it("handles edge cases with empty uploads, missing PMI, and null confidence", async () => {
    // Arrange: Setup authorized session.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });

    // Arrange: Define edge cases including empty detections and null values.
    const edgeCases = [
      {
        id: "case-edge-1",
        uploads: [{ detections: [] }],
        analysisResult: { pmiHours: 10 },
      },
      {
        id: "case-edge-2",
        uploads: [
          {
            detections: [
              {
                status: "model_generated",
                confidence: 0.9,
                label: "pupa",
                originalLabel: "pupa",
              },
            ],
          },
        ],
        analysisResult: { pmiHours: null },
      },
      {
        id: "case-edge-3",
        uploads: [
          {
            detections: [
              {
                status: "model_generated",
                confidence: null,
                label: "pupa",
                originalLabel: "pupa",
              },
            ],
          },
        ],
        analysisResult: { pmiHours: 10 },
      },
    ];

    (db.query.cases.findMany as unknown as Mock).mockResolvedValue(edgeCases);

    // Act: Calculate metrics for edge cases.
    const metrics = await getDashboardMetrics();

    // Assert: Verify that averages ignore null values and calculate correctly using available data points.
    expect(metrics.averagePMI).toBe(10);
    expect(metrics.averageConfidence).toBeCloseTo(0.9);
  });
});
