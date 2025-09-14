import {
  DeleteObjectCommand,
  DeleteObjectCommandOutput,
  HeadObjectCommand,
  HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { Session } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { deleteUpload } from "@/features/upload/actions/delete-upload";
import { s3 } from "@/lib/aws";
import { logCritical, logError } from "@/lib/logger";

// Mock the authentication utility to control user session behavior.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock object for the Prisma DB delete operation, used to track calls.
const mockDbDelete = {
  where: vi.fn().mockResolvedValue({}),
};

// Mock the database client to control database interaction in tests.
vi.mock("@/db", () => ({
  db: {
    delete: vi.fn(() => mockDbDelete),
  },
}));

// Mock the AWS S3 client to simulate S3 API calls.
vi.mock("@/lib/aws", () => ({
  s3: {
    send: vi.fn(),
  },
}));

// Mock the S3 command classes to verify their instantiation arguments.
vi.mock("@aws-sdk/client-s3", () => ({
  HeadObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

// Mock the logging utilities to check if errors and critical issues are logged.
vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
  logCritical: vi.fn(),
  uploadLogger: {
    warn: vi.fn(),
  },
  s3Logger: {
    info: vi.fn(),
  },
}));

// Type assertion for the mocked authentication function.
const mockAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

// Type assertion for the mocked S3 send method.
const mockS3Send = vi.mocked(s3.send as unknown as (args: unknown) => Promise<unknown>);

// Helper function to create a mock session object for authenticated tests.
const createMockSession = (userId = "user-1"): Session => ({
  user: {
    id: userId,
    name: "Mortiscope Account",
    email: "mortiscope@example.com",
  },
  expires: new Date().toISOString(),
});

/**
 * Test suite for the `deleteUpload` server action.
 */
describe("deleteUpload", () => {
  // Define a valid S3 key for consistent use across tests.
  const validKey = "uploads/user-1/file.jpg";

  // Resets all mock call history before each test case for isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Restores all mocks to their original implementation after each test case.
  afterEach(() => {
    vi.resetAllMocks();
  });

  /**
   * Test case to ensure the action fails when no authenticated user session is found.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Mock the authentication function to return null, indicating no user.
    mockAuth.mockResolvedValue(null);

    // Act: Execute the `deleteUpload` action.
    const result = await deleteUpload({ key: validKey });

    // Assert: Verify that the result indicates an "Unauthorized" error.
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  /**
   * Test case to ensure the action validates the input and fails with an empty key.
   */
  it("returns error if input is invalid (empty key)", async () => {
    // Arrange: Mock an authenticated session and provide an empty string for the key.
    mockAuth.mockResolvedValue(createMockSession());

    // Act: Execute the `deleteUpload` action with an empty key.
    const result = await deleteUpload({ key: "" });

    // Assert: Verify that the result indicates an "Invalid input provided." error.
    expect(result).toEqual({ success: false, error: "Invalid input provided." });
  });

  /**
   * Test case to ensure a user cannot delete an object owned by a different user based on S3 metadata.
   */
  it("returns Forbidden if S3 object metadata owner does not match current user", async () => {
    // Arrange: Set up a session for `user-1` but mock S3 metadata to show ownership by `different-user-id`.
    const userId = "user-1";
    mockAuth.mockResolvedValue(createMockSession(userId));

    // Arrange: Mock the S3 `HeadObjectCommand` response to return a non-matching `userid` in metadata.
    mockS3Send.mockResolvedValueOnce({
      Metadata: { userid: "different-user-id" },
      $metadata: {},
    } as unknown as HeadObjectCommandOutput);

    // Act: Execute the `deleteUpload` action.
    const result = await deleteUpload({ key: validKey });

    // Assert: Verify that the `HeadObjectCommand` was called to fetch metadata.
    expect(HeadObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: expect.any(String),
        Key: validKey,
      })
    );
    // Assert: Verify that a "Forbidden" error is returned.
    expect(result).toEqual({
      success: false,
      error: "Forbidden: You do not have permission to delete this file.",
    });
    // Assert: Verify that the database deletion was not attempted.
    expect(db.delete).not.toHaveBeenCalled();
  });

  /**
   * Test case for the successful deletion of both the database record and the S3 object.
   */
  it("successfully deletes from DB and S3 when user is owner", async () => {
    // Arrange: Set up a session for `user-1`.
    const userId = "user-1";
    mockAuth.mockResolvedValue(createMockSession(userId));

    // Arrange: Mock successful S3 `HeadObjectCommand` response with a matching `userid`.
    mockS3Send.mockResolvedValueOnce({
      Metadata: { userid: userId },
      $metadata: {},
    } as unknown as HeadObjectCommandOutput);

    // Arrange: Mock successful S3 `DeleteObjectCommand` response.
    mockS3Send.mockResolvedValueOnce({
      $metadata: {},
    } as unknown as DeleteObjectCommandOutput);

    // Act: Execute the `deleteUpload` action.
    const result = await deleteUpload({ key: validKey });

    // Assert: Verify that the action succeeded.
    expect(result).toEqual({ success: true });

    // Assert: Verify that the database deletion was called.
    expect(db.delete).toHaveBeenCalled();

    // Assert: Verify that the S3 `DeleteObjectCommand` was called with the correct parameters.
    expect(DeleteObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: expect.any(String),
        Key: validKey,
      })
    );
  });

  /**
   * Test case to handle a scenario where the DB record is deleted but S3 deletion fails, leading to an orphaned object.
   */
  it("handles 'Orphaned Object' scenario: DB delete success, S3 delete fails", async () => {
    // Arrange: Set up a session for `user-1`.
    const userId = "user-1";
    mockAuth.mockResolvedValue(createMockSession(userId));

    // Arrange: Mock successful S3 `HeadObjectCommand` response with a matching `userid`.
    mockS3Send.mockResolvedValueOnce({
      Metadata: { userid: userId },
      $metadata: {},
    } as unknown as HeadObjectCommandOutput);

    // Arrange: Mock a failure for the S3 `DeleteObjectCommand`.
    const s3Error = new Error("AWS Access Denied");
    mockS3Send.mockRejectedValueOnce(s3Error);

    // Act: Execute the `deleteUpload` action. The action should succeed from the user's perspective, but log a critical error.
    const result = await deleteUpload({ key: validKey });

    // Assert: Verify that the action reported success to the caller since the critical database record was deleted.
    expect(result).toEqual({ success: true });

    // Assert: Verify that the database deletion was called.
    expect(db.delete).toHaveBeenCalled();
    // Assert: Verify that a critical error was logged to flag the orphaned S3 object for manual cleanup.
    expect(logCritical).toHaveBeenCalledWith(
      expect.anything(),
      "Orphaned S3 Object. DB record deleted but S3 deletion failed",
      s3Error,
      expect.objectContaining({
        key: validKey,
        userId,
        requiresManualCleanup: true,
      })
    );
  });

  /**
   * Test case for general error handling, such as a failure during the initial S3 `HeadObject` call.
   */
  it("handles general errors (e.g. S3 HeadObject failure)", async () => {
    // Arrange: Mock an authenticated session.
    mockAuth.mockResolvedValue(createMockSession());

    // Arrange: Mock the S3 `HeadObjectCommand` to fail immediately.
    mockS3Send.mockRejectedValueOnce(new Error("S3 Error"));

    // Act: Execute the `deleteUpload` action.
    const result = await deleteUpload({ key: validKey });

    // Assert: Verify that a generic server error is returned.
    expect(result).toEqual({
      success: false,
      error: "An internal server error occurred while deleting the file.",
    });
    // Assert: Verify that a general error was logged.
    expect(logError).toHaveBeenCalled();
    // Assert: Verify that the database deletion was not attempted as S3 checks failed first.
    expect(db.delete).not.toHaveBeenCalled();
    expect(db.delete).not.toHaveBeenCalled();
  });

  describe("Environment Variables", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("throws error if AWS_BUCKET_NAME is missing", async () => {
      vi.stubEnv("AWS_BUCKET_NAME", "");
      await expect(import("@/features/upload/actions/delete-upload")).rejects.toThrow(
        "Missing required AWS environment variable: AWS_BUCKET_NAME"
      );
    });
  });
});
