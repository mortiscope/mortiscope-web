import { Session } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { updateUpload } from "@/features/upload/actions/update-upload";
import { logError } from "@/lib/logger";

// Mock the authentication utility to control user session behavior.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept query and update operations.
vi.mock("@/db", () => ({
  db: {
    query: {
      uploads: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
  },
}));

// Mock the database schema for the `uploads` table reference.
vi.mock("@/db/schema", () => ({
  uploads: {
    _config: { name: "uploads" },
  },
}));

// Mock the logging utilities to check for error logging calls.
vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
  uploadLogger: {},
}));

// Type assertion for the mocked authentication function.
const mockAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

// Type assertion for the mocked database `findFirst` query function.
const mockFindFirst = vi.mocked(
  db.query.uploads.findFirst as unknown as (
    args?: unknown
  ) => Promise<{ userId: string } | undefined>
);

// Type assertion for the mocked database update function.
const mockedDbUpdate = vi.mocked(db.update);

// Helper function to generate a mock session object for a given user ID.
const createMockSession = (userId = "user"): Session => ({
  user: {
    id: userId,
    name: "Mortiscope Account",
    email: "mortiscope@example.com",
  },
  expires: new Date().toISOString(),
});

// Define a valid CUID for use as an upload ID in test cases.
const validId = "tz4a98xxat96iws9zmbrgj3a";

/**
 * Test suite for the `updateUpload` server action, which updates metadata for an existing upload.
 */
describe("updateUpload", () => {
  const userId = "user";

  // Variables to hold the mock implementations for the DB update chain.
  let mockSet: ReturnType<typeof vi.fn>;
  let mockWhere: ReturnType<typeof vi.fn>;

  // Set up mocks for the DB update chain before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    // Arrange: Mock the chain-ending execution method to resolve successfully by default.
    mockWhere = vi.fn().mockResolvedValue({});
    // Arrange: Mock the `.set()` method to return the mock chain containing `where`.
    mockSet = vi.fn().mockReturnValue({ where: mockWhere });

    // Arrange: Mock the `db.update` function to start the mock chain with `set`.
    mockedDbUpdate.mockReturnValue({
      set: mockSet,
    } as unknown as ReturnType<typeof db.update>);
  });

  // Restore all mocks after each test.
  afterEach(() => {
    vi.resetAllMocks();
  });

  /**
   * Test case to ensure the action fails when the user is not authenticated.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Mock the authentication function to return a null session.
    mockAuth.mockResolvedValue(null);

    // Act: Call the `updateUpload` action.
    const result = await updateUpload({ id: validId, name: "new-name" });

    // Assert: Verify that the result object contains an "Unauthorized" error.
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  /**
   * Test case to ensure input validation fails for an improperly formatted upload ID.
   */
  it("returns error if input is invalid (invalid CUID)", async () => {
    // Arrange: Mock an authenticated session.
    mockAuth.mockResolvedValue(createMockSession());

    // Act: Call the `updateUpload` action with an invalid ID.
    const result = await updateUpload({ id: "invalid-id", name: "new-name" });

    // Assert: Verify that the action reports failure and specifies the input error.
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid input provided for updating upload.");
  });

  /**
   * Test case to ensure the action fails if no data fields are provided for the update operation.
   */
  it("returns error if no update data is provided", async () => {
    // Arrange: Mock an authenticated session.
    mockAuth.mockResolvedValue(createMockSession());

    // Act: Call the `updateUpload` action with only the `id`.
    const result = await updateUpload({ id: validId });

    // Assert: Verify that the result object contains the "No update data provided." error.
    expect(result).toEqual({ success: false, error: "No update data provided." });
    // Assert: Verify that the database update function was not called.
    expect(db.update).not.toHaveBeenCalled();
  });

  /**
   * Test case to ensure the action handles scenarios where the upload ID does not exist in the database.
   */
  it("returns error if upload is not found", async () => {
    // Arrange: Mock an authenticated session.
    mockAuth.mockResolvedValue(createMockSession(userId));

    // Arrange: Mock the `findFirst` query to return `undefined`.
    mockFindFirst.mockResolvedValue(undefined);

    // Act: Call the `updateUpload` action.
    const result = await updateUpload({ id: validId, name: "new-name" });

    // Assert: Verify that the result object contains the "Upload not found." error.
    expect(result).toEqual({ success: false, error: "Upload not found." });
    // Assert: Verify that the database update function was not called.
    expect(db.update).not.toHaveBeenCalled();
  });

  /**
   * Test case to ensure a user can only update uploads they own.
   */
  it("returns Forbidden if user does not own the upload", async () => {
    // Arrange: Mock an authenticated session with one user ID.
    mockAuth.mockResolvedValue(createMockSession(userId));
    // Arrange: Mock the `findFirst` query to return an upload owned by a different user.
    mockFindFirst.mockResolvedValue({ userId: "other-user" });

    // Act: Call the `updateUpload` action.
    const result = await updateUpload({ id: validId, name: "new-name" });

    // Assert: Verify that the result object contains the "Forbidden" ownership error.
    expect(result).toEqual({ success: false, error: "Forbidden: You do not own this upload." });
    // Assert: Verify that the database update function was not called.
    expect(db.update).not.toHaveBeenCalled();
  });

  /**
   * Test case for the successful update of upload metadata when the user is the owner.
   */
  it("successfully updates upload when user is owner", async () => {
    // Arrange: Mock an authenticated session and successful ownership check.
    mockAuth.mockResolvedValue(createMockSession(userId));
    mockFindFirst.mockResolvedValue({ userId: userId });

    // Arrange: Define the data to be updated.
    const updateData = {
      id: validId,
      name: "updated-name.jpg",
      size: 5000,
    };

    // Act: Call the `updateUpload` action.
    const result = await updateUpload(updateData);

    // Assert: Verify that the ownership check was performed via `mockFindFirst`.
    expect(mockFindFirst).toHaveBeenCalled();

    // Assert: Verify that the database update was initiated on the `uploads` table.
    expect(db.update).toHaveBeenCalledWith(uploads);
    // Assert: Verify that the `.set()` method was called with the correct update fields.
    expect(mockSet).toHaveBeenCalledWith({
      name: "updated-name.jpg",
      size: 5000,
    });
    // Assert: Verify that the `.where()` method was called to target the specific upload ID.
    expect(mockWhere).toHaveBeenCalled();

    // Assert: Verify that the action reported successful completion.
    expect(result).toEqual({ success: true });
  });

  /**
   * Test case to ensure internal database errors during the update process are handled and logged.
   */
  it("handles database errors gracefully", async () => {
    // Arrange: Mock an authenticated session and successful ownership check.
    mockAuth.mockResolvedValue(createMockSession(userId));
    mockFindFirst.mockResolvedValue({ userId: userId });

    // Arrange: Mock the database execution (`mockWhere`) to reject with an error.
    const dbError = new Error("DB Error");
    mockWhere.mockRejectedValueOnce(dbError);

    // Act: Call the `updateUpload` action.
    const result = await updateUpload({ id: validId, name: "fail" });

    // Assert: Verify that `logError` was called with the captured error and necessary context.
    expect(logError).toHaveBeenCalledWith(
      expect.anything(),
      "Error updating upload metadata",
      dbError,
      expect.objectContaining({
        userId,
        uploadId: validId,
        updateData: { name: "fail" },
      })
    );

    // Assert: Verify that the action reports failure with a user-friendly error message.
    expect(result).toEqual({
      success: false,
      error: "Failed to update upload details in the database.",
    });
  });
});
