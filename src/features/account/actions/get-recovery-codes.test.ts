import { type sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { twoFactorRecoveryCodes } from "@/db/schema";
import { getRecoveryCodes } from "@/features/account/actions/get-recovery-codes";

// Mock the authentication module to handle session state.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client specifically for the two-factor recovery codes table.
vi.mock("@/db", () => ({
  db: {
    query: {
      twoFactorRecoveryCodes: {
        findMany: vi.fn(),
      },
    },
  },
}));

/**
 * Test suite for the `getRecoveryCodes` server action.
 */
describe("getRecoveryCodes", () => {
  const mockUserId = "user-123";

  // Reset all mocks and define a default authenticated session before each test case.
  beforeEach(() => {
    vi.clearAllMocks();

    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: mockUserId },
    });
  });

  /**
   * Test case to verify that unauthenticated requests return an unauthorized error.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Mock the authentication function to return null.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to retrieve recovery codes.
    const result = await getRecoveryCodes();

    // Assert: Check for the expected unauthorized error object.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify the response structure and values when a user has no codes in the database.
   */
  it("returns correct status when user has no recovery codes", async () => {
    // Arrange: Mock the database query to return an empty array.
    vi.mocked(db.query.twoFactorRecoveryCodes.findMany).mockResolvedValue([]);

    // Act: Invoke the retrieval action.
    const result = await getRecoveryCodes();

    // Assert: Verify counts are zero and the `codeStatus` array is correctly initialized to false.
    const expectedCodeStatus = new Array(16).fill(false);

    expect(result).toEqual({
      success: "Recovery codes status retrieved successfully.",
      data: {
        totalCodes: 0,
        usedCount: 0,
        unusedCount: 0,
        codeStatus: expectedCodeStatus,
        hasRecoveryCodes: false,
      },
    });
  });

  /**
   * Test case to verify correct categorization of used versus unused recovery codes.
   */
  it("returns correct status when user has mixed used and unused codes", async () => {
    // Arrange: Provide a mock set of codes with varying `used` states.
    const mockCodes = [
      { id: "1", code: "code1", used: true, createdAt: new Date() },
      { id: "2", code: "code2", used: false, createdAt: new Date() },
      { id: "3", code: "code3", used: false, createdAt: new Date() },
    ];

    vi.mocked(db.query.twoFactorRecoveryCodes.findMany).mockResolvedValue(
      mockCodes as unknown as (typeof twoFactorRecoveryCodes.$inferSelect)[]
    );

    // Act: Invoke the retrieval action.
    const result = await getRecoveryCodes();

    // Assert: Verify that indices in `codeStatus` are set to true based on existence, not just `used` state.
    const expectedCodeStatus = new Array(16).fill(false);
    expectedCodeStatus[0] = true;
    expectedCodeStatus[1] = true;

    expect(result).toEqual({
      success: "Recovery codes status retrieved successfully.",
      data: {
        totalCodes: 3,
        usedCount: 1,
        unusedCount: 2,
        codeStatus: expectedCodeStatus,
        hasRecoveryCodes: true,
      },
    });
  });

  /**
   * Test case to verify that the UI-bound status array does not exceed the fixed limit of 16.
   */
  it("caps the codeStatus array at 16 true values if user somehow has more than 16 unused codes", async () => {
    // Arrange: Generate a mock array of 20 unused codes.
    const mockCodes = Array.from({ length: 20 }, (_, i) => ({
      id: `${i}`,
      code: `code${i}`,
      used: false,
      createdAt: new Date(),
    }));

    vi.mocked(db.query.twoFactorRecoveryCodes.findMany).mockResolvedValue(
      mockCodes as unknown as (typeof twoFactorRecoveryCodes.$inferSelect)[]
    );

    // Act: Invoke the retrieval action.
    const result = await getRecoveryCodes();

    // Assert: Ensure the actual counts are correct but the boolean status array is capped.
    const expectedCodeStatus = new Array(16).fill(true);

    if (!("data" in result) || !result.data) {
      throw new Error("Result should have data");
    }
    const data = result.data;

    expect(data.codeStatus).toEqual(expectedCodeStatus);
    expect(data.unusedCount).toBe(20);
    expect(data.totalCodes).toBe(20);
  });

  /**
   * Test case to verify that the database query applies the correct chronological sorting.
   */
  it("verifies orderBy clause is correct", async () => {
    // Arrange: Mock the findMany function to capture arguments.
    vi.mocked(db.query.twoFactorRecoveryCodes.findMany).mockResolvedValue([]);

    // Act: Call the function to trigger the database query.
    await getRecoveryCodes();

    // Assert: Extract the sorting function and verify it sorts by `createdAt` in ascending order.
    const findManyCalls = vi.mocked(db.query.twoFactorRecoveryCodes.findMany).mock.calls;
    expect(findManyCalls).toHaveLength(1);

    const queryArgs = findManyCalls[0][0];
    const orderByFn = queryArgs?.orderBy;

    if (typeof orderByFn !== "function") {
      throw new Error("orderBy should be a function");
    }

    const mockAsc = vi.fn().mockReturnValue("asc-result");
    const mockCodesTable = { createdAt: "createdAt-column" };

    const result = orderByFn(mockCodesTable as unknown as typeof twoFactorRecoveryCodes, {
      asc: mockAsc,
      desc: vi.fn(),
      sql: vi.fn() as unknown as typeof sql,
    });

    expect(mockAsc).toHaveBeenCalledWith("createdAt-column");
    expect(result).toEqual(["asc-result"]);
  });

  /**
   * Test case to verify that database connection failures are caught and logged.
   */
  it("handles unexpected database errors gracefully", async () => {
    // Arrange: Spy on the console and force the database query to reject.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.query.twoFactorRecoveryCodes.findMany).mockRejectedValue(
      new Error("DB Connection Error")
    );

    // Act: Invoke the action while the database is down.
    const result = await getRecoveryCodes();

    // Assert: Check that the error was logged and a friendly error message was returned.
    expect(consoleSpy).toHaveBeenCalledWith("GET_RECOVERY_CODES_ACTION_ERROR:", expect.any(Error));
    expect(result).toEqual({
      error: "Failed to retrieve recovery codes status.",
    });

    // Cleanup: Restore the console spy.
    consoleSpy.mockRestore();
  });
});
