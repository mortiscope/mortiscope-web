import { describe, expect, it } from "vitest";

import { deleteUploadSchema, generatePresignedUrlSchema } from "@/features/upload/schemas/upload";
import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";

/**
 * Test suite covering all Zod schemas related to the file upload feature.
 */
describe("Upload Schemas", () => {
  /**
   * Test suite for the `generatePresignedUrlSchema` to validate parameters required to request a pre-signed S3 URL.
   */
  describe("generatePresignedUrlSchema", () => {
    /**
     * Test case to verify that input with all valid properties passes validation.
     */
    it("validates correct input", () => {
      // Act: Attempt to parse a valid object.
      const result = generatePresignedUrlSchema.safeParse({
        fileName: "test.png",
        fileSize: 500,
        fileType: "image/png",
      });
      // Assert: The parsing operation must succeed.
      expect(result.success).toBe(true);
    });

    /**
     * Test case to verify that validation fails when the `fileName` field is an empty string.
     */
    it("fails when fileName is empty", () => {
      // Act: Attempt to parse an object where `fileName` is empty.
      const result = generatePresignedUrlSchema.safeParse({
        fileName: "",
        fileSize: 500,
        fileType: "image/png",
      });
      // Assert: The parsing operation must fail.
      expect(result.success).toBe(false);
      // Assert: Check that the error message corresponds to the required non-empty file name.
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("File name cannot be empty.");
      }
    });

    /**
     * Test case to verify that validation fails when `fileSize` is non-positive.
     */
    it("fails when fileSize is 0 or negative", () => {
      // Act: Attempt to parse an object where `fileSize` is zero.
      const result = generatePresignedUrlSchema.safeParse({
        fileName: "test.png",
        fileSize: 0,
        fileType: "image/png",
      });
      // Assert: The parsing operation must fail.
      expect(result.success).toBe(false);
      // Assert: Check that the error message corresponds to the empty file size validation rule.
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("File cannot be empty.");
      }
    });

    /**
     * Test case to verify that validation fails when `fileSize` exceeds the configured maximum limit.
     */
    it("fails when fileSize exceeds the configured limit", () => {
      // Arrange: Define the maximum file size limit.
      const limit = MAX_FILE_SIZE;
      // Act: Attempt to parse an object where `fileSize` is one byte over the limit.
      const result = generatePresignedUrlSchema.safeParse({
        fileName: "test.png",
        fileSize: limit + 1,
        fileType: "image/png",
      });

      // Assert: The parsing operation must fail.
      expect(result.success).toBe(false);
      // Assert: Check that the error message correctly reports the size constraint using the formatted byte limit.
      if (!result.success) {
        const expectedMessage = `File is too large (max ${formatBytes(limit)}).`;
        expect(result.error.issues[0].message).toBe(expectedMessage);
      }
    });

    /**
     * Test case to verify that validation fails when `fileType` is not one of the allowed MIME types.
     */
    it("fails when fileType is not supported", () => {
      // Act: Attempt to parse an object with an unsupported file type, like "application/pdf".
      const result = generatePresignedUrlSchema.safeParse({
        fileName: "test.pdf",
        fileSize: 500,
        fileType: "application/pdf",
      });
      // Assert: The parsing operation must fail.
      expect(result.success).toBe(false);
      // Assert: Check that the error message corresponds to the file type constraint.
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("File type is not supported.");
      }
    });

    /**
     * Test case to ensure that every configured MIME type in `ACCEPTED_IMAGE_TYPES` passes validation.
     */
    it("accepts all configured image types", () => {
      // Arrange: Get an array of all supported MIME types.
      const supportedTypes = Object.keys(ACCEPTED_IMAGE_TYPES);

      // Act & Assert: Iterate through all supported types and ensure validation passes for each one.
      supportedTypes.forEach((type) => {
        const result = generatePresignedUrlSchema.safeParse({
          fileName: "test.img",
          fileSize: 500,
          fileType: type,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  /**
   * Test suite for the `deleteUploadSchema`, which validates parameters required to delete an S3 object.
   */
  describe("deleteUploadSchema", () => {
    /**
     * Test case to verify that input with a non-empty `key` passes validation.
     */
    it("validates correct input", () => {
      // Act: Attempt to parse an object with a valid S3 object key.
      const result = deleteUploadSchema.safeParse({
        key: "some-unique-key",
      });
      // Assert: The parsing operation must succeed.
      expect(result.success).toBe(true);
    });

    /**
     * Test case to verify that validation fails when the S3 object `key` is an empty string.
     */
    it("fails when key is empty", () => {
      // Act: Attempt to parse an object where `key` is empty.
      const result = deleteUploadSchema.safeParse({
        key: "",
      });
      // Assert: The parsing operation must fail.
      expect(result.success).toBe(false);
      // Assert: Check that the error message corresponds to the required non-empty key constraint.
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("S3 object key cannot be empty.");
      }
    });
  });
});
