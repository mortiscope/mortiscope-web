"use server";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createId } from "@paralleldrive/cuid2";
import { eq } from "drizzle-orm";
import { fileTypeFromBlob } from "file-type";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  generateProfileImageUploadUrl,
  updateProfileImageUrl,
} from "@/features/account/actions/update-profile-image";
import { ProfileImageSchema } from "@/features/account/schemas/account";
import { privateActionLimiter } from "@/lib/rate-limiter";

// Mock the S3 client and commands to prevent actual AWS infrastructure calls.
vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: vi.fn(),
  S3Client: vi.fn(),
}));

// Mock the S3 request presigner to control the generation of upload URLs.
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

// Mock the CUID generator to ensure predictable ID generation for S3 keys.
vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn(),
}));

// Mock the file type detection to simulate various file extensions and MIME types.
vi.mock("file-type", () => ({
  fileTypeFromBlob: vi.fn(),
}));

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the profile image schema validation to simulate success and failure scenarios.
vi.mock("@/features/account/schemas/account", () => ({
  ProfileImageSchema: {
    safeParse: vi.fn(),
  },
}));

// Mock the AWS S3 instance.
vi.mock("@/lib/aws", () => ({
  s3: {},
}));

// Mock application configuration to provide test-specific AWS bucket details.
vi.mock("@/lib/config", () => ({
  config: {
    aws: {
      s3BucketName: "test-bucket",
      bucketRegion: "us-east-1",
    },
  },
}));

// Mock the rate limiter to control request limits during testing.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
}));

/**
 * Integration test suite for `updateProfileImage` server action.
 */
describe("updateProfileImage (integration)", () => {
  const mockUserId = "test-user-id";
  const mockFile = new File(["test"], "avatar.png", { type: "image/png" });
  const mockPresignedUrl = "https://presigned-url.com/signed";
  const mockCuid = "unique-cuid-123";

  /**
   * Resets the mock state and database before each test execution.
   */
  beforeEach(() => {
    // Arrange: Clear mock history and reset the database to a clean state.
    vi.clearAllMocks();
    resetMockDb();
  });

  /**
   * Test suite for the generation of S3 presigned upload URLs.
   */
  describe("generateProfileImageUploadUrl", () => {
    /**
     * Configures default mock responses for the upload URL generation tests.
     */
    beforeEach(() => {
      // Arrange: Configure authentication to return a valid test user session.
      (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
        user: { id: mockUserId },
      });

      // Arrange: Configure the rate limiter to permit the action.
      vi.mocked(privateActionLimiter.limit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now(),
        pending: Promise.resolve(),
      });

      // Arrange: Mock the schema validation to succeed with the test file.
      vi.mocked(ProfileImageSchema.safeParse).mockReturnValue({
        success: true,
        data: { file: mockFile },
      } as unknown as ReturnType<typeof ProfileImageSchema.safeParse>);

      // Arrange: Mock the file type detection to identify a valid PNG.
      vi.mocked(fileTypeFromBlob).mockResolvedValue({
        ext: "png",
        mime: "image/png",
      });

      // Arrange: Mock secondary utilities to return predictable values.
      vi.mocked(createId).mockReturnValue(mockCuid);
      vi.mocked(getSignedUrl).mockResolvedValue(mockPresignedUrl);
    });

    /**
     * Test case to verify that a valid presigned URL and S3 key are produced.
     */
    it("generates presigned URL and constructs valid S3 key", async () => {
      // Arrange: Prepare form data containing the test file.
      const formData = new FormData();
      formData.append("file", mockFile);

      // Act: Invoke the upload URL generation function.
      const result = await generateProfileImageUploadUrl(formData);

      // Assert: Verify that the result contains the expected presigned URL and formatted key.
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.url).toBe(mockPresignedUrl);
      expect(result.data!.key).toContain(`profile-images/${mockUserId}/`);
      expect(result.data!.key).toContain(mockCuid);
      expect(result.data!.publicUrl).toContain("test-bucket.s3.us-east-1.amazonaws.com");
    });

    /**
     * Test case to verify that the action fails without an active user session.
     */
    it("returns unauthorized error when session is missing", async () => {
      // Arrange: Simulate an unauthenticated request.
      (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);
      const formData = new FormData();

      // Act: Attempt to generate the URL.
      const result = await generateProfileImageUploadUrl(formData);

      // Assert: Verify the unauthorized error response.
      expect(result.error).toBe("Unauthorized.");
      expect(result.success).toBeUndefined();
    });

    /**
     * Test case to verify that the rate limiter blocks excessive upload attempts.
     */
    it("returns rate limit error when limit exceeded", async () => {
      // Arrange: Configure the rate limiter to reject the request.
      vi.mocked(privateActionLimiter.limit).mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now(),
        pending: Promise.resolve(),
      });
      const formData = new FormData();

      // Act: Attempt to generate the URL.
      const result = await generateProfileImageUploadUrl(formData);

      // Assert: Verify the rate limit error message.
      expect(result.error).toBe("Too many upload attempts. Please try again shortly.");
    });

    /**
     * Test case to verify that missing file inputs are caught.
     */
    it("returns error when no file is provided", async () => {
      // Arrange: Create empty form data.
      const formData = new FormData();

      // Act: Attempt to generate the URL.
      const result = await generateProfileImageUploadUrl(formData);

      // Assert: Verify the missing file error response.
      expect(result.error).toBe("No file provided.");
    });

    /**
     * Test case to verify that Zod schema validation errors are returned.
     */
    it("returns validation error message when schema validation fails", async () => {
      // Arrange: Mock a validation failure with a specific issue.
      vi.mocked(ProfileImageSchema.safeParse).mockReturnValue({
        success: false,
        error: { issues: [{ message: "File exceeds 5MB limit", code: "custom", path: [] }] },
      } as unknown as ReturnType<typeof ProfileImageSchema.safeParse>);

      const formData = new FormData();
      formData.append("file", mockFile);

      // Act: Attempt to generate the URL.
      const result = await generateProfileImageUploadUrl(formData);

      // Assert: Verify that the specific validation message is returned.
      expect(result.error).toBe("File exceeds 5MB limit");
    });

    /**
     * Test case to verify a generic error message when validation fails without specific issues.
     */
    it("returns fallback error when validation fails with empty issues", async () => {
      // Arrange: Mock a validation failure containing an empty issue array.
      vi.mocked(ProfileImageSchema.safeParse).mockReturnValue({
        success: false,
        error: { issues: [] },
      } as unknown as ReturnType<typeof ProfileImageSchema.safeParse>);

      const formData = new FormData();
      formData.append("file", mockFile);

      // Act: Attempt to generate the URL.
      const result = await generateProfileImageUploadUrl(formData);

      // Assert: Verify the fallback error message.
      expect(result.error).toBe("Invalid file.");
    });

    /**
     * Test case to verify that non-image file types are rejected.
     */
    it("returns error when file type is unacceptable", async () => {
      // Arrange: Mock the file detection to return an executable type.
      vi.mocked(fileTypeFromBlob).mockResolvedValue({
        ext: "exe",
        mime: "application/x-msdownload",
      });

      const formData = new FormData();
      formData.append("file", mockFile);

      // Act: Attempt to generate the URL.
      const result = await generateProfileImageUploadUrl(formData);

      // Assert: Verify the corrupted or invalid image error response.
      expect(result.error).toBe("Invalid or corrupted image file.");
    });

    /**
     * Test case to verify graceful handling of AWS S3 connection failures.
     */
    it("handles S3 presigner errors gracefully", async () => {
      // Arrange: Force the S3 presigner to throw an error.
      vi.mocked(getSignedUrl).mockRejectedValue(new Error("S3 Connection Error"));

      const formData = new FormData();
      formData.append("file", mockFile);

      // Act: Attempt to generate the URL.
      const result = await generateProfileImageUploadUrl(formData);

      // Assert: Verify the user-facing error message.
      expect(result.error).toBe("Failed to generate upload URL. Please try again.");
    });
  });

  /**
   * Test suite for updating the profile image URL in the database.
   */
  describe("updateProfileImageUrl", () => {
    const mockImageUrl = "https://test-bucket.s3.us-east-1.amazonaws.com/profile-images/test.png";

    /**
     * Sets up a test user and authenticated session before each update test.
     */
    beforeEach(async () => {
      // Arrange: Configure authentication for the test user.
      (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
        user: { id: mockUserId },
      });

      // Arrange: Seed the `users` table with the test user record.
      await db.insert(users).values({
        id: mockUserId,
        email: "mortiscope@example.com",
        name: "MortiScope Account",
        image: null,
      });
    });

    /**
     * Test case to verify successful database update of the user's image field.
     */
    it("updates user image URL in the database", async () => {
      // Act: Invoke the update function with the new image URL.
      const result = await updateProfileImageUrl(mockImageUrl);

      // Assert: Verify that the operation returned success.
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    /**
     * Test case to verify that the update fails when no session exists.
     */
    it("returns unauthorized error when session is missing", async () => {
      // Arrange: Simulate an unauthenticated request.
      (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

      // Act: Attempt to update the image URL.
      const result = await updateProfileImageUrl(mockImageUrl);

      // Assert: Verify the unauthorized error response.
      expect(result.error).toBe("Unauthorized.");
    });

    /**
     * Test case to verify that sessions lacking a user ID are treated as unauthorized.
     */
    it("returns unauthorized when session has no user id", async () => {
      // Arrange: Simulate a malformed session object.
      (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
        user: {},
      });

      // Act: Attempt to update the image URL.
      const result = await updateProfileImageUrl(mockImageUrl);

      // Assert: Verify the unauthorized error response.
      expect(result.error).toBe("Unauthorized.");
    });

    /**
     * Test case to verify graceful handling of database exceptions during update.
     */
    it("handles database errors gracefully", async () => {
      // Arrange: Mock the database module to throw an error during the update operation.
      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db, "update").mockImplementationOnce(() => {
        throw new Error("Database Error");
      });

      // Act: Attempt to update the image URL.
      const result = await updateProfileImageUrl(mockImageUrl);

      // Assert: Verify the user-facing database error message.
      expect(result.error).toBe("Failed to update profile image. Please try again.");
    });
  });

  /**
   * Test suite for the sequential flow from URL generation to database update.
   */
  describe("full upload flow", () => {
    /**
     * Configures the full integration environment for a complete upload cycle.
     */
    beforeEach(async () => {
      // Arrange: Configure authentication, rate limiting, and validation mocks for success.
      (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
        user: { id: mockUserId },
      });

      vi.mocked(privateActionLimiter.limit).mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now(),
        pending: Promise.resolve(),
      });

      vi.mocked(ProfileImageSchema.safeParse).mockReturnValue({
        success: true,
        data: { file: mockFile },
      } as unknown as ReturnType<typeof ProfileImageSchema.safeParse>);

      vi.mocked(fileTypeFromBlob).mockResolvedValue({
        ext: "png",
        mime: "image/png",
      });

      vi.mocked(createId).mockReturnValue(mockCuid);
      vi.mocked(getSignedUrl).mockResolvedValue(mockPresignedUrl);

      // Arrange: Ensure the user exists in the database.
      await db.insert(users).values({
        id: mockUserId,
        email: "mortiscope@example.com",
        name: "MortiScope Account",
        image: null,
      });
    });

    /**
     * Test case to verify that the generated URL can be used to update the database record.
     */
    it("generates upload URL and updates database in sequence", async () => {
      // Arrange: Prepare the file data for the first step.
      const formData = new FormData();
      formData.append("file", mockFile);

      // Act: Generate the upload URL.
      const uploadResult = await generateProfileImageUploadUrl(formData);

      // Assert: Verify the URL was generated successfully.
      expect(uploadResult.success).toBe(true);
      expect(uploadResult.data?.publicUrl).toBeDefined();

      // Act: Update the database with the resulting public URL.
      const updateResult = await updateProfileImageUrl(uploadResult.data!.publicUrl!);

      // Assert: Verify the database update succeeded and the user record persists.
      expect(updateResult.success).toBe(true);

      const [user] = await db.select().from(users).where(eq(users.id, mockUserId));
      expect(user).toBeDefined();
    });
  });
});
