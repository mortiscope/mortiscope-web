"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { renameUpload } from "@/features/upload/actions/rename-upload";

// Mock the authentication module to control user session states.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the S3 client commands to simulate cloud storage interactions.
vi.mock("@aws-sdk/client-s3", () => ({
  HeadObjectCommand: vi.fn(),
  CopyObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

// Mock the AWS library to intercept and verify S3 service requests.
vi.mock("@/lib/aws", () => ({
  s3: {
    send: vi.fn(),
  },
}));

// Mock the logging utility to verify error tracking and informational logging.
vi.mock("@/lib/logger", () => ({
  uploadLogger: {
    warn: vi.fn(),
    info: vi.fn(),
  },
  logError: vi.fn(),
  logCritical: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `renameUpload` server action.
 */
describe("renameUpload (integration)", () => {
  const validInput = {
    oldKey: "uploads/user-123/case-456/old-image.jpg",
    newFileName: "new-image-name",
  };

  /**
   * Resets the database and mocks before each test case to ensure environment isolation.
   */
  beforeEach(async () => {
    // Arrange: Clear mock call history and reset the in-memory database state.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Seed a primary user into the `users` table for relationship testing.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Test suite for verifying authentication and session requirements.
   */
  describe("authentication", () => {
    /**
     * Verifies that the action is rejected when no valid session exists.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Simulate a null session from the `auth` module.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Call the `renameUpload` action with valid input.
      const result = await renameUpload(validInput);

      // Assert: Verify that the response indicates an unauthorized error.
      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });

    /**
     * Verifies that the action is rejected if the session lacks a valid user identifier.
     */
    it("returns error when session has no user id", async () => {
      // Arrange: Simulate a session object that is missing a `user.id` property.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Call the `renameUpload` action.
      const result = await renameUpload(validInput);

      // Assert: Verify that the response indicates an unauthorized error.
      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });
  });

  /**
   * Test suite for verifying the enforcement of input constraints.
   */
  describe("input validation", () => {
    /**
     * Sets up a valid authenticated session for validation test cases.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that an empty source key results in a validation error.
     */
    it("returns error for empty oldKey", async () => {
      // Act: Invoke the action with an empty `oldKey` string.
      const result = await renameUpload({ oldKey: "", newFileName: "new-name" });

      // Assert: Ensure the return value matches the expected validation error.
      expect(result).toEqual({ success: false, error: "Invalid input provided." });
    });

    /**
     * Verifies that an empty target file name results in a validation error.
     */
    it("returns error for empty newFileName", async () => {
      // Act: Invoke the action with an empty `newFileName` string.
      const result = await renameUpload({ oldKey: "some/key.jpg", newFileName: "" });

      // Assert: Ensure the return value matches the expected validation error.
      expect(result).toEqual({ success: false, error: "Invalid input provided." });
    });
  });

  /**
   * Test suite for verifying that users can only rename their own files.
   */
  describe("ownership verification", () => {
    /**
     * Sets up an authenticated session for ownership test cases.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that the action fails if the S3 metadata contains a different user ID.
     */
    it("returns forbidden error when file belongs to another user", async () => {
      // Arrange: Mock S3 response to return a `userid` metadata field that does not match the session.
      const { s3 } = await import("@/lib/aws");
      vi.mocked(s3.send).mockResolvedValueOnce({
        Metadata: { userid: "other-user-id" },
      } as never);

      // Act: Attempt to rename the file.
      const result = await renameUpload(validInput);

      // Assert: Verify the forbidden error message is returned.
      expect(result).toEqual({
        success: false,
        error: "Forbidden: You do not have permission to rename this file.",
      });
    });
  });

  /**
   * Test suite for validating the successful file renaming workflow.
   */
  describe("successful rename", () => {
    /**
     * Configures successful authentication and S3 metadata responses.
     */
    beforeEach(async () => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      const { s3 } = await import("@/lib/aws");
      vi.mocked(s3.send).mockResolvedValue({
        Metadata: { userid: mockUsers.primaryUser.id },
      } as never);
    });

    /**
     * Verifies that a valid request results in a successful rename and correct metadata.
     */
    it("successfully renames file and returns new key and URL", async () => {
      // Act: Invoke the rename logic with valid parameters.
      const result = await renameUpload(validInput);

      // Assert: Ensure success is true and the `newKey` contains the updated file name.
      expect(result.success).toBe(true);
      expect(result.data?.newKey).toContain("new-image-name.jpg");
      expect(result.data?.newUrl).toContain("new-image-name.jpg");
    });

    /**
     * Verifies that the logic removes unsafe characters from the provided file name.
     */
    it("sanitizes special characters in new file name", async () => {
      // Act: Provide a file name containing spaces and parentheses.
      const result = await renameUpload({
        oldKey: "uploads/user-123/case-456/old-image.jpg",
        newFileName: "new file (1).jpg",
      });

      // Assert: Verify that the `newKey` has been sanitized of illegal characters.
      expect(result.success).toBe(true);
      expect(result.data?.newKey).not.toContain(" ");
      expect(result.data?.newKey).not.toContain("(");
      expect(result.data?.newKey).not.toContain(")");
    });

    /**
     * Verifies that the extension of the original file is not changed during the rename.
     */
    it("preserves original file extension", async () => {
      // Act: Rename a `.png` file while providing a name with a different extension.
      const result = await renameUpload({
        oldKey: "uploads/user-123/case-456/old-image.png",
        newFileName: "new-name.jpg",
      });

      // Assert: Confirm the resulting key maintains the original `.png` extension.
      expect(result.success).toBe(true);
      expect(result.data?.newKey).toContain(".png");
    });

    /**
     * Verifies that the folder path prefix remains unchanged.
     */
    it("preserves original folder structure", async () => {
      // Act: Rename a file located deep within a folder hierarchy.
      const result = await renameUpload(validInput);

      // Assert: Verify the folder path in the `newKey` matches the original structure.
      expect(result.success).toBe(true);
      expect(result.data?.newKey).toContain("uploads/user-123/case-456/");
    });

    /**
     * Verifies that the operation is idempotent if the name remains unchanged after sanitization.
     */
    it("returns same key when sanitized name equals original", async () => {
      // Act: Provide a new file name that is identical to the current one.
      const result = await renameUpload({
        oldKey: "uploads/user-123/case-456/same-name.jpg",
        newFileName: "same-name",
      });

      // Assert: Ensure the returned key is identical to the `oldKey`.
      expect(result.success).toBe(true);
      expect(result.data?.newKey).toBe("uploads/user-123/case-456/same-name.jpg");
    });
  });

  /**
   * Test suite for verifying error handling and recovery during failures.
   */
  describe("error handling", () => {
    /**
     * Sets up an authenticated session for error handling test cases.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies handling of failures when retrieving object metadata from S3.
     */
    it("handles S3 HeadObject errors gracefully", async () => {
      // Arrange: Force the S3 service to throw an error during the metadata check.
      const { s3 } = await import("@/lib/aws");
      vi.mocked(s3.send).mockRejectedValueOnce(new Error("S3 HeadObject failed"));

      // Act: Attempt to rename the file.
      const result = await renameUpload(validInput);

      // Assert: Verify a generic internal server error is returned to the user.
      expect(result).toEqual({
        success: false,
        error: "An internal server error occurred while renaming the file.",
      });
    });

    /**
     * Verifies handling of failures during the S3 copy operation.
     */
    it("handles S3 CopyObject errors gracefully", async () => {
      // Arrange: Mock successful metadata retrieval followed by a failed copy operation.
      const { s3 } = await import("@/lib/aws");
      vi.mocked(s3.send)
        .mockResolvedValueOnce({ Metadata: { userid: mockUsers.primaryUser.id } } as never)
        .mockRejectedValueOnce(new Error("S3 CopyObject failed"));

      // Act: Attempt to rename the file.
      const result = await renameUpload(validInput);

      // Assert: Verify a generic internal server error is returned.
      expect(result).toEqual({
        success: false,
        error: "An internal server error occurred while renaming the file.",
      });
    });

    /**
     * Verifies that critical failures during database updates trigger high-priority alerts.
     */
    it("logs critical error when DB update fails after S3 rename", async () => {
      // Arrange: Mock successful S3 interactions but force the `db.update` call to fail.
      const { logCritical } = await import("@/lib/logger");
      const { s3 } = await import("@/lib/aws");
      const dbModule = await import("@/db");

      vi.mocked(s3.send).mockResolvedValue({
        Metadata: { userid: mockUsers.primaryUser.id },
      } as never);
      vi.spyOn(dbModule.db, "update").mockImplementation(() => {
        throw new Error("Database update failed");
      });

      // Act: Execute the rename operation.
      const result = await renameUpload(validInput);

      // Assert: Verify the response contains a database error and a critical log was generated.
      expect(result.success).toBe(false);
      expect(result.error).toContain("database error");
      expect(logCritical).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining("DB update failed"),
        expect.any(Error),
        expect.objectContaining({
          requiresManualIntervention: true,
        })
      );
    });
  });

  /**
   * Test suite for verifying environment configuration safety.
   */
  describe("environment variable validation", () => {
    /**
     * Verifies that the application crashes safely if the S3 bucket name is not configured.
     */
    it("throws error when AWS_BUCKET_NAME is missing", async () => {
      // Arrange: Temporarily remove the `AWS_BUCKET_NAME` environment variable.
      const originalBucketName = process.env.AWS_BUCKET_NAME;
      delete process.env.AWS_BUCKET_NAME;
      vi.resetModules();

      // Act & Assert: Verify that importing the module throws a configuration error.
      await expect(async () => {
        await import("@/features/upload/actions/rename-upload");
      }).rejects.toThrow("Environment validation failed:");

      // Arrange: Restore the environment variable for subsequent tests.
      process.env.AWS_BUCKET_NAME = originalBucketName;
    });

    /**
     * Verifies that the application crashes safely if the S3 region is not configured.
     */
    it("throws error when AWS_BUCKET_REGION is missing", async () => {
      // Arrange: Temporarily remove the `AWS_BUCKET_REGION` environment variable.
      const originalBucketRegion = process.env.AWS_BUCKET_REGION;
      delete process.env.AWS_BUCKET_REGION;
      vi.resetModules();

      // Act & Assert: Verify that importing the module throws a configuration error.
      await expect(async () => {
        await import("@/features/upload/actions/rename-upload");
      }).rejects.toThrow("Environment validation failed:");

      // Arrange: Restore the environment variable for subsequent tests.
      process.env.AWS_BUCKET_REGION = originalBucketRegion;
    });
  });
});
