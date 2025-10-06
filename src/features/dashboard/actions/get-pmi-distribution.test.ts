import { and, eq, gte, lte } from "drizzle-orm";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";
import { getPmiDistribution } from "@/features/dashboard/actions/get-pmi-distribution";
import { PMI_INTERVAL_ORDER } from "@/lib/constants";

// Mock the authentication module to simulate user session states.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept and verify case queries.
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
 * Test suite for the `getPmiDistribution` server action.
 */
describe("getPmiDistribution", () => {
  const mockUserId = "mortiscope-user-id";

  // Reset all mock functions before each test to ensure a clean state and test isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the action rejects requests when no user session is present.
   */
  it("throws an error if the user is not authenticated", async () => {
    // Arrange: Mock the `auth` function to return a null value.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Assert: Verify that calling the action results in an authentication error.
    await expect(getPmiDistribution()).rejects.toThrow("User not authenticated");
  });

  /**
   * Test case to verify that the database query uses the correct user ID and date range filters.
   */
  it("calls findMany with correct filtering conditions", async () => {
    // Arrange: Setup an authorized session and mock an empty database return.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findMany as unknown as Mock).mockResolvedValue([]);

    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-12-31");

    // Act: Invoke the distribution action with date parameters.
    await getPmiDistribution(startDate, endDate);

    // Assert: Check if `findMany` was called with the correct `where` filters and relation joins.
    expect(db.query.cases.findMany).toHaveBeenCalledWith({
      where: and(
        eq(cases.userId, mockUserId),
        eq(cases.status, "active"),
        gte(cases.caseDate, startDate),
        lte(cases.caseDate, endDate)
      ),
      with: {
        analysisResult: {
          columns: {
            pmiHours: true,
          },
        },
      },
    });
  });

  /**
   * Test case to verify that various PMI hour values are correctly sorted into their respective time buckets.
   */
  it("correctly buckets cases into PMI time intervals", async () => {
    // Arrange: Setup authorized session.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });

    // Arrange: Define a set of cases with mixed PMI hours, including nulls and negative values.
    const mockCases = [
      { analysisResult: { pmiHours: 5 } },
      { analysisResult: { pmiHours: 12 } },
      { analysisResult: { pmiHours: 23 } },
      { analysisResult: { pmiHours: 30 } },
      { analysisResult: { pmiHours: 40 } },
      { analysisResult: { pmiHours: 50 } },
      { analysisResult: { pmiHours: 65 } },
      { analysisResult: { pmiHours: 80 } },
      { analysisResult: null },
      { analysisResult: { pmiHours: -1 } },
    ];

    (db.query.cases.findMany as unknown as Mock).mockResolvedValue(mockCases);

    // Act: Calculate the distribution.
    const result = await getPmiDistribution();

    // Assert: Verify the quantity in each specific time bucket matches the input data.
    const findQuantity = (name: string) => result.find((r) => r.name === name)?.quantity;

    expect(findQuantity("less_than_12h")).toBe(1);
    expect(findQuantity("12_to_24h")).toBe(2);
    expect(findQuantity("24_to_36h")).toBe(1);
    expect(findQuantity("36_to_48h")).toBe(1);
    expect(findQuantity("48_to_60h")).toBe(1);
    expect(findQuantity("60_to_72h")).toBe(1);
    expect(findQuantity("more_than_72h")).toBe(1);
  });

  /**
   * Test case to verify that an empty case list still returns a complete set of intervals with zero quantities.
   */
  it("returns all intervals with zero quantity when no data is found", async () => {
    // Arrange: Setup session and mock empty database result.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findMany as unknown as Mock).mockResolvedValue([]);

    // Act: Invoke the distribution action.
    const result = await getPmiDistribution();

    // Assert: Verify the output matches the full interval list and all counts are zero.
    expect(result).toHaveLength(PMI_INTERVAL_ORDER.length);
    result.forEach((item) => {
      expect(PMI_INTERVAL_ORDER).toContain(item.name);
      expect(item.quantity).toBe(0);
    });
  });

  /**
   * Test case to verify that the returned array matches the specific sorting order defined in the application constants.
   */
  it("maintains the canonical order specified in constants", async () => {
    // Arrange: Setup session and mock database return.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findMany as unknown as Mock).mockResolvedValue([]);

    // Act: Invoke the distribution action.
    const result = await getPmiDistribution();
    const resultNames = result.map((r) => r.name);

    // Assert: Verify that the sequence of keys in the result matches `PMI_INTERVAL_ORDER`.
    expect(resultNames).toEqual(PMI_INTERVAL_ORDER);
  });
});
