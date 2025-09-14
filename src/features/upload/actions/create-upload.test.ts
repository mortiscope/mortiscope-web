import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Session } from "next-auth";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { createUpload } from "@/features/upload/actions/create-upload";
import { logError } from "@/lib/logger";

// Mock the authentication utility to control user session state.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock AWS S3 client dependencies.
vi.mock("@/lib/aws", () => ({
  s3: {},
}));

// Mock logging utilities to track error logging calls.
vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
  uploadLogger: {},
}));

// Mock the AWS SDK S3 command class.
vi.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: vi.fn(),
}));

// Mock the function to generate a pre-signed URL.
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

// Mock the CUID utility to return a deterministic ID for key generation.
vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn(() => "cuid-123"),
}));

// Mock constants for validation limits and file types.
vi.mock("@/lib/constants", () => ({
  ACCEPTED_IMAGE_TYPES: {
    "image/jpeg": [".jpeg", ".jpg"],
    "image/png": [".png"],
    "image/webp": [".webp"],
    "image/heic": [".heic"],
    "image/heif": [".heif"],
  },
  MAX_FILE_SIZE: 1000,
  PRESIGNED_URL_EXPIRATION_SECONDS: 600,
}));

// Mock utility for byte formatting used in error messages.
vi.mock("@/lib/utils", () => ({
  formatBytes: (bytes: number) => `${bytes} B`,
}));

// Type the mock function for authentication resolution.
const mockAuth = vi.mocked(auth as unknown as () => Promise<Session | null>);

// Helper function to create a mock session object.
const createMockSession = (userId = "user"): Session => ({
  user: {
    id: userId,
    name: "Mortiscope Account",
    email: "mortiscope@example.com",
  },
  expires: new Date().toISOString(),
});

/**
 * Test suite for the `createUpload` server action.
 */
describe("createUpload", () => {
  // Clear mock call history before each test.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Reset all mock implementations after each test.
  afterEach(() => {
    vi.resetAllMocks();
  });

  /**
   * Test case to verify that the action returns an unauthorized error if the user is not authenticated.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Mock `auth` to return null session.
    mockAuth.mockResolvedValue(null);

    // Act: Call the server action.
    const result = await createUpload({
      fileName: "test.jpg",
      fileSize: 500,
      fileType: "image/jpeg",
      caseId: "case",
    });

    // Assert: Check that the result matches the expected unauthorized response structure.
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  /**
   * Test case to verify that input validation handles missing required fields.
   */
  it("returns error if input validation fails (missing caseId)", async () => {
    // Arrange: Mock authenticated session.
    mockAuth.mockResolvedValue(createMockSession());

    // Act: Call the server action with an empty `caseId`.
    const result = await createUpload({
      fileName: "test.jpg",
      fileSize: 500,
      fileType: "image/jpeg",
      caseId: "",
    });

    // Assert: Check for overall failure and the generic "Invalid input" error message.
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid input");
    // Assert: Check that validation details for the `caseId` field are present.
    expect(result.details?.caseId).toBeDefined();
  });

  /**
   * Test case to verify that the action rejects files that exceed the configured size limit.
   */
  it("returns error if file size exceeds limit", async () => {
    // Arrange: Mock authenticated session. The mock constants imply a max size of 1000 bytes for this test.
    mockAuth.mockResolvedValue(createMockSession());

    // Act: Call the server action with a file size exceeding the implicit limit (1001 B).
    const result = await createUpload({
      fileName: "test.jpg",
      fileSize: 1001,
      fileType: "image/jpeg",
      caseId: "case",
    });

    // Assert: Check for overall failure and generic "Invalid input" error message.
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid input");
    // Assert: Check that validation details for `fileSize` are present.
    expect(result.details?.fileSize).toBeDefined();
    // Assert: Check that the file size error message contains the expected size limit text.
    expect(result.details?.fileSize?.[0]).toContain("File is too large");
  });

  /**
   * Test case to verify that the action rejects file types that are not in the `ACCEPTED_IMAGE_TYPES` list.
   */
  it("returns error if file type is not permitted", async () => {
    // Arrange: Mock authenticated session.
    mockAuth.mockResolvedValue(createMockSession());

    // Act: Call the server action with an unsupported file MIME type.
    const result = await createUpload({
      fileName: "test.pdf",
      fileSize: 500,
      fileType: "application/pdf" as unknown as "image/jpeg",
      caseId: "case",
    });

    // Assert: Check for overall failure and generic "Invalid input" error message.
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid input");
  });

  /**
   * Test case to verify that the action rejects file names where the extension does not correspond to the provided MIME type.
   */
  it("returns error if extension does not match file type", async () => {
    // Arrange: Mock authenticated session.
    mockAuth.mockResolvedValue(createMockSession());

    // Act: Call the server action using `image/jpeg` type but a `.png` extension.
    const result = await createUpload({
      fileName: "test.png",
      fileSize: 500,
      fileType: "image/jpeg",
      caseId: "case",
    });

    // Assert: Check for failure and verify the specific error message regarding the mismatch.
    expect(result.success).toBe(false);
    expect(result.error).toContain('does not match the file extension ".png"');
  });

  /**
   * Test case to verify the successful generation of a pre-signed URL, including key construction.
   */
  it("generates presigned URL successfully with new key", async () => {
    // Arrange: Mock authenticated session and mock successful URL generation.
    mockAuth.mockResolvedValue(createMockSession("user"));
    vi.mocked(getSignedUrl).mockResolvedValue("https://presigned-url.com");

    // Act: Call the server action with valid input.
    const result = await createUpload({
      fileName: "Mortiscope Image.jpg",
      fileSize: 500,
      fileType: "image/jpeg",
      caseId: "case",
    });

    // Arrange: Define the expected S3 object key structure, including the user ID, case ID, sanitized file name, CUID, and extension.
    const expectedKey = "uploads/user/case/Mortiscope-Image-cuid-123.jpg";

    // Assert: Check that the `PutObjectCommand` was initialized with the correct parameters for S3.
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: expect.any(String),
        Key: expectedKey,
        ContentType: "image/jpeg",
        ContentLength: 500,
        Metadata: {
          userId: "user",
          caseId: "case",
        },
      })
    );

    // Assert: Check that `getSignedUrl` was called to convert the command into a URL.
    expect(getSignedUrl).toHaveBeenCalled();
    // Assert: Check that the final result contains the success status, the generated URL, and the constructed key.
    expect(result).toEqual({
      success: true,
      data: {
        url: "https://presigned-url.com",
        key: expectedKey,
      },
    });
  });

  /**
   * Test case to verify that an existing S3 key is used for the `PutObjectCommand` if provided in the input.
   */
  it("uses existing key if provided", async () => {
    // Arrange: Mock authenticated session and successful URL generation.
    mockAuth.mockResolvedValue(createMockSession("user"));
    vi.mocked(getSignedUrl).mockResolvedValue("https://presigned-url.com");

    // Arrange: Define a specific existing key.
    const existingKey = "uploads/user/case/existing-file.jpg";

    // Act: Call the server action providing the `key` argument.
    const result = await createUpload({
      fileName: "test.jpg",
      fileSize: 500,
      fileType: "image/jpeg",
      caseId: "case",
      key: existingKey,
    });

    // Assert: Check that `PutObjectCommand` was initialized using the provided existing key instead of generating a new one.
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Key: existingKey,
      })
    );

    // Assert: Check that the response data contains the original existing key.
    expect(result.data?.key).toBe(existingKey);
  });

  /**
   * Test case to verify that S3 failures are logged internally and a generic error message is returned to the client.
   */
  it("logs error and returns generic message on S3 failure", async () => {
    // Arrange: Mock authenticated session.
    mockAuth.mockResolvedValue(createMockSession("user"));
    // Arrange: Define a mock error thrown by the S3 URL generation process.
    const s3Error = new Error("AWS Error");
    vi.mocked(getSignedUrl).mockRejectedValue(s3Error);

    // Act: Call the server action.
    const result = await createUpload({
      fileName: "test.jpg",
      fileSize: 500,
      fileType: "image/jpeg",
      caseId: "case",
    });

    // Assert: Check that the internal `logError` function was called to record the AWS failure.
    expect(logError).toHaveBeenCalled();
    // Assert: Check that the client received the generic, user-friendly error message.
    expect(result).toEqual({
      success: false,
      error: "An internal server error occurred while preparing the upload.",
    });
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
      await expect(import("@/features/upload/actions/create-upload")).rejects.toThrow(
        "Missing required AWS environment variable: AWS_BUCKET_NAME"
      );
    });
  });
});
