import { Session } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { saveUpload } from "@/features/upload/actions/save-upload";
import { logError } from "@/lib/logger";

// Mock the authentication utility to control user session behavior.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept insert operations.
vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
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

// Type assertion for the mocked database insert function.
const mockedDbInsert = vi.mocked(db.insert);

// Helper function to generate a mock session object for a given user ID.
const createMockSession = (userId = "user"): Session => ({
  user: {
    id: userId,
    name: "Mortiscope Account",
    email: "mortiscope@example.com",
  },
  expires: new Date().toISOString(),
});

// Define valid upload metadata used as input for successful test cases.
const validData = {
  id: "cuid-123",
  key: "uploads/user/case/image.jpg",
  name: "image.jpg",
  size: 1024,
  type: "image/jpeg",
  width: 800,
  height: 600,
  caseId: "case",
};

/**
 * Test suite for the `saveUpload` server action, which persists upload metadata to the database.
 */
describe("saveUpload", () => {
  const userId = "user";
  // Variable to hold the mock implementation of the `.values()` method in the DB insert chain.
  let valuesMock: ReturnType<typeof vi.fn>;

  // Set up mocks before each test to ensure a clean slate.
  beforeEach(() => {
    vi.clearAllMocks();

    // Arrange: Create a mock for the `.values()` method that resolves successfully by default.
    valuesMock = vi.fn().mockResolvedValue({});

    // Arrange: Mock the `db.insert` function to return the mock chain starting with `valuesMock`.
    mockedDbInsert.mockReturnValue({
      values: valuesMock,
    } as unknown as ReturnType<typeof db.insert>);
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

    // Act: Call the `saveUpload` action.
    const result = await saveUpload(validData);

    // Assert: Verify that the result object contains an "Unauthorized" error.
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  /**
   * Test case to ensure validation fails for required fields, such as `caseId`.
   */
  it("returns error if input is invalid (missing caseId)", async () => {
    // Arrange: Mock an authenticated session.
    mockAuth.mockResolvedValue(createMockSession());

    // Act: Call the `saveUpload` action with an empty `caseId`.
    const result = await saveUpload({ ...validData, caseId: "" });

    // Assert: Verify that the action reports failure due to "Invalid input provided".
    expect(result).toEqual({
      success: false,
      error: "Invalid input provided for saving upload.",
    });
    // Assert: Verify that no database insert operation was attempted.
    expect(db.insert).not.toHaveBeenCalled();
  });

  /**
   * Test case for the successful insertion of upload metadata into the database.
   */
  it("successfully saves upload metadata to database", async () => {
    // Arrange: Mock an authenticated session.
    mockAuth.mockResolvedValue(createMockSession(userId));

    // Act: Call the `saveUpload` action with valid data.
    const result = await saveUpload(validData);

    // Assert: Verify that `db.insert` was called targeting the `uploads` schema.
    expect(db.insert).toHaveBeenCalledWith(uploads);
    // Assert: Verify that the `.values()` method was called with the correct and constructed data.
    expect(valuesMock).toHaveBeenCalledWith({
      id: validData.id,
      key: validData.key,
      name: validData.name,
      url: expect.stringContaining(validData.key),
      size: validData.size,
      type: validData.type,
      width: validData.width,
      height: validData.height,
      userId: userId,
      caseId: validData.caseId,
    });

    // Assert: Verify that the action returned success along with the generated file URL.
    expect(result).toEqual({
      success: true,
      data: {
        url: expect.stringContaining(validData.key),
      },
    });
  });

  /**
   * Test case to ensure internal database errors are handled and logged without crashing the action.
   */
  it("handles database errors gracefully", async () => {
    // Arrange: Mock an authenticated session.
    mockAuth.mockResolvedValue(createMockSession(userId));

    // Arrange: Mock the database `.values()` operation to reject with an error.
    const dbError = new Error("Unique constraint violation");
    valuesMock.mockRejectedValueOnce(dbError);

    // Act: Call the `saveUpload` action.
    const result = await saveUpload(validData);

    // Assert: Verify that `logError` was called with the captured error and relevant context data.
    expect(logError).toHaveBeenCalledWith(
      expect.anything(),
      "Error saving upload metadata",
      dbError,
      expect.objectContaining({
        userId,
        uploadId: validData.id,
        key: validData.key,
        caseId: validData.caseId,
      })
    );

    expect(result).toEqual({
      success: false,
      error: "Failed to save upload details to the database.",
    });
  });

  /**
   * Test suite for verifying environment variable validation during module import.
   */
  describe("Environment Variables", () => {
    // Reset module registry before each test to ensure imports are fresh.
    beforeEach(() => {
      vi.resetModules();
    });

    // Restore environment variables to their original state after each test.
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    /**
     * Test case to verify that the module throws an error if `AWS_BUCKET_NAME` is missing.
     */
    it("throws error if AWS_BUCKET_NAME is missing", async () => {
      // Arrange: Stub the `AWS_BUCKET_NAME` environment variable to be empty.
      vi.stubEnv("AWS_BUCKET_NAME", "");

      // Act & Assert: Attempt to import the module and expect it to reject with a specific error.
      await expect(import("@/features/upload/actions/save-upload")).rejects.toThrow(
        "Environment validation failed:"
      );
    });

    /**
     * Test case to verify that the module throws an error if `AWS_BUCKET_REGION` is missing.
     */
    it("throws error if AWS_BUCKET_REGION is missing", async () => {
      // Arrange: Stub `AWS_BUCKET_NAME` to a valid value and `AWS_BUCKET_REGION` to empty.
      vi.stubEnv("AWS_BUCKET_NAME", "test-bucket");
      vi.stubEnv("AWS_BUCKET_REGION", "");

      // Act & Assert: Attempt to import the module and expect it to reject with a specific error.
      await expect(import("@/features/upload/actions/save-upload")).rejects.toThrow(
        "Environment validation failed:"
      );
    });
  });
});
