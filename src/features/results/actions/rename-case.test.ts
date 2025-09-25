import { revalidatePath } from "next/cache";
import { Session } from "next-auth";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

/**
 * Hoist mock functions to allow reference inside vi.mock factory.
 */
const { mockFindFirst, mockWhere, mockSet, mockUpdate } = vi.hoisted(() => {
  const mockFindFirst = vi.fn();
  const mockWhere = vi.fn();
  const mockSet = vi.fn(() => ({ where: mockWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));
  return { mockFindFirst, mockWhere, mockSet, mockUpdate };
});

import { auth } from "@/auth";
import { db } from "@/db";
import { renameCase } from "@/features/results/actions/rename-case";
import { logError } from "@/lib/logger";

// Mock the authentication module to control user session behavior.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock Next.js cache revalidation to verify if paths are purged after updates.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock the database client with the hoisted query builder functions.
vi.mock("@/db", () => ({
  db: {
    query: {
      cases: {
        findFirst: mockFindFirst,
      },
    },
    update: mockUpdate,
  },
}));

// Mock database schema constants for consistent column references.
vi.mock("@/db/schema", () => ({
  cases: {
    id: "id",
    userId: "userId",
    caseName: "caseName",
  },
}));

// Mock logger utilities to verify error reporting.
vi.mock("@/lib/logger", () => ({
  caseLogger: { info: vi.fn(), error: vi.fn() },
  logError: vi.fn(),
}));

/**
 * Test suite for the `renameCase` server action.
 */
describe("renameCase", () => {
  // Arrange: Define standard mock session data for authenticated states.
  const mockSession = {
    user: { id: "user-123" },
    expires: "2025-01-01",
  } as Session;

  // Arrange: Define valid input parameters used across multiple tests.
  const validProps = {
    caseId: "tz4a98xxat96iws9zmbrgj3a",
    newName: "New Case Name",
  };

  // Reset all mock call history before each test to ensure isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that unauthenticated users receive an appropriate error message.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Mock the `auth` function to return null.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to rename the case.
    const result = await renameCase(validProps);

    // Assert: Verify the unauthorized error is returned and no database update occurs.
    expect(result).toEqual({
      error: "You must be logged in to rename a case.",
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify validation failure when an empty name is provided.
   */
  it("returns error if input validation fails (empty name)", async () => {
    // Arrange: Mock a valid session.
    (auth as unknown as Mock).mockResolvedValue(mockSession);

    // Act: Invoke action with an empty `newName` string.
    const result = await renameCase({
      caseId: "tz4a98xxat96iws9zmbrgj3a",
      newName: "",
    });

    // Assert: Check for validation error and ensure no database interaction.
    expect(result).toEqual({
      error: "Invalid input. Please check the details and try again.",
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify validation failure when an invalid ID format is provided.
   */
  it("returns error if input validation fails (invalid cuid)", async () => {
    // Arrange: Mock a valid session.
    (auth as unknown as Mock).mockResolvedValue(mockSession);

    // Act: Invoke action with an incorrectly formatted `caseId`.
    const result = await renameCase({
      caseId: "invalid-id",
      newName: "Valid Name",
    });

    // Assert: Check for validation error.
    expect(result).toEqual({
      error: "Invalid input. Please check the details and try again.",
    });
    expect(db.update).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the action fails if the case is missing or owned by another user.
   */
  it("returns error if case does not exist or user lacks permission", async () => {
    // Arrange: Mock valid session but return null for the database ownership check.
    (auth as unknown as Mock).mockResolvedValue(mockSession);
    mockFindFirst.mockResolvedValue(null);

    // Act: Invoke the rename action.
    const result = await renameCase(validProps);

    // Assert: Check that specific permission error is returned.
    expect(result).toEqual({
      error: "Case not found or you don't have permission to rename it.",
    });
    expect(mockFindFirst).toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify successful renaming flow including database updates and cache revalidation.
   */
  it("successfully renames the case and revalidates path", async () => {
    // Arrange: Mock valid session and successful ownership check.
    (auth as unknown as Mock).mockResolvedValue(mockSession);
    mockFindFirst.mockResolvedValue({ id: validProps.caseId });

    // Act: Execute successful rename operation.
    const result = await renameCase(validProps);

    // Assert: Verify success response, database parameters, and cache revalidation for the `/results` path.
    expect(result).toEqual({ success: "Case renamed successfully." });
    expect(db.update).toHaveBeenCalled();
    expect(mockSet).toHaveBeenCalledWith({ caseName: validProps.newName });
    expect(mockWhere).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/results");
  });

  /**
   * Test case to verify error handling for database unique constraint violations.
   */
  it("returns specific error message for unique constraint violation", async () => {
    // Arrange: Mock session and trigger a unique constraint error code from the database.
    (auth as unknown as Mock).mockResolvedValue(mockSession);
    mockFindFirst.mockResolvedValue({ id: validProps.caseId });

    const duplicateError = new Error("Unique constraint failed");
    (duplicateError as unknown as { code: string }).code = "23505";

    mockWhere.mockRejectedValue(duplicateError);

    // Act: Attempt to rename using a duplicate name.
    const result = await renameCase(validProps);

    // Assert: Verify that a user-friendly duplicate error is returned.
    expect(result).toEqual({
      error: "A case with this name already exists. Please choose a different name.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify generic error handling and logging for unexpected failures.
   */
  it("logs error and returns generic message for unexpected errors", async () => {
    // Arrange: Mock session and a generic database failure.
    (auth as unknown as Mock).mockResolvedValue(mockSession);
    mockFindFirst.mockResolvedValue({ id: validProps.caseId });

    const unexpectedError = new Error("Database went down");
    mockWhere.mockRejectedValue(unexpectedError);

    // Act: Execute the action.
    const result = await renameCase(validProps);

    // Assert: Verify generic feedback and that the `logError` utility was called with the context.
    expect(result).toEqual({
      error: "An unexpected error occurred. Please try again.",
    });
    expect(logError).toHaveBeenCalledWith(
      expect.anything(),
      "Error renaming case",
      unexpectedError,
      expect.objectContaining({
        userId: "user-123",
        caseId: validProps.caseId,
        newName: validProps.newName,
      })
    );
  });
});
