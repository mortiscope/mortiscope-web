import { type Session } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { getLifeStageDistribution } from "@/features/dashboard/actions/get-life-stage-distribution";
import { DETECTION_CLASS_ORDER } from "@/lib/constants";

// Mock the authentication module to simulate user session states.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock environment variables to ensure consistent configuration across test environments.
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    UPSTASH_REDIS_REST_URL: "https://mock.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "mock-token",
  },
}));

// Mock the database client to intercept case and detection queries.
vi.mock("@/db", () => ({
  db: {
    query: {
      cases: {
        findMany: vi.fn(),
      },
    },
  },
}));

type AuthMock = () => Promise<Session | null>;

type CaseResult = Awaited<ReturnType<typeof db.query.cases.findMany>>;

/**
 * Test suite for the `getLifeStageDistribution` server action.
 */
describe("getLifeStageDistribution", () => {
  const mockUserId = "user-123";

  // Reset all mock functions before each test to maintain state isolation.
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Revert timers to their original behavior after each test case.
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Test case to verify that the action throws an error when no authenticated session is detected.
   */
  it("throws error if user is not authenticated", async () => {
    // Arrange: Set the authentication mock to return null.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

    // Assert: Verify that the function call rejects with an authentication error.
    await expect(getLifeStageDistribution()).rejects.toThrow("User not authenticated");
  });

  /**
   * Test case to verify that the action returns a zero-filled distribution when no cases exist.
   */
  it("returns zero counts for all stages if no cases found", async () => {
    // Arrange: Mock a valid session and an empty database result.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    vi.mocked(db.query.cases.findMany).mockResolvedValue([] as unknown as CaseResult);

    // Act: Invoke the distribution calculator.
    const result = await getLifeStageDistribution();

    // Assert: Verify the result contains all canonical stages with a quantity of zero.
    expect(result).toHaveLength(DETECTION_CLASS_ORDER.length);

    const expected = DETECTION_CLASS_ORDER.map((name) => ({ name, quantity: 0 }));
    expect(result).toEqual(expected);
  });

  /**
   * Test case to verify that detection labels are correctly counted and sorted based on the predefined class order.
   */
  it("correctly aggregates counts matching the canonical order", async () => {
    // Arrange: Setup authorized session.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);

    // Arrange: Mock data with specific labels to test accumulation logic.
    const mockData = [
      {
        uploads: [
          {
            detections: [{ label: "instar_1" }, { label: "instar_1" }, { label: "adult" }],
          },
        ],
      },
      {
        uploads: [
          {
            detections: [{ label: "pupa" }, { label: "instar_1" }],
          },
        ],
      },
    ];

    vi.mocked(db.query.cases.findMany).mockResolvedValue(mockData as unknown as CaseResult);

    // Act: Calculate the life stage distribution.
    const result = await getLifeStageDistribution();

    // Assert: Verify the counts for each biological stage match the input data.
    expect(result).toEqual([
      { name: "instar_1", quantity: 3 },
      { name: "instar_2", quantity: 0 },
      { name: "instar_3", quantity: 0 },
      { name: "pupa", quantity: 1 },
      { name: "adult", quantity: 1 },
    ]);
  });

  /**
   * Test case to verify that labels not defined in `DETECTION_CLASS_ORDER` are omitted from the output.
   */
  it("ignores labels not present in the canonical order", async () => {
    // Arrange: Setup session and data containing an invalid label.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);

    const mockData = [
      {
        uploads: [
          {
            detections: [{ label: "instar_1" }, { label: "unexpected_stage" }],
          },
        ],
      },
    ];

    vi.mocked(db.query.cases.findMany).mockResolvedValue(mockData as unknown as CaseResult);

    // Act: Fetch the distribution.
    const result = await getLifeStageDistribution();

    // Assert: Verify that the valid label is counted and the invalid label is discarded.
    expect(result).toHaveLength(DETECTION_CLASS_ORDER.length);

    const instar1 = result.find((r) => r.name === "instar_1");
    expect(instar1?.quantity).toBe(1);

    const unexpected = result.find((r) => r.name === "unexpected_stage");
    expect(unexpected).toBeUndefined();
  });

  /**
   * Test case to verify that date filter parameters are correctly passed to the database layer.
   */
  it("handles date filters by calling database", async () => {
    // Arrange: Setup session and mock empty database return.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    vi.mocked(db.query.cases.findMany).mockResolvedValue([] as unknown as CaseResult);

    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-12-31");

    // Act: Call the action with a specific date range.
    await getLifeStageDistribution(startDate, endDate);

    // Assert: Confirm the database query was executed.
    expect(db.query.cases.findMany).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the query correctly filters out detections that have been soft-deleted.
   */
  it("constructs correct where clause for filtering deleted detections", async () => {
    // Arrange: Setup session and mock empty database return.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    vi.mocked(db.query.cases.findMany).mockResolvedValue([] as unknown as CaseResult);

    // Act: Invoke the action to trigger the internal query building.
    await getLifeStageDistribution();

    // Assert: Extract the `where` closure from the database mock to validate the SQL logic.
    const findManyCall = vi.mocked(db.query.cases.findMany).mock.calls[0];
    const queryOptions = findManyCall[0] as unknown as {
      with: {
        uploads: {
          with: {
            detections: {
              where: (schema: Record<string, unknown>, utils: { isNull: unknown }) => unknown;
            };
          };
        };
      };
    };
    const whereFn = queryOptions.with.uploads.with.detections.where;

    const isNullMock = vi.fn().mockReturnValue("isNullResult");
    const mockDetections = { deletedAt: "deletedAtCol" };

    // Act: Execute the where function builder with a mock utility.
    const result = whereFn(mockDetections, { isNull: isNullMock });

    // Assert: Verify that the logic specifically checks for null in the `deletedAt` column.
    expect(isNullMock).toHaveBeenCalledWith("deletedAtCol");
    expect(result).toBe("isNullResult");
  });
});
