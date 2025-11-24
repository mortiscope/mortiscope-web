import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { describe, expect, it, vi } from "vitest";

import { mockIds, mockUploads } from "@/__tests__/mocks/fixtures";
import {
  getImageUrl,
  getImageUrls,
  getProfileImageUrl,
} from "@/features/images/actions/get-image-url";
import { PRESIGNED_GET_EXPIRY_PROFILE } from "@/lib/constants";

// Mock the S3 client command to intercept input parameters for assertion.
vi.mock("@aws-sdk/client-s3", () => ({
  GetObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
}));

// Mock the S3 request presigner to control generated URL output.
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

// Mock the AWS S3 client instance.
vi.mock("@/lib/aws", () => ({
  s3: {},
}));

// Mock environment variables to provide a consistent bucket name.
vi.mock("@/lib/env", () => ({
  env: {
    AWS_BUCKET_NAME: "mortiscope-test",
  },
}));

/**
 * Generates a mock presigned URL string for testing purposes.
 */
function makeFakePresignedUrl(key: string, credentialSuffix: string, sig: string): string {
  const encoded = encodeURIComponent(
    `AKIAI${credentialSuffix}%2F20250101%2Fap-southeast-1%2Fs3%2Faws4_request`
  );
  return (
    `https://mortiscope-test.s3.ap-southeast-1.amazonaws.com/${key}` +
    `?X-Amz-Algorithm=AWS4-HMAC-SHA256` +
    `&X-Amz-Credential=${encoded}` +
    `&X-Amz-Date=20250101T120000Z&X-Amz-Expires=${PRESIGNED_GET_EXPIRY_PROFILE}&X-Amz-SignedHeaders=host` +
    `&X-Amz-Signature=${sig}`
  );
}

/**
 * Test suite for the image URL utility functions.
 */
describe("get-image-url", () => {
  /**
   * Test group for the single image proxy URL generator.
   */
  describe("getImageUrl", () => {
    /**
     * Test case to verify the basic proxy route construction.
     */
    it("returns the proxy route URL for the given imageId", () => {
      // Arrange: Define the input `imageId` from mock fixtures.
      const imageId = mockIds.firstUpload;

      // Act: Generate the proxy URL.
      const result = getImageUrl(imageId);

      // Assert: Verify the string matches the expected API route format.
      expect(result).toBe(`/api/images/${imageId}`);
    });

    /**
     * Test case to verify consistent path construction across different IDs.
     */
    it("constructs the correct path for a different imageId", () => {
      // Arrange: Define a secondary input `imageId`.
      const imageId = mockIds.secondUpload;

      // Act: Generate the proxy URL.
      const result = getImageUrl(imageId);

      // Assert: Verify the resulting path remains correct.
      expect(result).toBe(`/api/images/${imageId}`);
    });
  });

  /**
   * Test group for the bulk image proxy URL mapping function.
   */
  describe("getImageUrls", () => {
    /**
     * Test case to verify behavior when provided an empty list.
     */
    it("returns an empty record for an empty input array", () => {
      // Assert: Ensure an empty array results in an empty object.
      expect(getImageUrls([])).toEqual({});
    });

    /**
     * Test case to verify mapping of a single ID in a collection.
     */
    it("maps a single imageId to its proxy URL", () => {
      // Arrange: Define a single `imageId`.
      const imageId = mockIds.firstUpload;

      // Act: Map the ID to a record.
      const result = getImageUrls([imageId]);

      // Assert: Verify the object key and value pair match.
      expect(result).toEqual({ [imageId]: `/api/images/${imageId}` });
    });

    /**
     * Test case to verify bulk mapping of multiple IDs.
     */
    it("maps every imageId to its proxy URL", () => {
      // Arrange: Define a list containing multiple `imageIds`.
      const imageIds = [mockIds.firstUpload, mockIds.secondUpload, mockIds.thirdUpload];

      // Act: Map the collection to a record.
      const result = getImageUrls(imageIds);

      // Assert: Verify all IDs are correctly mapped to their respective paths.
      expect(result).toEqual({
        [mockIds.firstUpload]: `/api/images/${mockIds.firstUpload}`,
        [mockIds.secondUpload]: `/api/images/${mockIds.secondUpload}`,
        [mockIds.thirdUpload]: `/api/images/${mockIds.thirdUpload}`,
      });
    });

    /**
     * Test case to verify the length of the resulting record.
     */
    it("produces a record with the same number of entries as the input array", () => {
      // Arrange: Define a list of `imageIds`.
      const imageIds = [mockIds.firstUpload, mockIds.secondUpload, mockIds.thirdUpload];

      // Act: Process the collection.
      const result = getImageUrls(imageIds);

      // Assert: Confirm the output object has the expected number of keys.
      expect(Object.keys(result)).toHaveLength(imageIds.length);
    });
  });

  /**
   * Test group for generating presigned profile image URLs.
   */
  describe("getProfileImageUrl", () => {
    /**
     * Test case to verify null handling for missing keys.
     */
    it("returns null when keyOrUrl is null", async () => {
      // Act: Execute the function with a `null` value.
      const result = await getProfileImageUrl(null);

      // Assert: Ensure result is `null` and no external calls are made.
      expect(result).toBeNull();
      expect(vi.mocked(getSignedUrl)).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify empty string handling.
     */
    it("returns null when keyOrUrl is an empty string", async () => {
      // Act: Execute the function with an empty string.
      const result = await getProfileImageUrl("");

      // Assert: Ensure result is `null` and no external calls are made.
      expect(result).toBeNull();
      expect(vi.mocked(getSignedUrl)).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify handling of direct S3 keys.
     */
    it("passes a raw S3 key directly to GetObjectCommand", async () => {
      // Arrange: Prepare a raw S3 `rawKey` and a fake presigned response.
      const rawKey = `profile-images/${mockIds.firstUser}/avatar.jpg`;
      const fakePresignedUrl = makeFakePresignedUrl(
        rawKey,
        "OSFODNN7V273XJA",
        "d5e9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9"
      );
      vi.mocked(getSignedUrl).mockResolvedValue(fakePresignedUrl);

      // Act: Request a URL using the raw key.
      const result = await getProfileImageUrl(rawKey);

      // Assert: Verify the S3 command and signing parameters are correct.
      expect(vi.mocked(GetObjectCommand)).toHaveBeenCalledWith({
        Bucket: "mortiscope-test",
        Key: rawKey,
      });

      expect(vi.mocked(getSignedUrl)).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: PRESIGNED_GET_EXPIRY_PROFILE,
      });

      expect(result).toBe(fakePresignedUrl);
    });

    /**
     * Test case to verify key extraction from legacy S3 URLs.
     */
    it("extracts the S3 key from a legacy amazonaws.com URL", async () => {
      // Arrange: Prepare a `legacyUrl` and the expected internal `expectedKey`.
      const legacyUrl = mockUploads.firstUpload.url;
      const expectedKey = mockUploads.firstUpload.key;
      const fakePresignedUrl = makeFakePresignedUrl(
        expectedKey,
        "JS7SFODNN7P09QW",
        "f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2"
      );
      vi.mocked(getSignedUrl).mockResolvedValue(fakePresignedUrl);

      // Act: Request a URL using the legacy format.
      const result = await getProfileImageUrl(legacyUrl);

      // Assert: Verify the extracted key is used for the S3 command.
      expect(vi.mocked(GetObjectCommand)).toHaveBeenCalledWith({
        Bucket: "mortiscope-test",
        Key: expectedKey,
      });
      expect(result).toBe(fakePresignedUrl);
    });

    /**
     * Test case to verify key extraction from different legacy S3 URL patterns.
     */
    it("extracts the S3 key correctly for a different legacy S3 URL", async () => {
      // Arrange: Prepare a secondary `legacyUrl` and `expectedKey`.
      const legacyUrl = mockUploads.secondUpload.url;
      const expectedKey = mockUploads.secondUpload.key;
      const fakePresignedUrl = makeFakePresignedUrl(
        expectedKey,
        "IOSFODNN7R456T2Z",
        "e3b8c2d1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3"
      );
      vi.mocked(getSignedUrl).mockResolvedValue(fakePresignedUrl);

      // Act: Request a URL using the secondary legacy format.
      const result = await getProfileImageUrl(legacyUrl);

      // Assert: Verify the S3 command receives the correct key.
      expect(vi.mocked(GetObjectCommand)).toHaveBeenCalledWith({
        Bucket: "mortiscope-test",
        Key: expectedKey,
      });
      expect(result).toBe(fakePresignedUrl);
    });

    /**
     * Test case to verify that external GitHub URLs are bypassed.
     */
    it("returns a GitHub avatar URL unchanged without calling S3", async () => {
      // Arrange: Define an external `githubAvatarUrl`.
      const githubAvatarUrl = `https://avatars.githubusercontent.com/u/${87654321}?v=4`;

      // Act: Request a URL using the GitHub address.
      const result = await getProfileImageUrl(githubAvatarUrl);

      // Assert: Verify the URL is returned as-is without S3 interaction.
      expect(result).toBe(githubAvatarUrl);
      expect(vi.mocked(getSignedUrl)).not.toHaveBeenCalled();
      expect(vi.mocked(GetObjectCommand)).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that external Google URLs are bypassed.
     */
    it("returns a Google OAuth URL unchanged without calling S3", async () => {
      // Arrange: Define an external `googleProfileUrl`.
      const googleProfileUrl = `https://lh3.googleusercontent.com/a/${mockIds.firstUser}`;

      // Act: Request a URL using the Google address.
      const result = await getProfileImageUrl(googleProfileUrl);

      // Assert: Verify the URL is returned as-is without S3 interaction.
      expect(result).toBe(googleProfileUrl);
      expect(vi.mocked(getSignedUrl)).not.toHaveBeenCalled();
      expect(vi.mocked(GetObjectCommand)).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify enforcement of the 24-hour expiry constant.
     */
    it("always requests a presigned URL with the 24-hour expiry constant", async () => {
      // Arrange: Prepare a `rawKey` and mock the signer response.
      const rawKey = `profile-images/${mockIds.secondUser}/avatar.jpg`;
      vi.mocked(getSignedUrl).mockResolvedValue(
        makeFakePresignedUrl(
          rawKey,
          "OSFODNN7R456T3Y",
          "c3b2a1f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1"
        )
      );

      // Act: Request the profile image URL.
      await getProfileImageUrl(rawKey);

      // Assert: Confirm the `expiresIn` value specifically matches 86400 seconds.
      expect(vi.mocked(getSignedUrl)).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: 86400,
      });
    });
  });
});
