import { beforeEach, describe, expect, it, vi } from "vitest";

// Define hoisted mocks for the database query layer to ensure they are available during module initialization.
const { mockFindFirst } = vi.hoisted(() => {
  return { mockFindFirst: vi.fn() };
});

import { getCaseName } from "@/features/results/actions/get-case-name";

// Mock the database client to intercept calls to the cases table.
vi.mock("@/db", () => ({
  db: {
    query: {
      cases: {
        findFirst: mockFindFirst,
      },
    },
  },
}));

// Mock the database schema constants for consistent property referencing.
vi.mock("@/db/schema", () => ({
  cases: {
    id: "id",
  },
}));

/**
 * Test suite for the `getCaseName` server action.
 */
describe("getCaseName", () => {
  // Clear mock call history and states before each test to ensure isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the correct case name is returned when a matching record is found.
   */
  it("returns the case name if the case exists", async () => {
    // Arrange: Set up the mock to return an object containing the `caseName`.
    mockFindFirst.mockResolvedValue({ caseName: "Mortiscope Case 1" });

    // Act: Invoke the function with a target `case-123` ID.
    const result = await getCaseName("case-123");

    // Assert: Check that the returned string matches the mock and the database was queried.
    expect(result).toBe("Mortiscope Case 1");
    expect(mockFindFirst).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the function returns null when the database search yields no results.
   */
  it("returns null if the case does not exist", async () => {
    // Arrange: Set up the mock to return undefined, simulating a missing record.
    mockFindFirst.mockResolvedValue(undefined);

    // Act: Invoke the function to fetch the name of a non-existent case.
    const result = await getCaseName("case-123");

    // Assert: Verify that the result is explicitly null.
    expect(result).toBeNull();
    expect(mockFindFirst).toHaveBeenCalled();
  });

  /**
   * Test case to verify that database exceptions are caught and errors are logged correctly.
   */
  it("returns null and logs error if database query fails", async () => {
    // Arrange: Mock a database rejection and spy on the console to verify error logging.
    const error = new Error("Database connection error");
    mockFindFirst.mockRejectedValue(error);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Invoke the function which will encounter the rejected promise.
    const result = await getCaseName("case-123");

    // Assert: Verify the function handles the error by returning null and logging the failure details.
    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch case name:", error);

    // Restore the original console behavior.
    consoleSpy.mockRestore();
  });
});
