import { revalidatePath } from "next/cache";
import { Session } from "next-auth";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

// Define hoisted mocks for database operations to ensure they are available before module imports.
const { mockDelete, mockWhere } = vi.hoisted(() => {
  const mockWhere = vi.fn();
  const mockDelete = vi.fn(() => ({
    where: mockWhere,
  }));
  return { mockDelete, mockWhere };
});

import { auth } from "@/auth";
import { db } from "@/db";
import { deleteCase } from "@/features/results/actions/delete-case";

// Mock the authentication module to control user session states.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the Next.js cache module to track path revalidation calls.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock the database instance with the hoisted deletion mocks.
vi.mock("@/db", () => ({
  db: {
    delete: mockDelete,
  },
}));

// Mock the database schema definitions for the cases table.
vi.mock("@/db/schema", () => ({
  cases: {
    id: "id",
    userId: "userId",
  },
}));

/**
 * Test suite for the `deleteCase` server action.
 */
describe("deleteCase", () => {
  // Reset all mocks and re-initialize the database mock chain before each test case.
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelete.mockReturnValue({ where: mockWhere });
  });

  /**
   * Test case to verify that an error is returned when the caseId does not meet validation criteria.
   */
  it("returns an error if input validation fails", async () => {
    // Act: Invoke the action with an invalid `caseId` format.
    const result = await deleteCase({
      caseId: "invalid-id",
    });

    // Assert: Verify that the validation error is returned and no further logic is executed.
    expect(result).toEqual({ error: "Invalid input provided." });
    expect(auth).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that an error is returned when no active session is found.
   */
  it("returns an error if the user is not authenticated", async () => {
    // Arrange: Mock the `auth` function to return a null session.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to delete a case without being logged in.
    const result = await deleteCase({
      caseId: "tz4a98xxat96iws9zmbrgj3a",
    });

    // Assert: Check that the authentication error is returned and database is not touched.
    expect(result).toEqual({
      error: "Authentication required. Please sign in.",
    });
    expect(db.delete).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that an error is returned when the database query finds no matching records for the user.
   */
  it("returns an error if the case is not found or user is unauthorized", async () => {
    // Arrange: Mock an active session and a database response indicating zero affected rows.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
      expires: "2025-01-01",
    } as Session);

    mockWhere.mockResolvedValue({ rowCount: 0 });

    // Act: Invoke the deletion for a non-existent or restricted case.
    const result = await deleteCase({
      caseId: "tz4a98xxat96iws9zmbrgj3a",
    });

    // Assert: Verify that the specific error message is returned and cache is not revalidated.
    expect(result).toEqual({
      error: "Case not found or you do not have permission to delete it.",
    });
    expect(db.delete).toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that a generic success message is returned when caseName is omitted.
   */
  it("deletes the case and returns a generic success message if caseName is not provided", async () => {
    // Arrange: Mock a successful authentication and a successful database deletion.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
      expires: "2025-01-01",
    } as Session);

    mockWhere.mockResolvedValue({ rowCount: 1 });

    // Act: Perform the deletion with only the `caseId`.
    const result = await deleteCase({
      caseId: "tz4a98xxat96iws9zmbrgj3a",
    });

    // Assert: Verify the generic success message and that the cache for `/results` was cleared.
    expect(result).toEqual({ success: "Case successfully deleted." });
    expect(db.delete).toHaveBeenCalled();
    expect(mockWhere).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/results");
  });

  /**
   * Test case to verify that a personalized success message is returned when caseName is provided.
   */
  it("deletes the case and returns a specific success message if caseName is provided", async () => {
    // Arrange: Set up the environment for a successful deletion.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
      expires: "2025-01-01",
    } as Session);

    mockWhere.mockResolvedValue({ rowCount: 1 });

    // Act: Perform the deletion while providing the `caseName` for the feedback message.
    const result = await deleteCase({
      caseId: "tz4a98xxat96iws9zmbrgj3a",
      caseName: "Mortiscope Case 1",
    });

    // Assert: Verify that the success message includes the specific `caseName`.
    expect(result).toEqual({
      success: "Mortiscope Case 1 successfully deleted.",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/results");
  });

  /**
   * Test case to verify that database exceptions are caught and handled gracefully.
   */
  it("returns a generic error message if a database error occurs", async () => {
    // Arrange: Mock authentication and force the database call to throw an error.
    (auth as unknown as Mock).mockResolvedValue({
      user: { id: "user-123" },
      expires: "2025-01-01",
    } as Session);

    mockWhere.mockRejectedValue(new Error("Database connection failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Trigger the deletion logic that will encounter a database failure.
    const result = await deleteCase({
      caseId: "tz4a98xxat96iws9zmbrgj3a",
    });

    // Assert: Check for the generic error response and ensure the system logs the error to the console.
    expect(result).toEqual({
      error: "An unexpected error occurred. Please try again.",
    });
    expect(consoleSpy).toHaveBeenCalledWith(
      "Database error while deleting case:",
      expect.any(Error)
    );

    // Clean up the console spy.
    consoleSpy.mockRestore();
  });
});
