import { Session } from "next-auth";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

// Define hoisted mocks to simulate the fluent API pattern of the database query builder.
const { mockLimit, mockWhere, mockFrom, mockSelect } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  return { mockLimit, mockWhere, mockFrom, mockSelect };
});

import { auth } from "@/auth";
import { getRecalculationStatus } from "@/features/results/actions/get-recalculation-status";

// Mock the authentication module to manipulate user session states during testing.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to utilize the chained query builder mocks.
vi.mock("@/db", () => ({
  db: {
    select: mockSelect,
  },
}));

// Mock the database schema to provide valid column names for the query builder.
vi.mock("@/db/schema", () => ({
  cases: {
    id: "id",
    userId: "userId",
    recalculationNeeded: "recalculationNeeded",
  },
}));

/**
 * Test suite for the `getRecalculationStatus` server action.
 */
describe("getRecalculationStatus", () => {
  // Re-establish the mock chain and clear call history before every test case.
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
  });

  /**
   * Test case to verify that missing authentication results in a thrown error.
   */
  it("throws an error if the user is not authenticated", async () => {
    // Arrange: Mock the `auth` utility to return no session.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Assert: Verify the action rejects with the specific error message and stops execution.
    await expect(getRecalculationStatus("case-123")).rejects.toThrow("User not authenticated");
    expect(mockSelect).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that a session lacking a user ID is treated as unauthenticated.
   */
  it("throws an error if the session has no user ID", async () => {
    // Arrange: Mock a session object that contains an empty user object.
    (auth as unknown as Mock).mockResolvedValue({
      user: {},
    } as Session);

    // Assert: Verify that the absence of a `userId` triggers the authentication error.
    await expect(getRecalculationStatus("case-123")).rejects.toThrow("User not authenticated");
  });

  /**
   * Test case to verify that an error is thrown when no matching record is found for the user.
   */
  it("throws an error if the case is not found or permission is denied", async () => {
    // Arrange: Mock a valid session but return an empty result set from the database query.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    mockLimit.mockResolvedValue([]);

    // Assert: Verify that the logic treats an empty result as a "not found" or "unauthorized" state.
    await expect(getRecalculationStatus("case-123")).rejects.toThrow(
      "Case not found or permission denied."
    );

    expect(mockSelect).toHaveBeenCalled();
    expect(mockLimit).toHaveBeenCalledWith(1);
  });

  /**
   * Test case to verify that the function returns true when the database flag is set.
   */
  it("returns true when recalculation is needed", async () => {
    // Arrange: Mock a session and a database record with the `recalculationNeeded` flag enabled.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    mockLimit.mockResolvedValue([{ recalculationNeeded: true }]);

    // Act: Request the status for the specific case.
    const result = await getRecalculationStatus("case-123");

    // Assert: Verify the returned boolean is true.
    expect(result).toBe(true);
    expect(mockSelect).toHaveBeenCalled();
  });

  /**
   * Test case to verify that the function returns false when the database flag is disabled.
   */
  it("returns false when recalculation is not needed", async () => {
    // Arrange: Mock a session and a database record with the `recalculationNeeded` flag disabled.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
    } as Session);

    mockLimit.mockResolvedValue([{ recalculationNeeded: false }]);

    // Act: Request the status for the specific case.
    const result = await getRecalculationStatus("case-123");

    // Assert: Verify the returned boolean is false.
    expect(result).toBe(false);
    expect(mockSelect).toHaveBeenCalled();
  });
});
