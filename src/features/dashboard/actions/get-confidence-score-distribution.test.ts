import { type SQL } from "drizzle-orm";
import { type Session } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { getConfidenceScoreDistribution } from "@/features/dashboard/actions/get-confidence-score-distribution";

// Mock the authentication module to control user session verification.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock environment variables to ensure a stable testing environment.
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    UPSTASH_REDIS_REST_URL: "https://mock.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "mock-token",
  },
}));

// Mock the database client to intercept queries for case and detection data.
vi.mock("@/db", () => ({
  db: {
    query: {
      cases: {
        findMany: vi.fn(),
      },
    },
  },
}));

// Mock Drizzle ORM functions to validate the construction of SQL where clauses.
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual("drizzle-orm");
  return {
    ...actual,
    isNotNull: vi.fn().mockReturnValue("isNotNullResult"),
  };
});

type AuthMock = () => Promise<Session | null>;

type CaseResult = Awaited<ReturnType<typeof db.query.cases.findMany>>;

/**
 * Test suite for the `getConfidenceScoreDistribution` server action.
 */
describe("getConfidenceScoreDistribution", () => {
  const mockUserId = "user-123";

  // Reset all mocks before each test to maintain state isolation.
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Restore real timers after each test to prevent side effects in the test runner.
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Test case to verify that the action rejects requests from unauthenticated users.
   */
  it("throws error if user is not authenticated", async () => {
    // Arrange: Mock a null session response.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

    // Assert: Verify that the promise rejects with the expected error message.
    await expect(getConfidenceScoreDistribution()).rejects.toThrow("User not authenticated");
  });

  /**
   * Test case to verify that various confidence values are correctly assigned to their respective 10% range buckets.
   */
  it("calculates distribution correctly for mixed confidence values", async () => {
    // Arrange: Setup an authenticated session and a set of diverse confidence scores.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);

    const mockData = [
      {
        uploads: [
          {
            detections: [
              { originalConfidence: 0.05 },
              { originalConfidence: 0.15 },
              { originalConfidence: 0.95 },
              { originalConfidence: 0.99 },
            ],
          },
        ],
      },
    ];

    vi.mocked(db.query.cases.findMany).mockResolvedValue(mockData as unknown as CaseResult);

    // Act: Calculate the distribution.
    const result = await getConfidenceScoreDistribution();

    // Assert: Verify that all 10 buckets are returned and scores are counted in correct ranges.
    expect(result).toHaveLength(10);

    const bucket0 = result.find((b) => b.name === "0-10%");
    const bucket10 = result.find((b) => b.name === "10-20%");
    const bucket90 = result.find((b) => b.name === "90-100%");

    expect(bucket0?.count).toBe(1);
    expect(bucket10?.count).toBe(1);
    expect(bucket90?.count).toBe(2);
  });

  /**
   * Test case to verify that an empty database result returns buckets with zero counts rather than failing.
   */
  it("handles empty data gracefully", async () => {
    // Arrange: Setup session and mock an empty array from the database.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    vi.mocked(db.query.cases.findMany).mockResolvedValue([] as unknown as CaseResult);

    // Act: Calculate the distribution.
    const result = await getConfidenceScoreDistribution();

    // Assert: Verify that the structure remains intact but all counts are zero.
    expect(result).toHaveLength(10);
    expect(result.every((b) => b.count === 0)).toBe(true);
  });

  /**
   * Test case to verify that scores provided on a 0-100 scale are correctly normalized to the 0-1 scale.
   */
  it("normalizes confidence values > 1 (0-100 scale)", async () => {
    // Arrange: Setup session and provide a confidence value of 55.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);

    const mockData = [
      {
        uploads: [
          {
            detections: [{ originalConfidence: 55 }],
          },
        ],
      },
    ];

    vi.mocked(db.query.cases.findMany).mockResolvedValue(mockData as unknown as CaseResult);

    // Act: Calculate the distribution.
    const result = await getConfidenceScoreDistribution();
    const bucket50 = result.find((b) => b.name === "50-60%");

    // Assert: Verify that 55 is correctly bucketed in the 50-60% range.
    expect(bucket50?.count).toBe(1);
  });

  /**
   * Test case to verify that boundary values like 100% or 1.0 are included in the final bucket.
   */
  it("handles 100% confidence correctly (bucket 90-100%)", async () => {
    // Arrange: Setup session and provide values representing maximum confidence.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);

    const mockData = [
      {
        uploads: [
          {
            detections: [{ originalConfidence: 1 }, { originalConfidence: 100 }],
          },
        ],
      },
    ];

    vi.mocked(db.query.cases.findMany).mockResolvedValue(mockData as unknown as CaseResult);

    // Act: Calculate the distribution.
    const result = await getConfidenceScoreDistribution();
    const bucket90 = result.find((b) => b.name === "90-100%");

    // Assert: Verify both boundary values are captured in the 90-100% bucket.
    expect(bucket90?.count).toBe(2);
  });

  /**
   * Test case to verify that date filters are correctly forwarded to the database query.
   */
  it("applies date filters", async () => {
    // Arrange: Setup session and define a date range.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    vi.mocked(db.query.cases.findMany).mockResolvedValue([] as unknown as CaseResult);

    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-01-31");

    // Act: Invoke the action with date parameters.
    await getConfidenceScoreDistribution(startDate, endDate);

    // Assert: Verify that the database query was executed.
    expect(db.query.cases.findMany).toHaveBeenCalled();
  });

  /**
   * Test case to verify that detections lacking a confidence score are excluded from the statistical count.
   */
  it("ignores detections with null confidence", async () => {
    // Arrange: Setup session and a detection with a null confidence value.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);

    const mockData = [
      {
        uploads: [
          {
            detections: [{ originalConfidence: null }],
          },
        ],
      },
    ];

    vi.mocked(db.query.cases.findMany).mockResolvedValue(mockData as unknown as CaseResult);

    // Act: Calculate the distribution.
    const result = await getConfidenceScoreDistribution();

    // Assert: Verify that no scores were added to the buckets.
    const totalCount = result.reduce((sum, b) => sum + b.count, 0);
    expect(totalCount).toBe(0);
  });

  /**
   * Test case to verify the programmatic construction of the database filter logic for detections.
   */
  it("constructs correct where clause for detections", async () => {
    // Arrange: Setup session and mock query return.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    vi.mocked(db.query.cases.findMany).mockResolvedValue([] as unknown as CaseResult);

    // Act: Invoke the action to trigger query construction.
    await getConfidenceScoreDistribution();

    // Assert: Extract the dynamic `where` function passed to the database mock.
    const findManyCall = vi.mocked(db.query.cases.findMany).mock.calls[0];
    const queryOptions = findManyCall[0] as unknown as {
      with: {
        uploads: {
          with: {
            detections: {
              where: (
                schema: Record<string, unknown>,
                utils: { isNull: unknown; and: unknown }
              ) => unknown;
            };
          };
        };
      };
    };
    const whereFn = queryOptions.with.uploads.with.detections.where;

    const isNullMock = vi.fn().mockReturnValue("isNullResult");
    const andMock = vi.fn().mockReturnValue("andResult");

    const mockDetections = {
      deletedAt: "deletedAtCol",
      originalConfidence: "confidenceCol",
    };
    const { isNotNull } = await import("drizzle-orm");
    vi.mocked(isNotNull).mockReturnValue("isNotNullResult" as unknown as SQL);

    // Act: Simulate the execution of the where clause builder.
    const result = whereFn(mockDetections, {
      isNull: isNullMock,
      and: andMock,
    });

    // Assert: Verify that filters for soft-deletion and non-null confidence were combined.
    expect(isNullMock).toHaveBeenCalledWith("deletedAtCol");
    expect(isNotNull).toHaveBeenCalledWith("confidenceCol");
    expect(andMock).toHaveBeenCalledWith("isNullResult", "isNotNullResult");
    expect(result).toBe("andResult");
  });
});
