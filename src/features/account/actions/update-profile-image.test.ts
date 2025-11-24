import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createId } from "@paralleldrive/cuid2";
import { fileTypeFromBlob } from "file-type";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import {
  generateProfileImageUploadUrl,
  updateProfileImageUrl,
} from "@/features/account/actions/update-profile-image";
import { ProfileImageSchema } from "@/features/account/schemas/account";
import { privateActionLimiter } from "@/lib/rate-limiter";

// Mock the AWS S3 client and command structures to avoid network requests.
vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: vi.fn(),
  S3Client: vi.fn(),
}));

// Mock the S3 presigner utility to simulate the generation of temporary upload URLs.
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

// Mock the cuid2 library to provide stable, predictable IDs for file naming.
vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn(),
}));

// Mock the file-type detection library to simulate various file verification scenarios.
vi.mock("file-type", () => ({
  fileTypeFromBlob: vi.fn(),
}));

// Mock the authentication utility to control user session state in tests.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept and verify profile image updates.
vi.mock("@/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));

// Mock the Zod schema to control the validation results for profile image uploads.
vi.mock("@/features/account/schemas/account", () => ({
  ProfileImageSchema: {
    safeParse: vi.fn(),
  },
}));

// Mock the global S3 instance.
vi.mock("@/lib/aws", () => ({
  s3: {},
}));

// Mock the application configuration to provide stable S3 bucket and region settings.
vi.mock("@/lib/config", () => ({
  config: {
    aws: {
      s3BucketName: "test-bucket",
      bucketRegion: "us-east-1",
    },
  },
}));

// Mock the rate limiter to simulate various traffic restriction states.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
}));

/**
 * Test suite for the `generateProfileImageUploadUrl` action.
 */
describe("generateProfileImageUploadUrl", () => {
  const mockUserId = "user-123";
  const mockFile = new File(["test"], "avatar.png", { type: "image/png" });
  const mockPresignedUrl = "https://presigned-url.com";
  const mockId = "cuid-123";

  // Reset all mocks and define default successful behaviors before each test execution.
  beforeEach(() => {
    vi.clearAllMocks();

    // Arrange: Establish a valid user session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: mockUserId },
    });

    // Arrange: Ensure the rate limiter does not block the request.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Arrange: Mock a successful schema validation for the file.
    vi.mocked(ProfileImageSchema.safeParse).mockReturnValue({
      success: true,
      data: { file: mockFile },
    } as unknown as ReturnType<typeof ProfileImageSchema.safeParse>);

    // Arrange: Mock valid image type detection.
    vi.mocked(fileTypeFromBlob).mockResolvedValue({
      ext: "png",
      mime: "image/png",
    });

    vi.mocked(createId).mockReturnValue(mockId);
    vi.mocked(getSignedUrl).mockResolvedValue(mockPresignedUrl);
  });

  /**
   * Test case to verify that unauthenticated users cannot request upload URLs.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Simulate a missing session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);
    const formData = new FormData();

    // Act: Attempt to generate an upload URL.
    const result = await generateProfileImageUploadUrl(formData);

    // Assert: Verify that the unauthorized error is returned.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that rate limiting is enforced for upload requests.
   */
  it("returns error if rate limit is exceeded", async () => {
    // Arrange: Mock the rate limiter to trigger a restriction.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now(),
      pending: Promise.resolve(),
    });
    const formData = new FormData();

    // Act: Attempt to generate an upload URL.
    const result = await generateProfileImageUploadUrl(formData);

    // Assert: Check for the rate limit specific error message.
    expect(result).toEqual({ error: "Too many upload attempts. Please try again shortly." });
  });

  /**
   * Test case to verify behavior when the request payload is missing the file.
   */
  it("returns error if no file is provided", async () => {
    // Arrange: Provide empty form data.
    const formData = new FormData();

    // Act: Attempt to generate an upload URL.
    const result = await generateProfileImageUploadUrl(formData);

    // Assert: Verify the missing file error.
    expect(result).toEqual({ error: "No file provided." });
  });

  /**
   * Test case to verify fallback error handling when schema validation fails generically.
   */
  it("returns default error message if validation fails without specific issues", async () => {
    // Arrange: Force schema validation to fail without providing specific issue messages.
    vi.mocked(ProfileImageSchema.safeParse).mockReturnValue({
      success: false,
      error: { issues: [] },
    } as unknown as ReturnType<typeof ProfileImageSchema.safeParse>);

    const formData = new FormData();
    formData.append("file", mockFile);

    // Act: Attempt to generate an upload URL.
    const result = await generateProfileImageUploadUrl(formData);

    // Assert: Verify the generic invalid file error.
    expect(result).toEqual({ error: "Invalid file." });
  });

  /**
   * Test case to verify that specific validation errors (e.g., file size) are returned to the user.
   */
  it("returns schema validation error if file is invalid", async () => {
    // Arrange: Mock a specific Zod validation error.
    vi.mocked(ProfileImageSchema.safeParse).mockReturnValue({
      success: false,
      error: { issues: [{ message: "File too large", code: "custom", path: [] }] },
    } as unknown as ReturnType<typeof ProfileImageSchema.safeParse>);

    const formData = new FormData();
    formData.append("file", mockFile);

    // Act: Attempt to generate an upload URL.
    const result = await generateProfileImageUploadUrl(formData);

    // Assert: Verify that the specific schema message is returned.
    expect(result).toEqual({ error: "File too large" });
  });

  /**
   * Test case to verify that unaccepted file types (e.g., executables) are rejected.
   */
  it("returns error if file type detection fails or type is not accepted", async () => {
    // Arrange: Simulate the detection of a dangerous or unsupported file type.
    vi.mocked(fileTypeFromBlob).mockResolvedValue({
      ext: "exe",
      mime: "application/x-msdownload",
    });

    const formData = new FormData();
    formData.append("file", mockFile);

    // Act: Attempt to generate an upload URL.
    const result = await generateProfileImageUploadUrl(formData);

    // Assert: Verify the invalid image file error.
    expect(result).toEqual({ error: "Invalid or corrupted image file." });
  });

  /**
   * Test case to verify rejection when the file type cannot be determined at all.
   */
  it("returns error if file type detection returns null", async () => {
    // Arrange: Simulate a failure in detecting any file signature.
    vi.mocked(fileTypeFromBlob).mockResolvedValue(undefined);

    const formData = new FormData();
    formData.append("file", mockFile);

    // Act: Attempt to generate an upload URL.
    const result = await generateProfileImageUploadUrl(formData);

    // Assert: Verify the invalid image file error.
    expect(result).toEqual({ error: "Invalid or corrupted image file." });
  });

  /**
   * Test case to verify the successful construction of S3 keys and public URLs.
   */
  it("successfully generates upload URLs", async () => {
    // Arrange: Use a valid file in the form data.
    const formData = new FormData();
    formData.append("file", mockFile);

    // Act: Generate the upload URL.
    const result = await generateProfileImageUploadUrl(formData);

    const expectedKey = `profile-images/${mockUserId}/${mockId}.png`;

    // Assert: Verify the success object contains the presigned URL and the S3 key.
    expect(result).toEqual({
      success: true,
      data: {
        url: mockPresignedUrl,
        key: expectedKey,
      },
    });
  });

  /**
   * Test case to verify that AWS-related exceptions are caught and reported as generic errors.
   */
  it("handles exceptions gracefully", async () => {
    // Arrange: Force the AWS presigner to throw an error.
    vi.mocked(getSignedUrl).mockRejectedValue(new Error("AWS Error"));

    const formData = new FormData();
    formData.append("file", mockFile);

    // Act: Attempt to generate the upload URL.
    const result = await generateProfileImageUploadUrl(formData);

    // Assert: Verify the generic failure message is returned to the user.
    expect(result).toEqual({ error: "Failed to generate upload URL. Please try again." });
  });
});

/**
 * Test suite for the `updateProfileImageUrl` action.
 * This action updates the user's profile picture URL in the database after a successful S3 upload.
 */
describe("updateProfileImageUrl", () => {
  const mockUserId = "user-123";
  const mockImageUrl = "https://example.com/image.png";

  // Establish a valid authentication state before each database-related test.
  beforeEach(() => {
    vi.clearAllMocks();
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: mockUserId },
    });
  });

  /**
   * Test case to verify that only authenticated users can update their profile image record.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Simulate an unauthenticated state.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to update the image URL.
    const result = await updateProfileImageUrl(mockImageUrl);

    // Assert: Verify the unauthorized error.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that a successful database update triggers the correct SQL-like calls.
   */
  it("successfully updates database", async () => {
    // Arrange: Mock the database update chain.
    const mockDbChain = {
      set: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(db.update).mockReturnValue(mockDbChain as unknown as ReturnType<typeof db.update>);

    // Act: Execute the update action.
    const result = await updateProfileImageUrl(mockImageUrl);

    // Assert: Verify the update method was called with the correct image URL and current timestamp.
    expect(db.update).toHaveBeenCalled();
    expect(mockDbChain.set).toHaveBeenCalledWith({
      image: mockImageUrl,
      updatedAt: expect.any(Date),
    });
    expect(result).toEqual({ success: true });
  });

  /**
   * Test case to verify that database exceptions are caught and reported correctly.
   */
  it("handles database errors gracefully", async () => {
    // Arrange: Force a database connection or query error.
    vi.mocked(db.update).mockImplementation(() => {
      throw new Error("DB Error");
    });

    // Act: Attempt to update the image URL.
    const result = await updateProfileImageUrl(mockImageUrl);

    // Assert: Verify the generic database failure message.
    expect(result).toEqual({ error: "Failed to update profile image. Please try again." });
  });
});
