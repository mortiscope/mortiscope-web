import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

// Hoist the mock function to ensure it is initialized before module execution.
const { mockFindFirst } = vi.hoisted(() => {
  return { mockFindFirst: vi.fn() };
});

// Mock the authentication module to control session behavior.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept query operations.
vi.mock("@/db", () => ({
  db: {
    query: {
      cases: {
        findFirst: mockFindFirst,
      },
    },
  },
}));

// Mock Drizzle ORM helper functions while preserving other exports.
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual("drizzle-orm");
  return {
    ...actual,
    and: vi.fn(() => "mock-where"),
    eq: vi.fn(),
    desc: vi.fn(() => "mock-desc"),
  };
});

import { desc } from "drizzle-orm";

import { auth } from "@/auth";
import { getDraftCase } from "@/features/analyze/actions/get-draft-case";

type MockSession = {
  user: {
    id: string;
  };
};

// Groups related tests for the get draft case server action.
describe("getDraftCase", () => {
  const mockSession: MockSession = { user: { id: "user-123" } };
  const mockCase = {
    id: "case-1",
    status: "draft",
    userId: "user-123",
    createdAt: new Date(),
  };

  const mockAuth = auth as unknown as Mock<() => Promise<MockSession | null>>;

  // Reset all mocks before each test to ensure test isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Restore original implementations after each test to prevent side effects.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Test case to verify that the action returns null if the user is not authenticated.
   */
  it("returns null if user is not authenticated", async () => {
    // Arrange: Mock auth to return null (no session).
    mockAuth.mockResolvedValue(null);

    // Act: Call the server action.
    const result = await getDraftCase();

    // Assert: Check that the result is null.
    expect(result).toBeNull();
    // Assert: Ensure the database query was not executed.
    expect(mockFindFirst).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the action returns the draft case object when found.
   */
  it("returns the draft case if found", async () => {
    // Arrange: Mock a valid session and a found case record.
    mockAuth.mockResolvedValue(mockSession);
    mockFindFirst.mockResolvedValue(mockCase);

    // Act: Call the server action.
    const result = await getDraftCase();

    // Assert: Verify that the database query was executed.
    expect(mockFindFirst).toHaveBeenCalled();
    // Assert: Check that the result matches the mock case.
    expect(result).toEqual(mockCase);
  });

  /**
   * Test case to verify that the action returns null if no draft case exists in the database.
   */
  it("returns null if no draft case is found", async () => {
    // Arrange: Mock a valid session and an undefined database response.
    mockAuth.mockResolvedValue(mockSession);
    mockFindFirst.mockResolvedValue(undefined);

    // Act: Call the server action.
    const result = await getDraftCase();

    // Assert: Verify that the database query was executed.
    expect(mockFindFirst).toHaveBeenCalled();
    // Assert: Check that the result is null.
    expect(result).toBeNull();
  });

  /**
   * Test case to verify that database errors are logged and handled gracefully by returning null.
   */
  it("returns null and logs error if database query fails", async () => {
    // Arrange: Spy on console error and mock a database rejection.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockAuth.mockResolvedValue(mockSession);
    mockFindFirst.mockRejectedValue(new Error("DB Error"));

    // Act: Call the server action.
    const result = await getDraftCase();

    // Assert: Verify that the error was logged to the console.
    expect(consoleSpy).toHaveBeenCalledWith("Error fetching draft case:", expect.any(Error));
    // Assert: Check that the result is null despite the error.
    expect(result).toBeNull();
  });

  /**
   * Test case to verify that the database query is configured with the correct sorting order.
   */
  it("correctly configures database query (orderBy coverage)", async () => {
    // Arrange: Mock a valid session and a found case record.
    mockAuth.mockResolvedValue(mockSession);
    mockFindFirst.mockResolvedValue(mockCase);

    // Act: Call the server action to trigger the query.
    await getDraftCase();

    // Assert: Verify that findFirst was called with the correct query options including orderBy.
    expect(mockFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.anything(),
        orderBy: ["mock-desc"],
      })
    );
    // Assert: Verify desc was called
    expect(desc).toHaveBeenCalled();
  });
});
