import { and, eq, gte, lte } from "drizzle-orm";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { getModelPerformanceMetrics } from "@/features/dashboard/actions/get-model-performance-metrics";
import { DETECTION_CLASS_ORDER } from "@/lib/constants";

// Mock the authentication module to control session states in a test environment.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept queries and return structured mock data.
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
 * Test suite for the `getModelPerformanceMetrics` server action.
 */
describe("getModelPerformanceMetrics", () => {
  const mockUserId = "user-1";

  // Reset all mock definitions before each test to maintain state isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the action prevents data access for unauthenticated users.
   */
  it("throws an error if the user is not authenticated", async () => {
    // Arrange: Mock the `auth` function to return a null session.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Assert: Verify that the function throws an authentication specific error.
    await expect(getModelPerformanceMetrics()).rejects.toThrow("User not authenticated");
  });

  /**
   * Test case to verify that the database query correctly filters by user identity and the provided date range.
   */
  it("fetches performance metrics with correct filters", async () => {
    // Arrange: Setup authorized session and an empty database result.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findMany as unknown as Mock).mockResolvedValue([]);

    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-12-31");

    // Act: Invoke the performance metrics action with date bounds.
    await getModelPerformanceMetrics(startDate, endDate);

    // Assert: Check if `findMany` was called with the correct `where` clauses for `userId`, `status`, and dates.
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
   * Test case to verify that raw confidence scores are correctly averaged and converted to percentages per life stage.
   */
  it("calculates average confidence scores correctly per life stage", async () => {
    // Arrange: Setup session and mock database results containing multiple detections across stages.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });

    const mockCases = [
      {
        uploads: [
          {
            detections: [
              { originalLabel: "instar_1", originalConfidence: 0.8 },
              { originalLabel: "instar_1", originalConfidence: 0.9 },
              { originalLabel: "pupa", originalConfidence: 0.75 },
            ],
          },
        ],
      },
      {
        uploads: [
          {
            detections: [
              { originalLabel: "pupa", originalConfidence: 0.85 },
              { originalLabel: "adult", originalConfidence: 0.95 },
            ],
          },
        ],
      },
    ];

    (db.query.cases.findMany as unknown as Mock).mockResolvedValue(mockCases);

    // Act: Calculate metrics.
    const result = await getModelPerformanceMetrics();

    // Assert: Verify that "instar_1" average (0.85) is returned as 85.
    const instar1 = result.find((r) => r.name === "instar_1");
    expect(instar1?.confidence).toBe(85);

    // Assert: Verify that "pupa" average (0.80) is returned as 80.
    const pupa = result.find((r) => r.name === "pupa");
    expect(pupa?.confidence).toBe(80);

    // Assert: Verify that "adult" average (0.95) is returned as 95.
    const adult = result.find((r) => r.name === "adult");
    expect(adult?.confidence).toBe(95);
  });

  /**
   * Test case to verify that the result contains all required life stages even when no data is present.
   */
  it("returns 0 confidence for stages with no data", async () => {
    // Arrange: Setup session and empty database return.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findMany as unknown as Mock).mockResolvedValue([]);

    // Act: Calculate metrics.
    const result = await getModelPerformanceMetrics();

    // Assert: Verify the output matches the length of `DETECTION_CLASS_ORDER` and all scores are 0.
    expect(result).toHaveLength(DETECTION_CLASS_ORDER.length);
    result.forEach((stage) => {
      expect(stage.confidence).toBe(0);
    });
  });

  /**
   * Test case to verify that detections with null confidence scores do not skew the calculated average.
   */
  it("filters out null confidence values from calculations", async () => {
    // Arrange: Setup session and a stage with mixed valid and null confidence scores.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });

    const mockCases = [
      {
        uploads: [
          {
            detections: [
              { originalLabel: "instar_2", originalConfidence: 0.6 },
              { originalLabel: "instar_2", originalConfidence: null },
            ],
          },
        ],
      },
    ];

    (db.query.cases.findMany as unknown as Mock).mockResolvedValue(mockCases);

    // Act: Calculate metrics.
    const result = await getModelPerformanceMetrics();
    const instar2 = result.find((r) => r.name === "instar_2");

    // Assert: Verify the average is 60 (ignoring the null value) rather than 30 or 0.
    expect(instar2?.confidence).toBe(60);
  });

  /**
   * Test case to verify the programmatic construction of the detection filtering logic for soft-deleted and null records.
   */
  it("applies correct filters for deletedAt and originalConfidence", async () => {
    // Arrange: Setup authorized session.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findMany as unknown as Mock).mockResolvedValue([]);

    // Act: Invoke the action to trigger the internal query builder.
    await getModelPerformanceMetrics();

    // Assert: Extract the dynamic `where` function passed to the nested database query.
    const findManyCalls = (db.query.cases.findMany as unknown as Mock).mock.calls;
    expect(findManyCalls).toHaveLength(1);
    const options = findManyCalls[0][0];

    const detectionsWhere = options.with.uploads.with.detections.where;
    expect(detectionsWhere).toBeDefined();

    const mockIsNotNull = vi.fn().mockReturnValue("isNotNullResult");
    const mockIsNull = vi.fn().mockReturnValue("isNullResult");
    const mockAnd = vi.fn().mockReturnValue("andResult");

    const detectionsTable = {
      deletedAt: "deletedAtColumn",
      originalConfidence: "originalConfidenceColumn",
    };

    // Act: Simulate the execution of the Drizzle where-clause builder.
    const result = detectionsWhere(detectionsTable, {
      isNotNull: mockIsNotNull,
      isNull: mockIsNull,
      and: mockAnd,
    });

    // Assert: Verify that the builder checks for null `deletedAt` and non-null `originalConfidence`.
    expect(mockIsNull).toHaveBeenCalledWith("deletedAtColumn");
    expect(mockIsNotNull).toHaveBeenCalledWith("originalConfidenceColumn");
    expect(mockAnd).toHaveBeenCalledWith("isNullResult", "isNotNullResult");
    expect(result).toBe("andResult");
  });
});
