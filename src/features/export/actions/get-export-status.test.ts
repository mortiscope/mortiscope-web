import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { getExportStatus } from "@/features/export/actions/get-export-status";

// Mock the AWS S3 client to prevent actual network requests during testing.
vi.mock("@aws-sdk/client-s3", () => ({
  GetObjectCommand: vi.fn(),
}));

// Mock the S3 presigner to simulate URL generation without AWS credentials.
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept and control query responses.
vi.mock("@/db", () => ({
  db: {
    query: {
      exports: {
        findFirst: vi.fn(),
      },
    },
  },
}));

// Mock the AWS library configuration.
vi.mock("@/lib/aws", () => ({
  s3: {},
}));

// Mock the application configuration to provide controlled environment variables.
vi.mock("@/lib/config", () => ({
  config: {
    aws: {
      s3BucketName: "mortiscope-test-bucket",
    },
  },
}));

/**
 * Test suite for the `getExportStatus` server action.
 */
describe("getExportStatus", () => {
  // Define mock data constants for use across tests.
  const mockUserId = "user-123";
  const mockExportId = "export-456";
  const mockSignedUrl = "https://s3.amazonaws.com/mortiscope-test-bucket/export.pdf?signature=xyz";

  // Reset all mocks before each test to ensure test isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that an error is thrown when the user is not authenticated.
   */
  it("throws an error if the user is not authenticated", async () => {
    // Arrange: Mock the auth function to return null indicating no session.
    vi.mocked(auth).mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);

    // Assert: Verify that the function call rejects with an "Unauthorized" error.
    await expect(getExportStatus({ exportId: mockExportId })).rejects.toThrow("Unauthorized");
  });

  /**
   * Test case to verify that an error is thrown when the session exists but lacks a user ID.
   */
  it("throws an error if the session exists but user ID is missing", async () => {
    // Arrange: Mock the auth function to return a session object without a user ID.
    vi.mocked(auth).mockResolvedValue({ user: {} } as unknown as Awaited<ReturnType<typeof auth>>);

    // Assert: Verify that the function call rejects with an "Unauthorized" error.
    await expect(getExportStatus({ exportId: mockExportId })).rejects.toThrow("Unauthorized");
  });

  /**
   * Test case to verify that null is returned when the requested export job is not found in the database.
   */
  it("returns null if the export job is not found", async () => {
    // Arrange: Mock an authenticated user and simulate the database returning undefined.
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId, email: "mortiscope@example.com" },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    vi.mocked(db.query.exports.findFirst).mockResolvedValue(undefined);

    // Act: Call the getExportStatus action.
    const result = await getExportStatus({ exportId: mockExportId });

    // Assert: Check that the result is null and the database findFirst method was called.
    expect(result).toBeNull();
    expect(db.query.exports.findFirst).toHaveBeenCalled();
  });

  /**
   * Test case to verify that status and failure reason are returned for failed jobs without generating a URL.
   */
  it("returns status and failure reason for pending or failed jobs without generating a URL", async () => {
    // Arrange: Mock an authenticated user and a failed export record.
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId, email: "mortiscope@example.com" },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    vi.mocked(db.query.exports.findFirst).mockResolvedValue({
      status: "failed",
      s3Key: null,
      failureReason: "Processing timeout",
    } as unknown as Awaited<ReturnType<typeof db.query.exports.findFirst>>);

    // Act: Call the getExportStatus action.
    const result = await getExportStatus({ exportId: mockExportId });

    // Assert: Verify the result matches the database record and no signed URL was requested.
    expect(result).toEqual({
      status: "failed",
      failureReason: "Processing timeout",
    });
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that a signed URL is generated and returned for completed export jobs.
   */
  it("generates a signed URL for completed export jobs", async () => {
    // Arrange: Mock an authenticated user, a completed export record, and the signed URL generator.
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId, email: "mortiscope@example.com" },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    vi.mocked(db.query.exports.findFirst).mockResolvedValue({
      status: "completed",
      s3Key: "exports/report.pdf",
      failureReason: null,
    } as unknown as Awaited<ReturnType<typeof db.query.exports.findFirst>>);
    vi.mocked(getSignedUrl).mockResolvedValue(mockSignedUrl);

    // Act: Call the getExportStatus action.
    const result = await getExportStatus({ exportId: mockExportId });

    // Assert: Verify that the S3 GetObjectCommand was initialized correctly and the URL is present in the result.
    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: "mortiscope-test-bucket",
      Key: "exports/report.pdf",
    });
    expect(getSignedUrl).toHaveBeenCalled();
    expect(result).toEqual({
      status: "completed",
      url: mockSignedUrl,
    });
  });

  /**
   * Test case to verify that no URL is generated if the job is completed but the S3 key is missing.
   */
  it("does not generate a URL if status is completed but s3Key is missing", async () => {
    // Arrange: Mock an authenticated user and a completed export record with a null s3Key.
    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId, email: "mortiscope@example.com" },
    } as unknown as Awaited<ReturnType<typeof auth>>);
    vi.mocked(db.query.exports.findFirst).mockResolvedValue({
      status: "completed",
      s3Key: null,
      failureReason: null,
    } as unknown as Awaited<ReturnType<typeof db.query.exports.findFirst>>);

    // Act: Call the getExportStatus action.
    const result = await getExportStatus({ exportId: mockExportId });

    // Assert: Verify that the status is returned without a URL and getSignedUrl was not called.
    expect(result).toEqual({
      status: "completed",
      failureReason: null,
    });
    expect(getSignedUrl).not.toHaveBeenCalled();
  });
});
