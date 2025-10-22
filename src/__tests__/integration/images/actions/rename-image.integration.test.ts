"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, uploads, users } from "@/db/schema";
import { renameImage } from "@/features/images/actions/rename-image";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the AWS S3 client commands to avoid actual cloud operations.
vi.mock("@aws-sdk/client-s3", () => ({
  HeadObjectCommand: vi.fn(),
  CopyObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

// Mock the internal S3 utility to control object metadata and lifecycle behavior.
vi.mock("@/lib/aws", () => ({
  s3: {
    send: vi.fn(),
  },
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `renameImage` server action.
 */
describe("renameImage (integration)", () => {
  const testUserId = mockUsers.primaryUser.id;
  const validInput = {
    imageId: "clm8x9y0z0001ab2c3d4e5f6g",
    newName: "new-image-name",
  };

  /**
   * Clears mock state and resets the database before each test.
   */
  beforeEach(async () => {
    // Arrange: Reset all mock histories.
    vi.clearAllMocks();
    // Arrange: Wipe the database to ensure a clean state.
    resetMockDb();

    // Arrange: Seed the database with a test user.
    await db.insert(users).values({
      id: testUserId,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Helper function to insert a case record for testing.
   */
  const insertCase = async (caseId: string) => {
    await db.insert(cases).values({
      id: caseId,
      userId: testUserId,
      caseName: "Test Case",
      status: "active",
      temperatureCelsius: 25,
      locationRegion: "Region",
      locationProvince: "Province",
      locationCity: "City",
      locationBarangay: "Barangay",
      caseDate: new Date(),
    });
  };

  /**
   * Helper function to insert an upload record for testing.
   */
  const insertUpload = async (
    uploadId: string,
    caseId: string | null,
    name: string = "test-image.jpg"
  ) => {
    await db.insert(uploads).values({
      id: uploadId,
      caseId: caseId,
      userId: testUserId,
      name: name,
      key: `uploads/${caseId}/${name}`,
      url: `https://example.com/uploads/${caseId}/${name}`,
      size: 1024,
      type: "image/jpeg",
      width: 1920,
      height: 1080,
    });
  };

  /**
   * Test suite for verifying authentication enforcement.
   */
  describe("authentication", () => {
    /**
     * Verifies that the action fails when no session exists.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Simulate a null authentication session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Attempt to rename an image without a session.
      const result = await renameImage(validInput);

      // Assert: Verify the unauthorized error response.
      expect(result).toEqual({ success: false, error: "Unauthorized. Please sign in." });
    });

    /**
     * Verifies that the action fails when the session is invalid.
     */
    it("returns error when session has no user id", async () => {
      // Arrange: Simulate a session missing the user identifier.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Attempt to rename an image with an invalid session.
      const result = await renameImage(validInput);

      // Assert: Verify the unauthorized error response.
      expect(result).toEqual({ success: false, error: "Unauthorized. Please sign in." });
    });
  });

  /**
   * Test suite for checking input parameter requirements.
   */
  describe("input validation", () => {
    /**
     * Sets up an authenticated session for validation tests.
     */
    beforeEach(() => {
      // Arrange: Configure an authenticated test user session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies failure when the image identifier is missing.
     */
    it("returns error for empty imageId", async () => {
      // Act: Attempt to rename with an empty `imageId`.
      const result = await renameImage({ imageId: "", newName: "new-name" });

      // Assert: Verify the validation error response.
      expect(result).toEqual({ success: false, error: "A new name is required." });
    });

    /**
     * Verifies failure when the new name is not provided.
     */
    it("returns error for empty newName", async () => {
      // Act: Attempt to rename with an empty `newName` string.
      const result = await renameImage({ imageId: "upload-123", newName: "" });

      // Assert: Verify the validation error response.
      expect(result).toEqual({ success: false, error: "A new name is required." });
    });
  });

  /**
   * Test suite for verifying data existence and ownership.
   */
  describe("image lookup", () => {
    /**
     * Sets up an authenticated session for lookup tests.
     */
    beforeEach(() => {
      // Arrange: Configure an authenticated test user session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies failure when the requested image does not exist.
     */
    it("returns error when image not found", async () => {
      // Act: Attempt to rename an image that is not in the database.
      const result = await renameImage(validInput);

      // Assert: Verify the not found error message.
      expect(result).toEqual({
        success: false,
        error: "You do not have permission to rename this file or it does not exist.",
      });
    });

    /**
     * Verifies that users cannot rename images owned by others.
     */
    it("returns error when image belongs to another user", async () => {
      // Arrange: Insert a secondary user and their upload record.
      await db.insert(users).values({
        id: "clo0z1a2b0003cd4e5f6g7h8i",
        email: "other@example.com",
        name: "Other User",
      });

      await db.insert(uploads).values({
        id: "clp1a2b3c0004de5f6g7h8i9j",
        caseId: null,
        userId: "clo0z1a2b0003cd4e5f6g7h8i",
        name: "other-image.jpg",
        key: "uploads/other/other-image.jpg",
        url: "https://example.com/uploads/other/other-image.jpg",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      // Act: Attempt to rename the file belonging to the other user.
      const result = await renameImage({
        imageId: "clp1a2b3c0004de5f6g7h8i9j",
        newName: "new-name",
      });

      // Assert: Verify the permission error message.
      expect(result).toEqual({
        success: false,
        error: "You do not have permission to rename this file or it does not exist.",
      });
    });

    /**
     * Verifies that images must be associated with a case to be renamed.
     */
    it("returns error when image has no caseId", async () => {
      // Arrange: Suppress console error logging for this test.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      // Arrange: Insert an upload that is not linked to any case.
      await insertUpload("clq2b3c4d0005ef6g7h8i9j0k", null, "no-case.jpg");

      // Act: Attempt to rename the standalone image.
      const result = await renameImage({
        imageId: "clq2b3c4d0005ef6g7h8i9j0k",
        newName: "new-name",
      });

      // Assert: Verify the error regarding missing case association.
      expect(result).toEqual({
        success: false,
        error: "Cannot rename image: The image is not part of a case.",
      });
      // Assert: Ensure the error was logged to the console.
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  /**
   * Test suite for checking name collisions within the same case.
   */
  describe("duplicate check", () => {
    /**
     * Sets up an authenticated session for collision tests.
     */
    beforeEach(() => {
      // Arrange: Configure an authenticated test user session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies failure when the target name is already taken in the case.
     */
    it("returns error when file with same name exists in case", async () => {
      // Arrange: Create a case and two images where one name matches the target.
      await insertCase("clr3c4d5e0006fg7h8i9j0k1l");
      await insertUpload("cls4d5e6f0007gh8i9j0k1l2m", "clr3c4d5e0006fg7h8i9j0k1l", "old-name.jpg");
      await insertUpload(
        "clt5e6f7g0008hi9j0k1l2m3n",
        "clr3c4d5e0006fg7h8i9j0k1l",
        "existing-name.jpg"
      );

      // Act: Attempt to rename the first image to the name of the second image.
      const result = await renameImage({
        imageId: "cls4d5e6f0007gh8i9j0k1l2m",
        newName: "existing-name",
      });

      // Assert: Verify the duplicate name error response.
      expect(result).toEqual({
        success: false,
        error: "A file with this name already exists in this case.",
      });
    });
  });

  /**
   * Test suite for successful file renaming scenarios.
   */
  describe("successful rename", () => {
    /**
     * Sets up session and S3 mocks for successful flows.
     */
    beforeEach(async () => {
      // Arrange: Configure an authenticated test user session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);

      // Arrange: Mock S3 response with empty metadata for file verification.
      const { s3 } = await import("@/lib/aws");
      vi.mocked(s3.send).mockResolvedValue({ Metadata: {} } as never);
    });

    /**
     * Verifies that the file is renamed in the DB and returns new S3 path data.
     */
    it("successfully renames image and returns new key and URL", async () => {
      // Arrange: Setup a case and an image to be renamed.
      const caseId = "clu6f7g8h0009ij0k1l2m3n4o";
      await insertCase(caseId);
      await insertUpload("clv7g8h9i0010jk1l2m3n4o5p", caseId, "old-name.jpg");

      // Act: Rename the image to a new valid string.
      const result = await renameImage({
        imageId: "clv7g8h9i0010jk1l2m3n4o5p",
        newName: "new-image-name",
      });

      // Assert: Verify success status and presence of new S3 data.
      expect(result.success).toBe(true);
      expect(result.data?.newKey).toContain("new-image-name.jpg");
      expect(result.data?.newUrl).toContain("new-image-name.jpg");

      // Assert: Confirm the `uploads` table record was updated in the database.
      const updatedUpload = await db.query.uploads.findFirst({
        where: (uploads, { eq }) => eq(uploads.id, "clv7g8h9i0010jk1l2m3n4o5p"),
      });
      expect(updatedUpload?.name).toBe("new-image-name.jpg");
    });

    /**
     * Verifies that the new filename is cleaned of illegal characters.
     */
    it("sanitizes special characters in new file name", async () => {
      // Arrange: Setup a case and an image for sanitization testing.
      const caseId = "clw8h9i0j0011kl2m3n4o5p6q";
      await insertCase(caseId);
      await insertUpload("clx9i0j1k0012lm3n4o5p6q7r", caseId, "old-name.jpg");

      // Act: Attempt to rename using a name containing spaces and parentheses.
      const result = await renameImage({
        imageId: "clx9i0j1k0012lm3n4o5p6q7r",
        newName: "new file (1).jpg",
      });

      // Assert: Verify that the resulting S3 key is sanitized.
      expect(result.success).toBe(true);
      expect(result.data?.newKey).not.toContain(" ");
      expect(result.data?.newKey).not.toContain("(");
      expect(result.data?.newKey).toContain("new-file--1-.jpg");
    });

    /**
     * Verifies that the existing file extension is maintained.
     */
    it("preserves original file extension", async () => {
      // Arrange: Setup a case and an image with a specific extension.
      const caseId = "cly0j1k2l0013mn4o5p6q7r8s";
      await insertCase(caseId);
      await insertUpload("clz1k2l3m0014no5p6q7r8s9t", caseId, "old-name.png");

      // Act: Rename the file while providing a different extension in the input.
      const result = await renameImage({
        imageId: "clz1k2l3m0014no5p6q7r8s9t",
        newName: "new-name.jpg",
      });

      // Assert: Verify that the original `.png` extension was preserved.
      expect(result.success).toBe(true);
      expect(result.data?.newKey).toContain(".png");
    });

    /**
     * Verifies behavior when the new name matches the existing name.
     */
    it("returns success without data when new key equals old key", async () => {
      // Arrange: Setup a case and an image for no-op testing.
      const caseId = "cla2l3m4n0015op6q7r8s9t0u";
      await insertCase(caseId);
      await insertUpload("clb3m4n5o0016pq7r8s9t0u1v", caseId, "same-name.jpg");

      // Act: Execute a rename where the name remains the same.
      const result = await renameImage({
        imageId: "clb3m4n5o0016pq7r8s9t0u1v",
        newName: "same-name",
      });

      // Assert: Verify a success response without returning any new S3 data.
      expect(result).toEqual({ success: true });
    });
  });

  /**
   * Test suite for checking error resilience during operations.
   */
  describe("error handling", () => {
    /**
     * Sets up an authenticated session for error tests.
     */
    beforeEach(() => {
      // Arrange: Configure an authenticated test user session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies handling of infrastructure failures in S3.
     */
    it("handles S3 HeadObject errors gracefully", async () => {
      // Arrange: Suppress console error output.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { s3 } = await import("@/lib/aws");

      // Arrange: Setup data and force an S3 network/permission failure.
      await insertCase("clc4n5o6p0017qr8s9t0u1v2w");
      await insertUpload("cld5o6p7q0018rs9t0u1v2w3x", "clc4n5o6p0017qr8s9t0u1v2w", "test.jpg");
      vi.mocked(s3.send).mockRejectedValue(new Error("S3 HeadObject failed"));

      // Act: Trigger the rename action.
      const result = await renameImage({
        imageId: "cld5o6p7q0018rs9t0u1v2w3x",
        newName: "new-name",
      });

      // Assert: Verify the generic server error response and console logging.
      expect(result.success).toBe(false);
      expect(result.error).toContain("internal server error");
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    /**
     * Verifies data consistency handling when DB updates fail after cloud changes.
     */
    it("handles database update errors after S3 rename", async () => {
      // Arrange: Suppress console error output.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const dbModule = await import("@/db");
      const { s3 } = await import("@/lib/aws");

      // Arrange: Setup data and simulate a database crash during update.
      await insertCase("cle6p7q8r0019st0u1v2w3x4y");
      await insertUpload("clf7q8r9s0020tu1v2w3x4y5z", "cle6p7q8r0019st0u1v2w3x4y", "test.jpg");

      vi.mocked(s3.send).mockResolvedValue({ Metadata: {} } as never);
      vi.spyOn(dbModule.db, "update").mockImplementation(() => {
        throw new Error("Database update failed");
      });

      // Act: Attempt to rename the file.
      const result = await renameImage({
        imageId: "clf7q8r9s0020tu1v2w3x4y5z",
        newName: "new-name",
      });

      // Assert: Verify the specific error message indicating partial success.
      expect(result).toEqual({
        success: false,
        error: "File was renamed, but a database error occurred.",
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  /**
   * Test suite for validating required environment configuration.
   */
  describe("environment variable validation", () => {
    /**
     * Verifies that the module throws if the S3 bucket name is not configured.
     */
    it("throws error when AWS_BUCKET_NAME is missing", async () => {
      // Arrange: Temporarily delete the environment variable.
      const originalBucketName = process.env.AWS_BUCKET_NAME;
      delete process.env.AWS_BUCKET_NAME;
      // Arrange: Clear module cache to trigger re-validation on import.
      vi.resetModules();

      // Assert: Verify that importing the action fails during variable checks.
      await expect(async () => {
        await import("@/features/images/actions/rename-image");
      }).rejects.toThrow("Missing required AWS environment variable");

      // Cleanup: Restore environment variable.
      process.env.AWS_BUCKET_NAME = originalBucketName;
    });

    /**
     * Verifies that the module throws if the S3 region is not configured.
     */
    it("throws error when AWS_BUCKET_REGION is missing", async () => {
      // Arrange: Temporarily delete the environment variable.
      const originalBucketRegion = process.env.AWS_BUCKET_REGION;
      delete process.env.AWS_BUCKET_REGION;
      // Arrange: Clear module cache to trigger re-validation on import.
      vi.resetModules();

      // Assert: Verify that importing the action fails during variable checks.
      await expect(async () => {
        await import("@/features/images/actions/rename-image");
      }).rejects.toThrow("Missing required AWS environment variable");

      // Cleanup: Restore environment variable.
      process.env.AWS_BUCKET_REGION = originalBucketRegion;
    });
  });
});
