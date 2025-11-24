import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockIds, mockUploads } from "@/__tests__/mocks/fixtures";
import {
  getImageUrl,
  getImageUrls,
  getProfileImageUrl,
} from "@/features/images/actions/get-image-url";
import { PRESIGNED_GET_EXPIRY_PROFILE } from "@/lib/constants";

// Mock the S3 client to prevent actual AWS SDK network requests during tests.
vi.mock("@aws-sdk/client-s3", () => ({
  GetObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
}));

// Mock the S3 request presigner to control the generation of signed URLs.
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

// Mock the internal AWS library to provide a stable reference for the S3 client.
vi.mock("@/lib/aws", () => ({
  s3: {},
}));

// Mock the environment variables to provide a consistent S3 bucket name.
vi.mock("@/lib/env", () => ({
  env: {
    AWS_BUCKET_NAME: "mortiscope-test",
  },
}));

/**
 * Integration test suite for image URL generation logic.
 */
describe("get-image-url (integration)", () => {
  /**
   * Resets all mocks before each test case to ensure a clean state.
   */
  beforeEach(() => {
    // Arrange: Clear the call history of all mocked functions.
    vi.clearAllMocks();
  });

  /**
   * Test suite for the getImageUrl function.
   */
  describe("getImageUrl", () => {
    /**
     * Verifies that the function generates a correct local proxy route.
     */
    it("returns the proxy route URL for a given imageId", () => {
      // Arrange: Define the specific `imageId` for testing.
      const imageId = mockIds.firstUpload;

      // Act: Generate the proxy URL using the `getImageUrl` function.
      const result = getImageUrl(imageId);

      // Assert: Verify the result matches the expected API route format.
      expect(result).toBe(`/api/images/${imageId}`);
    });

    /**
     * Verifies that the function correctly processes different ID strings.
     */
    it("handles any arbitrary imageId string", () => {
      // Arrange: Define an alternative `imageId` for testing.
      const imageId = mockIds.secondUpload;

      // Act: Generate the proxy URL using the `getImageUrl` function.
      const result = getImageUrl(imageId);

      // Assert: Verify the result matches the expected API route format.
      expect(result).toBe(`/api/images/${imageId}`);
    });
  });

  /**
   * Test suite for the getImageUrls function.
   */
  describe("getImageUrls", () => {
    /**
     * Verifies that providing no IDs results in an empty object.
     */
    it("returns an empty record for an empty array", () => {
      // Act: Invoke the function with an empty array.
      const result = getImageUrls([]);

      // Assert: Verify that an empty object is returned.
      expect(result).toEqual({});
    });

    /**
     * Verifies that a single ID results in a single-entry map.
     */
    it("returns a single-entry record for one imageId", () => {
      // Arrange: Define the `imageId` to be mapped.
      const imageId = mockIds.firstUpload;

      // Act: Map the single ID to its proxy URL.
      const result = getImageUrls([imageId]);

      // Assert: Verify the record contains the correct key-value pair.
      expect(result).toEqual({ [imageId]: `/api/images/${imageId}` });
    });

    /**
     * Verifies that multiple IDs are all correctly mapped to their proxy routes.
     */
    it("maps every imageId to its proxy URL", () => {
      // Arrange: Define a list of multiple `imageIds`.
      const imageIds = [mockIds.firstUpload, mockIds.secondUpload, mockIds.thirdUpload];

      // Act: Map the array of IDs to their proxy URLs.
      const result = getImageUrls(imageIds);

      // Assert: Verify the resulting object contains all expected mappings.
      expect(result).toEqual({
        [mockIds.firstUpload]: `/api/images/${mockIds.firstUpload}`,
        [mockIds.secondUpload]: `/api/images/${mockIds.secondUpload}`,
        [mockIds.thirdUpload]: `/api/images/${mockIds.thirdUpload}`,
      });
    });

    /**
     * Verifies that the output size corresponds exactly to the input size.
     */
    it("produces a record whose key count matches the input array length", () => {
      // Arrange: Prepare an array of IDs for mapping.
      const imageIds = [mockIds.firstUpload, mockIds.secondUpload, mockIds.thirdUpload];

      // Act: Execute the mapping logic.
      const result = getImageUrls(imageIds);

      // Assert: Confirm the total number of keys in the result is correct.
      expect(Object.keys(result)).toHaveLength(imageIds.length);
    });
  });

  /**
   * Test suite for the getProfileImageUrl function.
   */
  describe("getProfileImageUrl", () => {
    /**
     * Verifies that null inputs result in null outputs without S3 interaction.
     */
    it("returns null when keyOrUrl is null", async () => {
      // Act: Pass `null` to the profile image retrieval function.
      const result = await getProfileImageUrl(null);

      // Assert: Verify the result is `null`.
      expect(result).toBeNull();

      // Assert: Confirm that `getSignedUrl` was not invoked.
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      expect(vi.mocked(getSignedUrl)).not.toHaveBeenCalled();
    });

    /**
     * Verifies that empty strings result in null outputs.
     */
    it("returns null when keyOrUrl is an empty string", async () => {
      // Act: Pass an empty string to the profile image retrieval function.
      const result = await getProfileImageUrl("");

      // Assert: Verify the result is `null`.
      expect(result).toBeNull();
    });

    /**
     * Verifies that raw S3 keys are correctly used to generate signed URLs.
     */
    it("uses a raw S3 key directly when the input does not start with http", async () => {
      // Arrange: Define the raw S3 key and the expected signed URL response.
      const rawKey = `profile-images/${mockIds.firstUser}/avatar.jpg`;
      const presignedUrl =
        `https://mortiscope-test.s3.ap-southeast-1.amazonaws.com/${rawKey}` +
        `?X-Amz-Algorithm=AWS4-HMAC-SHA256` +
        `&X-Amz-Credential=AKIAIOSFODNN7V273XJA%2F20250101%2Fap-southeast-1%2Fs3%2Faws4_request` +
        `&X-Amz-Date=20250101T120000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host` +
        `&X-Amz-Signature=d5e9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9`;

      // Arrange: Configure the mocked signed URL provider.
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      vi.mocked(getSignedUrl).mockResolvedValue(presignedUrl);

      // Act: Retrieve the profile image URL for the raw key.
      const result = await getProfileImageUrl(rawKey);

      // Assert: Verify the returned URL matches the mock value.
      expect(result).toBe(presignedUrl);

      // Assert: Confirm the `GetObjectCommand` was initialized with the correct `Bucket` and `Key`.
      expect(vi.mocked(GetObjectCommand)).toHaveBeenCalledWith({
        Bucket: "mortiscope-test",
        Key: rawKey,
      });

      // Assert: Confirm the signed URL request used the correct `expiresIn` value.
      expect(vi.mocked(getSignedUrl)).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: PRESIGNED_GET_EXPIRY_PROFILE,
      });
    });

    /**
     * Verifies that keys are successfully parsed from full legacy S3 URLs.
     */
    it("extracts the S3 key from a legacy full S3 URL", async () => {
      // Arrange: Define the legacy URL and the key that should be extracted.
      const legacyUrl = mockUploads.firstUpload.url;
      const expectedKey = mockUploads.firstUpload.key;
      const presignedUrl =
        `https://mortiscope-test.s3.ap-southeast-1.amazonaws.com/${expectedKey}` +
        `?X-Amz-Algorithm=AWS4-HMAC-SHA256` +
        `&X-Amz-Credential=AKIAJS7SFODNN7P09QW%2F20250101%2Fap-southeast-1%2Fs3%2Faws4_request` +
        `&X-Amz-Date=20250101T120530Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host` +
        `&X-Amz-Signature=f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2`;

      // Arrange: Set up mock resolutions for the S3 operations.
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      vi.mocked(getSignedUrl).mockResolvedValue(presignedUrl);

      // Act: Retrieve the profile image URL using the legacy URL.
      const result = await getProfileImageUrl(legacyUrl);

      // Assert: Verify that the correct S3 key was passed to the `GetObjectCommand`.
      expect(vi.mocked(GetObjectCommand)).toHaveBeenCalledWith({
        Bucket: "mortiscope-test",
        Key: expectedKey,
      });
      // Assert: Verify the result is the newly generated signed URL.
      expect(result).toBe(presignedUrl);
    });

    /**
     * Verifies that external GitHub avatar URLs are returned without modifying them.
     */
    it("returns an OAuth provider URL unchanged without calling S3", async () => {
      // Arrange: Define an external GitHub image URL.
      const oauthUrl = "https://avatars.githubusercontent.com/u/12345678?v=4";

      // Arrange: Reference the mock for `getSignedUrl`.
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

      // Act: Process the external URL.
      const result = await getProfileImageUrl(oauthUrl);

      // Assert: Verify the URL remains unchanged.
      expect(result).toBe(oauthUrl);

      // Assert: Confirm that no S3 interaction occurred.
      expect(vi.mocked(getSignedUrl)).not.toHaveBeenCalled();
    });

    /**
     * Verifies that external Google avatar URLs are returned without modifying them.
     */
    it("returns a Google OAuth URL unchanged without calling S3", async () => {
      // Arrange: Define an external Google image URL.
      const googleUrl = "https://lh3.googleusercontent.com/a/profile-photo";

      // Arrange: Reference the mock for `getSignedUrl`.
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");

      // Act: Process the external URL.
      const result = await getProfileImageUrl(googleUrl);

      // Assert: Verify the URL remains unchanged.
      expect(result).toBe(googleUrl);
      // Assert: Confirm that no S3 interaction occurred.
      expect(vi.mocked(getSignedUrl)).not.toHaveBeenCalled();
    });

    /**
     * Verifies that the 24-hour expiry time is correctly applied to S3 requests.
     */
    it("requests a presigned URL with the 24-hour expiry constant", async () => {
      // Arrange: Define the raw S3 key and the expected output URL.
      const rawKey = `profile-images/${mockIds.secondUser}/headshot.jpg`;
      const presignedUrl =
        `https://mortiscope-test.s3.ap-southeast-1.amazonaws.com/${rawKey}` +
        `?X-Amz-Algorithm=AWS4-HMAC-SHA256` +
        `&X-Amz-Credential=AKIAIOSFODNN7R456T%2F20250101%2Fap-southeast-1%2Fs3%2Faws4_request` +
        `&X-Amz-Date=20250101T121000Z&X-Amz-Expires=86400&X-Amz-SignedHeaders=host` +
        `&X-Amz-Signature=e3b8c2d1a0f9e8d7c6b5a4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3`;

      // Arrange: Mock the resolution of the signed URL.
      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      vi.mocked(getSignedUrl).mockResolvedValue(presignedUrl);

      // Act: Invoke the profile image retrieval.
      await getProfileImageUrl(rawKey);

      // Assert: Confirm that the `expiresIn` parameter was set to 86400 seconds.
      expect(vi.mocked(getSignedUrl)).toHaveBeenCalledWith(expect.anything(), expect.anything(), {
        expiresIn: 86400,
      });
    });
  });
});
