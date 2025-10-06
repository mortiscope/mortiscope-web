import { type Session } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { getSamplingDensity } from "@/features/dashboard/actions/get-sampling-density";
import { SAMPLING_DENSITY_ORDER } from "@/lib/constants";

// Mock environment variables to ensure stable configuration values during the test execution.
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    UPSTASH_REDIS_REST_URL: "https://mock.upstash.io",
    UPSTASH_REDIS_REST_TOKEN: "mock-token",
  },
}));

// Mock the authentication module to control user session simulation.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept case queries and return controlled record sets.
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
 * Test suite for the `getSamplingDensity` server action.
 */
describe("getSamplingDensity", () => {
  const mockUserId = "user-123";

  // Reset all mock functions before each test to maintain state isolation.
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Revert timers to their original behavior after each test to prevent side effects.
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Test case to verify that the action throws an error when no authenticated user session is found.
   */
  it("throws error if user is not authenticated", async () => {
    // Arrange: Mock the `auth` function to return null.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

    // Assert: Verify that calling the action results in an authentication error.
    await expect(getSamplingDensity()).rejects.toThrow("User not authenticated");
  });

  /**
   * Test case to verify that a zeroed distribution is returned when the database returns no cases.
   */
  it("returns zero counts for all buckets if no cases found", async () => {
    // Arrange: Mock a valid session and an empty case array from the database.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    vi.mocked(db.query.cases.findMany).mockResolvedValue([] as unknown as CaseResult);

    // Act: Invoke the sampling density calculation.
    const result = await getSamplingDensity();

    // Assert: Verify the result contains all canonical density buckets with zero quantities.
    expect(result).toHaveLength(SAMPLING_DENSITY_ORDER.length);
    const expected = SAMPLING_DENSITY_ORDER.map((name) => ({ name, quantity: 0 }));
    expect(result).toEqual(expected);
  });

  /**
   * Test case to verify that cases are correctly assigned to buckets based on their specific upload counts.
   */
  it("correctly buckets cases based on upload counts", async () => {
    // Arrange: Setup authorized session.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);

    // Arrange: Helper to generate case data with specific numbers of nested upload records.
    const createCase = (uploadCount: number) => ({
      uploads: Array(uploadCount).fill({ id: "file-id" }),
    });

    // Arrange: Define a dataset covering various bucket ranges (1-4, 5-8, etc.).
    const mockData = [
      createCase(1),
      createCase(4),
      createCase(5),
      createCase(8),
      createCase(9),
      createCase(13),
      createCase(20),
    ];

    vi.mocked(db.query.cases.findMany).mockResolvedValue(mockData as unknown as CaseResult);

    // Act: Calculate the distribution.
    const result = await getSamplingDensity();

    // Assert: Verify the quantity in each specific density bucket matches the provided input data.
    const getQuantity = (key: string) => result.find((r) => r.name === key)?.quantity;

    expect(getQuantity("1_to_4")).toBe(2);
    expect(getQuantity("5_to_8")).toBe(2);
    expect(getQuantity("9_to_12")).toBe(1);
    expect(getQuantity("13_to_16")).toBe(1);
    expect(getQuantity("17_to_20")).toBe(1);
  });

  /**
   * Test case to verify that cases with no uploads are excluded from the sampling distribution.
   */
  it("ignores cases with 0 uploads", async () => {
    // Arrange: Setup authorized session and a case with an empty `uploads` array.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);

    const mockData = [{ uploads: [] }];

    vi.mocked(db.query.cases.findMany).mockResolvedValue(mockData as unknown as CaseResult);

    // Act: Calculate the distribution.
    const result = await getSamplingDensity();

    // Assert: Verify that the total quantity across all buckets remains zero.
    const total = result.reduce((acc, curr) => acc + curr.quantity, 0);
    expect(total).toBe(0);
  });

  /**
   * Test case to verify that cases exceeding the maximum tracked density (20 uploads) are excluded.
   */
  it("ignores cases with more than 20 uploads (if logically possible)", async () => {
    // Arrange: Setup session and a case containing 21 upload records.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);

    const mockData = [{ uploads: Array(21).fill({ id: "file" }) }];

    vi.mocked(db.query.cases.findMany).mockResolvedValue(mockData as unknown as CaseResult);

    // Act: Calculate the distribution.
    const result = await getSamplingDensity();

    // Assert: Verify that outliers beyond the range are not counted in the final results.
    const total = result.reduce((acc, curr) => acc + curr.quantity, 0);
    expect(total).toBe(0);
  });

  /**
   * Test case to verify that date filtering parameters are correctly passed to the database query.
   */
  it("handles date filters by calling DB", async () => {
    // Arrange: Setup session and mock empty database return.
    vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
      user: { id: mockUserId },
    } as Session);
    vi.mocked(db.query.cases.findMany).mockResolvedValue([] as unknown as CaseResult);

    const startDate = new Date("2025-01-01");
    const endDate = new Date("2025-12-31");

    // Act: Call the distribution action with a date range.
    await getSamplingDensity(startDate, endDate);

    // Assert: Verify the database `findMany` method was executed.
    expect(db.query.cases.findMany).toHaveBeenCalled();
  });
});
