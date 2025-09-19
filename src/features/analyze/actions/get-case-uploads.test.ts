import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

// Hoist the mock function to ensure it is initialized before module execution.
const { mockFindMany } = vi.hoisted(() => {
  return { mockFindMany: vi.fn() };
});

// Mock the authentication module to control session behavior.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept query operations.
vi.mock("@/db", () => ({
  db: {
    query: {
      uploads: {
        findMany: mockFindMany,
      },
    },
  },
}));

// Mock Drizzle ORM helper functions while preserving other exports.
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual("drizzle-orm");
  return {
    ...actual,
    and: vi.fn(),
    eq: vi.fn(),
    desc: vi.fn(),
  };
});

import { auth } from "@/auth";
import { getCaseUploads } from "@/features/analyze/actions/get-case-uploads";

type MockSession = {
  user: {
    id: string;
  };
};

// Groups related tests for the get case uploads server action.
describe("getCaseUploads", () => {
  const mockSession: MockSession = { user: { id: "user-123" } };
  const mockCaseId = "case-abc-123";
  const mockUploads = [
    { id: "1", name: "image-1.jpg", createdAt: new Date() },
    { id: "2", name: "image-2.jpg", createdAt: new Date() },
  ];

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
   * Test case to verify that the action returns an error if the user is not authenticated.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Mock auth to return null (no session).
    mockAuth.mockResolvedValue(null);

    // Act: Call the server action with a valid case ID.
    const result = await getCaseUploads(mockCaseId);

    // Assert: Check that the result contains the unauthorized error message.
    expect(result).toEqual({
      success: false,
      error: "Failed to fetch uploads: Unauthorized: User not authenticated.",
    });
    // Assert: Ensure the database query was not executed.
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that uploads data is returned successfully when the user is authenticated.
   */
  it("returns uploads data successfully when authenticated", async () => {
    // Arrange: Mock a valid session and a populated database response.
    mockAuth.mockResolvedValue(mockSession);
    mockFindMany.mockResolvedValue(mockUploads);

    // Act: Call the server action with a valid case ID.
    const result = await getCaseUploads(mockCaseId);

    // Assert: Verify that the database query was executed.
    expect(mockFindMany).toHaveBeenCalled();
    // Assert: Check that the returned data matches the mock uploads.
    expect(result).toEqual({
      success: true,
      data: mockUploads,
    });
  });

  /**
   * Test case to verify that an empty array is returned if no uploads are found.
   */
  it("returns empty array if no uploads found", async () => {
    // Arrange: Mock a valid session and an empty database response.
    mockAuth.mockResolvedValue(mockSession);
    mockFindMany.mockResolvedValue([]);

    // Act: Call the server action with a valid case ID.
    const result = await getCaseUploads(mockCaseId);

    // Assert: Verify that the result indicates success with empty data.
    expect(result).toEqual({
      success: true,
      data: [],
    });
  });

  /**
   * Test case to verify that database errors are handled gracefully.
   */
  it("handles database errors gracefully", async () => {
    // Arrange: Spy on console error and mock a database connection failure.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockAuth.mockResolvedValue(mockSession);
    mockFindMany.mockRejectedValue(new Error("Database connection error"));

    // Act: Call the server action with a valid case ID.
    const result = await getCaseUploads(mockCaseId);

    // Assert: Verify that the error was logged to the console.
    expect(consoleSpy).toHaveBeenCalledWith("Error fetching case uploads:", expect.any(Error));
    // Assert: Check that the result contains the specific database error message.
    expect(result).toEqual({
      success: false,
      error: "Failed to fetch uploads: Database connection error",
    });
  });

  /**
   * Test case to verify that unknown errors are handled gracefully.
   */
  it("handles unknown errors gracefully", async () => {
    // Arrange: Spy on console error and mock a rejection with a non-Error object.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockAuth.mockResolvedValue(mockSession);
    mockFindMany.mockRejectedValue("Unknown error string");

    // Act: Call the server action with a valid case ID.
    const result = await getCaseUploads(mockCaseId);

    // Assert: Verify that the error was logged to the console.
    expect(consoleSpy).toHaveBeenCalled();
    // Assert: Check that the result contains a generic unknown error message.
    expect(result).toEqual({
      success: false,
      error: "Failed to fetch uploads: An unknown error occurred.",
    });
  });
});
