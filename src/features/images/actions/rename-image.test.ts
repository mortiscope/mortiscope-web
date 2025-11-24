import {
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type HeadObjectOutput,
} from "@aws-sdk/client-s3";
import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { renameImage } from "@/features/images/actions/rename-image";
import { s3 } from "@/lib/aws";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database module to control query responses and updates.
vi.mock("@/db", () => ({
  db: {
    query: {
      uploads: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
  },
}));

// Mock the S3 library wrapper to intercept send calls.
vi.mock("@/lib/aws", () => ({
  s3: { send: vi.fn() },
}));

// Mock the AWS SDK S3 client commands to track usage without making network requests.
vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  return {
    ...actual,
    HeadObjectCommand: vi.fn(),
    CopyObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
  };
});

// Helper function to mock the chainable database update method.
const mockDbUpdate = () => {
  const where = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn().mockReturnValue({ where });

  vi.mocked(db.update).mockReturnValue({ set } as unknown as ReturnType<typeof db.update>);

  return { set, where };
};

// Define common mock data for tests.
const mockUser = { id: "user-1" };
const mockImageId = "img-123";
const mockCaseId = "case-abc";
const mockOriginalKey = "cases/case-abc/original-image.jpg";

type UploadRecord = typeof uploads.$inferSelect;

// Groups tests for the renameImage server action functionality.
describe("renameImage", () => {
  // Reset all mocks before every test to ensure isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that an unauthorized error is returned if the user is not logged in.
   */
  it("returns unauthorized error if not logged in", async () => {
    // Arrange: Mock the authentication to return null (no session).
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to execute the action without a user session.
    const result = await renameImage({ imageId: mockImageId, newName: "new-name" });

    // Assert: Verify the response contains the specific unauthorized error message.
    expect(result).toEqual({ success: false, error: "Unauthorized. Please sign in." });
  });

  /**
   * Test case to verify that a validation error is returned if the input parameters are invalid.
   */
  it("returns validation error if input is invalid", async () => {
    // Arrange: Mock a valid user session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: mockUser } as Session);

    // Act: Call the action with empty strings for required fields.
    const result = await renameImage({ imageId: "", newName: "" });

    // Assert: Verify the validation failure and error message.
    expect(result.success).toBe(false);
    expect(result.error).toContain("required");
  });

  /**
   * Test case to verify that an error is returned if the image does not exist or belongs to another user.
   */
  it("returns error if image not found or access denied", async () => {
    // Arrange: Mock session and simulate image lookup returning undefined.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: mockUser } as Session);
    vi.mocked(db.query.uploads.findFirst).mockResolvedValue(undefined);

    // Act: Call the action for a non-existent image.
    const result = await renameImage({ imageId: mockImageId, newName: "new-name" });

    // Assert: Verify the error message indicates lack of permission or existence.
    expect(result.error).toContain("do not have permission");
  });

  /**
   * Test case to verify that an error is returned if the image is orphaned (not associated with a case).
   */
  it("returns error if image is not associated with a case", async () => {
    // Arrange: Mock session and simulate finding an image with a null `caseId`.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: mockUser } as Session);
    vi.mocked(db.query.uploads.findFirst).mockResolvedValue({
      id: mockImageId,
      userId: mockUser.id,
      key: "orphaned/file.jpg",
      caseId: null,
    } as unknown as UploadRecord);

    // Act: Call the action on an orphaned image.
    const result = await renameImage({ imageId: mockImageId, newName: "new-name" });

    // Assert: Verify the error message indicates the image is not part of a case.
    expect(result.error).toContain("not part of a case");
  });

  /**
   * Test case to verify that the action returns success immediately if the new name matches the current name.
   */
  it("returns success immediately if new name equals old name", async () => {
    // Arrange: Mock session and simulate finding an image where the path matches the requested new name.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: mockUser } as Session);
    vi.mocked(db.query.uploads.findFirst).mockResolvedValue({
      id: mockImageId,
      key: "path/to/same-name.jpg",
      caseId: mockCaseId,
    } as unknown as UploadRecord);

    // Act: Call the action with a name that results in no effective change.
    const result = await renameImage({ imageId: mockImageId, newName: "same-name.jpg" });

    // Assert: Verify success is returned without triggering any S3 operations.
    expect(result).toEqual({ success: true });
    expect(s3.send).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that an error is returned if a file with the requested name already exists in the same case.
   */
  it("returns error if a file with the new name already exists in the case", async () => {
    // Arrange: Mock session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: mockUser } as Session);

    // Arrange: Mock `findFirst` to return the original image first, then an existing image colliding with the new name.
    vi.mocked(db.query.uploads.findFirst)
      .mockResolvedValueOnce({
        id: mockImageId,
        key: mockOriginalKey,
        caseId: mockCaseId,
      } as unknown as UploadRecord)
      .mockResolvedValueOnce({
        id: "existing-img",
      } as unknown as UploadRecord);

    // Act: Call the action with a name that duplicates an existing file.
    const result = await renameImage({ imageId: mockImageId, newName: "duplicate-name" });

    // Assert: Verify the error message warns about the duplicate file.
    expect(result.error).toContain("already exists in this case");
    expect(s3.send).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify the full successful rename flow: S3 Copy, S3 Delete, and Database Update.
   */
  it("successfully renames file (S3 Copy -> S3 Delete -> DB Update)", async () => {
    // Arrange: Mock session and setup database update mock.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: mockUser } as Session);
    const { set } = mockDbUpdate();

    // Arrange: Mock finding the original image and ensure no duplicate exists (second call returns undefined).
    vi.mocked(db.query.uploads.findFirst)
      .mockResolvedValueOnce({
        id: mockImageId,
        key: mockOriginalKey,
        caseId: mockCaseId,
      } as unknown as UploadRecord)
      .mockResolvedValueOnce(undefined);

    // Arrange: Mock S3 responses for HeadObject (success) and subsequent commands.
    (vi.mocked(s3.send) as unknown as Mock).mockResolvedValueOnce({
      Metadata: { "content-type": "image/jpeg" },
    } as unknown as HeadObjectOutput);

    (vi.mocked(s3.send) as unknown as Mock).mockResolvedValueOnce(undefined);
    (vi.mocked(s3.send) as unknown as Mock).mockResolvedValueOnce(undefined);

    const newName = "New Name!";
    const expectedSanitizedName = "New-Name-.jpg";
    const expectedNewKey = "cases/case-abc/New-Name-.jpg";

    // Act: Execute the rename action with a name requiring sanitization.
    const result = await renameImage({ imageId: mockImageId, newName: newName });

    // Assert: Verify S3 `HeadObject` was called to retrieve metadata.
    expect(HeadObjectCommand).toHaveBeenCalledWith({
      Bucket: "mortiscope-bucket",
      Key: mockOriginalKey,
    });

    // Assert: Verify S3 `CopyObject` was called with the correct source, destination, SSE, and metadata.
    expect(CopyObjectCommand).toHaveBeenCalledWith({
      Bucket: "mortiscope-bucket",
      CopySource: "mortiscope-bucket/" + mockOriginalKey,
      Key: expectedNewKey,
      Metadata: { "content-type": "image/jpeg" },
      MetadataDirective: "REPLACE",
      ServerSideEncryption: "AES256",
    });

    // Assert: Verify S3 `DeleteObject` was called to remove the old file.
    expect(DeleteObjectCommand).toHaveBeenCalledWith({
      Bucket: "mortiscope-bucket",
      Key: mockOriginalKey,
    });

    // Assert: Verify database update was called with the new key, name, and URL.
    expect(db.update).toHaveBeenCalled();
    expect(set).toHaveBeenCalledWith({
      name: expectedSanitizedName,
      key: expectedNewKey,
      url: expect.stringContaining(expectedNewKey),
    });

    // Assert: Verify the overall operation was successful and returned the new key.
    expect(result.success).toBe(true);
    expect(result.data?.newKey).toBe(expectedNewKey);
  });

  /**
   * Test case to verify that database errors are handled gracefully even after S3 operations succeed.
   */
  it("handles database errors gracefully after S3 operations", async () => {
    // Arrange: Mock session and simulate a database connection failure during update.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: mockUser } as Session);

    const { set } = mockDbUpdate();
    set.mockImplementation(() => {
      throw new Error("DB Connection Lost");
    });

    // Arrange: Mock finding the image and ensuring no duplicates.
    vi.mocked(db.query.uploads.findFirst)
      .mockResolvedValueOnce({
        id: mockImageId,
        key: mockOriginalKey,
        caseId: mockCaseId,
      } as unknown as UploadRecord)
      .mockResolvedValueOnce(undefined);

    // Arrange: Mock successful S3 responses.
    (vi.mocked(s3.send) as unknown as Mock).mockResolvedValueOnce({
      Metadata: {},
    } as unknown as HeadObjectOutput);

    (vi.mocked(s3.send) as unknown as Mock).mockResolvedValue(undefined);

    // Act: Call the action which will fail at the database step.
    const result = await renameImage({ imageId: mockImageId, newName: "valid-name" });

    // Assert: Verify the action catches the error and returns a formatted failure message.
    expect(result.success).toBe(false);
    expect(result.error).toContain("database error occurred");
  });

  /**
   * Test case to verify that unexpected system errors are caught and handled.
   */
  it("handles generic unexpected errors gracefully", async () => {
    // Arrange: Mock session and simulate a generic system failure during image lookup.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({ user: mockUser } as Session);

    vi.mocked(db.query.uploads.findFirst).mockRejectedValue(new Error("Unexpected System Fail"));

    // Act: Call the action.
    const result = await renameImage({ imageId: mockImageId, newName: "valid-name" });

    // Assert: Verify the internal server error message is returned.
    expect(result.success).toBe(false);
    expect(result.error).toContain("internal server error occurred");
  });
});
