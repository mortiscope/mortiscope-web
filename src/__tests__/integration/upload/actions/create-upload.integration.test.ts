"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createUpload } from "@/features/upload/actions/create-upload";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the S3 presigner to provide predictable upload URLs for testing.
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://s3.example.com/presigned-url"),
}));

// Mock the AWS library internal client.
vi.mock("@/lib/aws", () => ({
  s3: {},
}));

// Mock the logging utility to verify that errors are recorded without affecting test output.
vi.mock("@/lib/logger", () => ({
  uploadLogger: {},
  logError: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `createUpload` server action.
 */
describe("createUpload (integration)", () => {
  const validInput = {
    fileName: "test-image.jpg",
    fileType: "image/jpeg",
    fileSize: 1024 * 1024,
    caseId: mockCases.firstCase.id,
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

      // Act: Attempt to create an upload record.
      const result = await createUpload(validInput);

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

      // Act: Attempt to create an upload record.
      const result = await createUpload(validInput);

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
     * Verifies that an empty `caseId` results in a validation error.
     */
    it("returns error for missing caseId", async () => {
      // Act: Call the action with an empty `caseId` string.
      const result = await createUpload({
        ...validInput,
        caseId: "",
      });

      // Assert: Verify the failure status and specific field error details.
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid input");
      expect(result.details?.caseId).toBeDefined();
    });

    /**
     * Verifies that an empty `fileName` results in a validation error.
     */
    it("returns error for missing fileName", async () => {
      // Act: Call the action with an empty `fileName` string.
      const result = await createUpload({
        ...validInput,
        fileName: "",
      });

      // Assert: Verify the failure status and generic error message.
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid input");
    });

    /**
     * Verifies that files exceeding the size threshold are rejected.
     */
    it("returns error for file exceeding max size at schema level", async () => {
      // Act: Call the action with a `fileSize` above the 50MB limit.
      const result = await createUpload({
        ...validInput,
        fileSize: 50 * 1024 * 1024 + 1,
      });

      // Assert: Verify the failure status.
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid input");
    });

    /**
     * Verifies that non-image file types are rejected by the validator.
     */
    it("returns error for unsupported file type at schema level", async () => {
      // Act: Call the action with a PDF MIME type.
      const result = await createUpload({
        ...validInput,
        fileType: "application/pdf",
        fileName: "document.pdf",
      });

      // Assert: Verify the failure status.
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid input");
    });

    /**
     * Verifies that the file extension must correspond to the MIME type.
     */
    it("returns error for file type and extension mismatch", async () => {
      // Act: Call the action with a PNG type but a JPG extension.
      const result = await createUpload({
        ...validInput,
        fileType: "image/png",
        fileName: "test.jpg",
      });

      // Assert: Verify that the mismatch is detected and reported.
      expect(result.success).toBe(false);
      expect(result.error).toContain("does not match");
    });
  });

  /**
   * Test suite for verifying the generation of S3 presigned URLs.
   */
  describe("presigned URL generation", () => {
    /**
     * Configures authentication and S3 mocks for URL generation tests.
     */
    beforeEach(async () => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      vi.mocked(getSignedUrl).mockResolvedValue("https://s3.example.com/presigned-url");
    });

    /**
     * Verifies that a valid JPEG request produces a correct presigned URL and key.
     */
    it("successfully generates presigned URL for valid JPEG", async () => {
      // Act: Invoke the upload creation with valid JPEG data.
      const result = await createUpload(validInput);

      // Assert: Verify the success status and that the key contains required path segments.
      expect(result.success).toBe(true);
      expect(result.data?.url).toBe("https://s3.example.com/presigned-url");
      expect(result.data?.key).toContain("uploads/");
      expect(result.data?.key).toContain(mockUsers.primaryUser.id);
      expect(result.data?.key).toContain(mockCases.firstCase.id);
    });

    /**
     * Verifies that PNG requests are handled and maintain the correct extension in the key.
     */
    it("successfully generates presigned URL for PNG", async () => {
      // Act: Invoke the upload creation with PNG data.
      const result = await createUpload({
        ...validInput,
        fileName: "test-image.png",
        fileType: "image/png",
      });

      // Assert: Verify the success and the `.png` extension in the resulting key.
      expect(result.success).toBe(true);
      expect(result.data?.key).toContain(".png");
    });

    /**
     * Verifies that the S3 key is sanitized to remove spaces and special characters.
     */
    it("sanitizes file name in key", async () => {
      // Act: Invoke the upload creation with a filename containing spaces and parentheses.
      const result = await createUpload({
        ...validInput,
        fileName: "test image (1).jpg",
      });

      // Assert: Verify that the generated key has been cleaned of problematic characters.
      expect(result.success).toBe(true);
      expect(result.data?.key).not.toContain(" ");
      expect(result.data?.key).not.toContain("(");
      expect(result.data?.key).not.toContain(")");
    });

    /**
     * Verifies that the action respects a pre-defined key if provided in the input.
     */
    it("uses existing key when provided", async () => {
      // Arrange: Define a specific target key.
      const existingKey = "uploads/existing-key.jpg";

      // Act: Invoke the action with the explicit key parameter.
      const result = await createUpload({
        ...validInput,
        key: existingKey,
      });

      // Assert: Verify that the provided key is returned without modification.
      expect(result.success).toBe(true);
      expect(result.data?.key).toBe(existingKey);
    });
  });

  /**
   * Test suite for verifying error handling for infrastructure failures.
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
     * Verifies that failures in the S3 signing process return a generic user-friendly error.
     */
    it("handles S3 signing errors gracefully", async () => {
      // Arrange: Force the S3 `getSignedUrl` function to throw an error.
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      vi.mocked(getSignedUrl).mockRejectedValueOnce(new Error("S3 signing failed"));

      // Act: Attempt to create an upload.
      const result = await createUpload(validInput);

      // Assert: Verify the failure status and the masked error message.
      expect(result.success).toBe(false);
      expect(result.error).toBe("An internal server error occurred while preparing the upload.");
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
        await import("@/features/upload/actions/create-upload");
      }).rejects.toThrow("Missing required AWS environment variable: AWS_BUCKET_NAME");

      // Cleanup: Restore the environment variable for subsequent tests.
      process.env.AWS_BUCKET_NAME = originalBucketName;
    });
  });
});
