import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { getRecentExports } from "@/features/export/actions/get-recent-exports";

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
        findMany: vi.fn(),
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
 * Test suite for the `getRecentExports` server action.
 */
describe("getRecentExports", () => {
  // Define mock data constants for use across tests.
  const mockUserId = "user-123";
  const mockSignedUrl = "https://s3.amazonaws.com/mortiscope-test-bucket/export.pdf?signature=xyz";

  // Reset all mocks before each test to ensure test isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that an empty array is returned when the user is not authenticated.
   */
  it("returns an empty array if the user is not authenticated", async () => {
    // Arrange: Mock the auth function to return null.
    vi.mocked(auth).mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);

    // Act: Call the getRecentExports action.
    const result = await getRecentExports();

    // Assert: Check that the result is an empty array and the database was not queried.
    expect(result).toEqual([]);
    expect(db.query.exports.findMany).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that an empty array is returned when no exports exist in the database.
   */
  it("returns an empty array if no recent exports are found", async () => {
    // Arrange: Mock an authenticated user and an empty database response.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);
    vi.mocked(db.query.exports.findMany).mockResolvedValue([]);

    // Act: Call the getRecentExports action.
    const result = await getRecentExports();

    // Assert: Check that the result is an empty array.
    expect(result).toEqual([]);
  });

  /**
   * Test case to verify that pending and processing exports are returned without signed URLs.
   */
  it("returns pending and processing exports without URLs", async () => {
    // Arrange: Mock an authenticated user and exports with incomplete statuses.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);
    const mockExports = [
      { id: "1", status: "pending", s3Key: null, failureReason: null },
      { id: "2", status: "processing", s3Key: null, failureReason: null },
    ];
    vi.mocked(db.query.exports.findMany).mockResolvedValue(
      mockExports as unknown as Awaited<ReturnType<typeof db.query.exports.findMany>>
    );

    // Act: Call the getRecentExports action.
    const result = await getRecentExports();

    // Assert: Verify that the returned objects match the mock data and no URL generation occurred.
    expect(result).toEqual([
      { id: "1", status: "pending", failureReason: null },
      { id: "2", status: "processing", failureReason: null },
    ]);
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that signed URLs are generated for completed exports.
   */
  it("generates signed URLs for completed exports", async () => {
    // Arrange: Mock an authenticated user, a completed export, and the signed URL generator.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);
    const mockExports = [
      { id: "3", status: "completed", s3Key: "exports/report.pdf", failureReason: null },
    ];
    vi.mocked(db.query.exports.findMany).mockResolvedValue(
      mockExports as unknown as Awaited<ReturnType<typeof db.query.exports.findMany>>
    );
    vi.mocked(getSignedUrl).mockResolvedValue(mockSignedUrl);

    // Act: Call the getRecentExports action.
    const result = await getRecentExports();

    // Assert: Verify S3 command initialization, URL generation, and the final result structure.
    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: "mortiscope-test-bucket",
      Key: "exports/report.pdf",
    });
    expect(getSignedUrl).toHaveBeenCalled();
    expect(result).toEqual([{ id: "3", status: "completed", url: mockSignedUrl }]);
  });

  /**
   * Test case to verify that completed exports missing an S3 key are handled without errors.
   */
  it("handles completed exports missing s3 keys gracefully", async () => {
    // Arrange: Mock an authenticated user and a completed export with a null S3 key.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);
    const mockExports = [{ id: "4", status: "completed", s3Key: null, failureReason: null }];
    vi.mocked(db.query.exports.findMany).mockResolvedValue(
      mockExports as unknown as Awaited<ReturnType<typeof db.query.exports.findMany>>
    );

    // Act: Call the getRecentExports action.
    const result = await getRecentExports();

    // Assert: Verify that the result is returned without a URL and URL generation was skipped.
    expect(result).toEqual([{ id: "4", status: "completed", failureReason: null }]);
    expect(getSignedUrl).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that the function correctly processes a mix of export statuses.
   */
  it("handles a mix of pending, processing, and completed exports", async () => {
    // Arrange: Mock an authenticated user and a list containing both pending and completed exports.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);
    const mockExports = [
      { id: "1", status: "pending", s3Key: null, failureReason: null },
      { id: "2", status: "completed", s3Key: "exports/report.pdf", failureReason: null },
    ];
    vi.mocked(db.query.exports.findMany).mockResolvedValue(
      mockExports as unknown as Awaited<ReturnType<typeof db.query.exports.findMany>>
    );
    vi.mocked(getSignedUrl).mockResolvedValue(mockSignedUrl);

    // Act: Call the getRecentExports action.
    const result = await getRecentExports();

    // Assert: Verify that URLs are generated only for the completed items.
    expect(result).toEqual([
      { id: "1", status: "pending", failureReason: null },
      { id: "2", status: "completed", url: mockSignedUrl },
    ]);
  });
});
