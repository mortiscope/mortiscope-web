"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { deleteUpload } from "@/features/upload/actions/delete-upload";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the AWS S3 client commands to simulate storage operations.
vi.mock("@aws-sdk/client-s3", () => ({
  HeadObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

// Mock the AWS library internal client and its send method.
vi.mock("@/lib/aws", () => ({
  s3: {
    send: vi.fn(),
  },
}));

// Mock the logging utility to verify that security events and errors are tracked.
vi.mock("@/lib/logger", () => ({
  uploadLogger: {
    warn: vi.fn(),
    info: vi.fn(),
  },
  s3Logger: {
    info: vi.fn(),
  },
  logError: vi.fn(),
  logCritical: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `deleteUpload` server action.
 */
describe("deleteUpload (integration)", () => {
  const validInput = {
    key: "uploads/user-123/case-456/test-image.jpg",
  };

  /**
   * Resets database state and populates initial user data before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear mock history and reset the database schema.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Create the primary test user in the `users` table.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Test suite for verifying authentication requirements.
   */
  describe("authentication", () => {
    /**
     * Verifies that the action returns an unauthorized error when no session is present.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Simulate a null session from the `auth` function.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Attempt to delete an upload record.
      const result = await deleteUpload(validInput);

      // Assert: Verify the response matches the expected unauthorized error.
      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });

    /**
     * Verifies that sessions missing identity data are rejected.
     */
    it("returns error when session has no user id", async () => {
      // Arrange: Simulate a session object that contains no user identification.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Attempt to delete an upload record.
      const result = await deleteUpload(validInput);

      // Assert: Verify the response matches the expected unauthorized error.
      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });
  });

  /**
   * Test suite for verifying schema validation of input parameters.
   */
  describe("input validation", () => {
    /**
     * Configures a valid authenticated session before validation tests.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that an empty S3 key results in a validation error.
     */
    it("returns error for empty key", async () => {
      // Act: Call the action with an empty `key` string.
      const result = await deleteUpload({ key: "" });

      // Assert: Verify that the validation error message is returned.
      expect(result).toEqual({ success: false, error: "Invalid input provided." });
    });
  });

  /**
   * Test suite for verifying that users can only delete their own files.
   */
  describe("ownership verification", () => {
    /**
     * Configures a valid authenticated session before ownership tests.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that files with foreign owner IDs in metadata are protected.
     */
    it("returns forbidden error when file belongs to another user", async () => {
      // Arrange: Mock S3 `HeadObject` to return metadata belonging to a different user.
      const { s3 } = await import("@/lib/aws");
      vi.mocked(s3.send).mockResolvedValueOnce({
        Metadata: { userid: "other-user-id" },
      } as never);

      // Act: Attempt to delete the file as the primary user.
      const result = await deleteUpload(validInput);

      // Assert: Verify the permission denied error message.
      expect(result).toEqual({
        success: false,
        error: "Forbidden: You do not have permission to delete this file.",
      });
    });

    /**
     * Verifies that files missing ownership metadata are protected by default.
     */
    it("returns forbidden error when metadata has no userid", async () => {
      // Arrange: Mock S3 `HeadObject` to return empty metadata.
      const { s3 } = await import("@/lib/aws");
      vi.mocked(s3.send).mockResolvedValueOnce({
        Metadata: {},
      } as never);

      // Act: Attempt to delete the file.
      const result = await deleteUpload(validInput);

      // Assert: Verify the permission denied error message.
      expect(result).toEqual({
        success: false,
        error: "Forbidden: You do not have permission to delete this file.",
      });
    });

    /**
     * Verifies that objects with no metadata property at all are protected.
     */
    it("returns forbidden error when Metadata is undefined", async () => {
      // Arrange: Mock S3 `HeadObject` to return a response without a `Metadata` key.
      const { s3 } = await import("@/lib/aws");
      vi.mocked(s3.send).mockResolvedValueOnce({} as never);

      // Act: Attempt to delete the file.
      const result = await deleteUpload(validInput);

      // Assert: Verify the permission denied error message.
      expect(result).toEqual({
        success: false,
        error: "Forbidden: You do not have permission to delete this file.",
      });
    });

    /**
     * Verifies that unauthorized deletion attempts trigger a security warning log.
     */
    it("logs warning when forbidden deletion is attempted", async () => {
      // Arrange: Set up a forbidden ownership scenario.
      const { uploadLogger } = await import("@/lib/logger");
      const { s3 } = await import("@/lib/aws");
      vi.mocked(s3.send).mockResolvedValueOnce({
        Metadata: { userid: "other-user-id" },
      } as never);

      // Act: Attempt the deletion.
      await deleteUpload(validInput);

      // Assert: Verify that a warning log was generated with the relevant context.
      expect(uploadLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUsers.primaryUser.id,
          key: validInput.key,
        }),
        expect.stringContaining("Forbidden deletion attempt")
      );
    });

    /**
     * Verifies that the logger handles missing ownership IDs by falling back to a string.
     */
    it("logs 'unknown' when keyOwnerId is undefined", async () => {
      // Arrange: Set up a metadata response missing the `userid` field.
      const { uploadLogger } = await import("@/lib/logger");
      const { s3 } = await import("@/lib/aws");
      vi.mocked(s3.send).mockResolvedValueOnce({
        Metadata: {},
      } as never);

      // Act: Attempt the deletion.
      await deleteUpload(validInput);

      // Assert: Verify that the owner identifier in the logs is marked as `unknown`.
      expect(uploadLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          keyOwnerId: "unknown",
        }),
        expect.any(String)
      );
    });
  });

  /**
   * Test suite for verifying side effects on successful file deletion.
   */
  describe("successful deletion", () => {
    /**
     * Configures authentication and S3 ownership for success scenarios.
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
     * Verifies that a valid request for an owned file returns a success status.
     */
    it("successfully deletes file from S3 and database", async () => {
      // Act: Invoke the deletion action.
      const result = await deleteUpload(validInput);

      // Assert: Verify that the operation reports success.
      expect(result).toEqual({ success: true });
    });

    /**
     * Verifies that successful storage operations are recorded in the logs.
     */
    it("logs successful S3 deletion", async () => {
      // Arrange: Import the mocked S3 logger.
      const { s3Logger } = await import("@/lib/logger");

      // Act: Invoke the deletion action.
      await deleteUpload(validInput);

      // Assert: Verify that an informational log was created for the S3 event.
      expect(s3Logger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUsers.primaryUser.id,
          key: validInput.key,
        }),
        expect.stringContaining("successfully deleted")
      );
    });
  });

  /**
   * Test suite for verifying robust error handling and failure reporting.
   */
  describe("error handling", () => {
    /**
     * Configures authentication for error scenario tests.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that failures during metadata retrieval return a generic error message.
     */
    it("handles S3 HeadObject errors gracefully", async () => {
      // Arrange: Force the S3 `send` method to throw an error during ownership check.
      const { s3 } = await import("@/lib/aws");
      vi.mocked(s3.send).mockRejectedValueOnce(new Error("S3 HeadObject failed"));

      // Act: Attempt to delete the file.
      const result = await deleteUpload(validInput);

      // Assert: Verify that a generic server error is returned.
      expect(result).toEqual({
        success: false,
        error: "An internal server error occurred while deleting the file.",
      });
    });

    /**
     * Verifies that storage failures occurring after database updates trigger a critical log for manual intervention.
     */
    it("logs critical error when S3 deletion fails after DB delete", async () => {
      // Arrange: Set up S3 to pass ownership check but fail the actual deletion.
      const { logCritical } = await import("@/lib/logger");
      const { s3 } = await import("@/lib/aws");

      vi.mocked(s3.send)
        .mockResolvedValueOnce({ Metadata: { userid: mockUsers.primaryUser.id } } as never)
        .mockRejectedValueOnce(new Error("S3 DeleteObject failed"));

      // Act: Attempt to delete the file.
      const result = await deleteUpload(validInput);

      // Assert: Verify success is still returned (as DB is clean) but a critical log is created.
      expect(result).toEqual({ success: true });
      expect(logCritical).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining("Orphaned S3 Object"),
        expect.any(Error),
        expect.objectContaining({
          key: validInput.key,
          requiresManualCleanup: true,
        })
      );
    });
  });

  /**
   * Test suite for verifying strict environment configuration checks.
   */
  describe("environment variable validation", () => {
    /**
     * Verifies that the module fails to load if critical AWS configuration is missing.
     */
    it("throws error when AWS_BUCKET_NAME is missing", async () => {
      // Arrange: Backup and remove the bucket name environment variable.
      const originalBucketName = process.env.AWS_BUCKET_NAME;
      delete process.env.AWS_BUCKET_NAME;
      vi.resetModules();

      // Act & Assert: Verify that importing the action triggers a configuration error.
      await expect(async () => {
        await import("@/features/upload/actions/delete-upload");
      }).rejects.toThrow("Missing required AWS environment variable: AWS_BUCKET_NAME");

      // Cleanup: Restore the environment variable for subsequent tests.
      process.env.AWS_BUCKET_NAME = originalBucketName;
    });
  });
});
