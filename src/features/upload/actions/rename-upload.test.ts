import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { Session } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { renameUpload } from "@/features/upload/actions/rename-upload";
import { s3 } from "@/lib/aws";
import { logCritical, logError } from "@/lib/logger";

// Mock the authentication utility to control session state.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock object for the database update chain to track method calls.
const mockDbChain = {
  set: vi.fn(),
  where: vi.fn(),
};
// Chain the `set` method to return the mock chain for fluency.
mockDbChain.set.mockReturnValue(mockDbChain);
// Mock the end of the chain (`where` or `execute`) to resolve successfully.
mockDbChain.where.mockResolvedValue({});

// Mock the database client to intercept update operations.
vi.mock("@/db", () => ({
  db: {
    update: vi.fn(() => mockDbChain),
  },
}));

// Mock the S3 client for simulating cloud storage interactions.
vi.mock("@/lib/aws", () => ({
  s3: {
    send: vi.fn(),
  },
}));

// Mock the AWS SDK command classes to verify their instantiation and arguments.
vi.mock("@aws-sdk/client-s3", () => ({
  HeadObjectCommand: vi.fn(),
  CopyObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

// Mock the logging utilities to check for error and critical log calls.
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

// Helper function to generate a mock session object for a given user ID.
const createMockSession = (userId = "user"): Session => ({
  user: {
    id: userId,
    name: "Mortiscope Account",
    email: "mortiscope@example.com",
  },
  expires: new Date().toISOString(),
});

/**
 * Test suite for the `renameUpload` server action.
 */
describe("renameUpload", () => {
  // Define constant test data for use across multiple test cases.
  const userId = "user";
  const oldKey = "uploads/user/case/old-file.jpg";
  const newName = "New File Name";
  const expectedNewKey = "uploads/user/case/New-File-Name.jpg";

  // Reset all mocks and the DB chain behavior before each test to ensure test isolation.
  beforeEach(() => {
    vi.clearAllMocks();
    mockDbChain.set.mockReturnValue(mockDbChain);
    mockDbChain.where.mockResolvedValue({});
  });

  // Restore all mocks to their original state after each test.
  afterEach(() => {
    vi.resetAllMocks();
  });

  /**
   * Test case to ensure the action fails when the user is not authenticated.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Mock the authentication service to return a null session.
    mockAuth.mockResolvedValue(null);

    // Act: Call the `renameUpload` action.
    const result = await renameUpload({ oldKey, newFileName: newName });

    // Assert: Verify that the result object contains an "Unauthorized" error.
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  /**
   * Test case to ensure the action fails when essential input parameters are empty.
   */
  it("returns error if input is invalid", async () => {
    // Arrange: Mock an authenticated session.
    mockAuth.mockResolvedValue(createMockSession());

    // Act: Call the `renameUpload` action with empty strings for required inputs.
    const result = await renameUpload({ oldKey: "", newFileName: "" });

    // Assert: Verify that the action indicates failure and specifies the "Invalid input provided." error.
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid input provided.");
  });

  /**
   * Test case to ensure a user can only rename files they own by checking S3 object metadata.
   */
  it("returns Forbidden if user does not own the file", async () => {
    // Arrange: Mock an authenticated session for a specific user ID.
    mockAuth.mockResolvedValue(createMockSession(userId));

    // Arrange: Mock the S3 `HeadObjectCommand` response to return a non-matching `userid`.
    mockS3Send.mockResolvedValueOnce({
      Metadata: { userid: "other-user" },
    } as unknown as HeadObjectCommandOutput);

    // Act: Call the `renameUpload` action.
    const result = await renameUpload({ oldKey, newFileName: newName });

    // Assert: Verify that `HeadObjectCommand` was called to perform the ownership check.
    expect(HeadObjectCommand).toHaveBeenCalledWith(expect.objectContaining({ Key: oldKey }));
    // Assert: Verify that the result is a "Forbidden" error.
    expect(result).toEqual({
      success: false,
      error: "Forbidden: You do not have permission to rename this file.",
    });
    // Assert: Verify that subsequent S3 and DB operations were prevented.
    expect(CopyObjectCommand).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify idempotency: no S3 or DB operations occur if the new name is identical to the old name.
   */
  it("skips operations if new name results in same key (Idempotency)", async () => {
    // Arrange: Mock an authenticated session and successful ownership check.
    mockAuth.mockResolvedValue(createMockSession(userId));

    mockS3Send.mockResolvedValueOnce({
      Metadata: { userid: userId },
    } as unknown as HeadObjectCommandOutput);

    // Act: Call the action with a `newFileName` that results in the original S3 key structure.
    const result = await renameUpload({ oldKey, newFileName: "old-file" });

    // Assert: Verify that the action reports success and confirms the key is unchanged.
    expect(result.success).toBe(true);
    expect(result.data?.newKey).toBe(oldKey);

    // Assert: Verify that no expensive S3 or DB operations were performed.
    expect(CopyObjectCommand).not.toHaveBeenCalled();
    expect(DeleteObjectCommand).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  /**
   * Test case for the full successful rename process: S3 Copy, S3 Delete, and DB Update.
   */
  it("successfully renames file (Copy -> Delete -> DB Update)", async () => {
    // Arrange: Mock an authenticated session.
    mockAuth.mockResolvedValue(createMockSession(userId));

    // Arrange: Mock successful S3 `HeadObjectCommand` response, including metadata for transfer.
    mockS3Send.mockResolvedValueOnce({
      Metadata: { userid: userId, custom: "data" },
    } as unknown as HeadObjectCommandOutput);

    // Arrange: Mock successful S3 `CopyObjectCommand` and `DeleteObjectCommand` responses.
    mockS3Send.mockResolvedValueOnce({});

    mockS3Send.mockResolvedValueOnce({});

    // Act: Call the `renameUpload` action.
    const result = await renameUpload({ oldKey, newFileName: newName });

    // Assert: Verify that `CopyObjectCommand` was called with the correct source, new key, and metadata replacement directive.
    expect(CopyObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        CopySource: expect.stringContaining(oldKey),
        Key: expectedNewKey,
        MetadataDirective: "REPLACE",
        Metadata: { userid: userId, custom: "data" },
      })
    );

    // Assert: Verify that `DeleteObjectCommand` was called to remove the old file.
    expect(DeleteObjectCommand).toHaveBeenCalledWith(expect.objectContaining({ Key: oldKey }));

    // Assert: Verify that the database update was initiated.
    expect(db.update).toHaveBeenCalled();
    // Assert: Verify that the database record update included the new file name, key, and URL.
    expect(mockDbChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "New-File-Name.jpg",
        key: expectedNewKey,
        url: expect.stringContaining(expectedNewKey),
      })
    );

    // Assert: Verify the action returned success with the new file details.
    expect(result).toEqual({
      success: true,
      data: {
        newKey: expectedNewKey,
        newUrl: expect.stringContaining(expectedNewKey),
      },
    });
  });

  /**
   * Test case to handle a critical failure where S3 rename succeeds, but the database update fails.
   */
  it("logs critical error if S3 succeeds but DB update fails", async () => {
    // Arrange: Mock an authenticated session.
    mockAuth.mockResolvedValue(createMockSession(userId));

    // Arrange: Mock all S3 operations (`Head`, `Copy`, `Delete`) to succeed.
    mockS3Send.mockResolvedValueOnce({ Metadata: { userid: userId } });
    mockS3Send.mockResolvedValueOnce({});
    mockS3Send.mockResolvedValueOnce({});

    // Arrange: Mock the database update to fail.
    const dbError = new Error("DB Connection Lost");

    mockDbChain.where.mockRejectedValueOnce(dbError);

    // Act: Call the `renameUpload` action.
    const result = await renameUpload({ oldKey, newFileName: newName });

    // Assert: Verify that the action reports failure to the user.
    expect(result.success).toBe(false);
    expect(result.error).toContain("database error occurred");

    // Assert: Verify that a critical error was logged, indicating a state inconsistency requiring manual intervention.
    expect(logCritical).toHaveBeenCalledWith(
      expect.anything(),
      "DB update failed after S3 rename",
      dbError,
      expect.objectContaining({
        userId,
        oldKey,
        newKey: expectedNewKey,
        requiresManualIntervention: true,
      })
    );
  });

  /**
   * Test case to handle a general error occurring early in the process, such as an S3 `Copy` failure.
   */
  it("handles generic errors (e.g., S3 Copy fails)", async () => {
    // Arrange: Mock an authenticated session and successful ownership check.
    mockAuth.mockResolvedValue(createMockSession(userId));

    mockS3Send.mockResolvedValueOnce({ Metadata: { userid: userId } });

    // Arrange: Mock the S3 `CopyObjectCommand` to fail, halting the rename process.
    mockS3Send.mockRejectedValueOnce(new Error("S3 Copy Failed"));

    // Act: Call the `renameUpload` action.
    const result = await renameUpload({ oldKey, newFileName: newName });

    // Assert: Verify that a generic internal server error is returned.
    expect(result.success).toBe(false);
    expect(result.error).toContain("internal server error");
    // Assert: Verify that a general error was logged.
    expect(logError).toHaveBeenCalled();

    // Assert: Verify that subsequent S3 `Delete` and DB `Update` operations were prevented.
    expect(DeleteObjectCommand).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
    expect(DeleteObjectCommand).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
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
      await expect(import("@/features/upload/actions/rename-upload")).rejects.toThrow(
        "Environment validation failed:"
      );
    });

    it("throws error if AWS_BUCKET_REGION is missing", async () => {
      vi.stubEnv("AWS_BUCKET_NAME", "test-bucket");
      vi.stubEnv("AWS_BUCKET_REGION", "");
      await expect(import("@/features/upload/actions/rename-upload")).rejects.toThrow(
        "Environment validation failed:"
      );
    });
  });
});
