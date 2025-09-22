import { createId } from "@paralleldrive/cuid2";
import { describe, expect, it } from "vitest";

import {
  requestImageExportSchema,
  requestResultsExportSchema,
  validatePasswordProtection,
} from "@/features/export/schemas/export";

/**
 * Test suite for validating export request schemas and utility functions.
 */
describe("Export Schemas", () => {
  /**
   * Tests for the password protection validation utility.
   */
  describe("validatePasswordProtection", () => {
    /**
     * Test case to verify that validation passes when protection is disabled.
     */
    it("returns true when protection is disabled", () => {
      // Assert: Check that validation returns true regardless of the password value.
      expect(validatePasswordProtection(false, "")).toBe(true);
      expect(validatePasswordProtection(false, "short")).toBe(true);
    });

    /**
     * Test case to verify that validation fails when protection is enabled but the password is invalid.
     */
    it("returns false when protection is enabled but password is too short", () => {
      // Assert: Check that validation returns false for short passwords when enabled.
      expect(validatePasswordProtection(true, "short")).toBe(false);
      expect(validatePasswordProtection(true, "1234567")).toBe(false);
    });

    /**
     * Test case to verify that validation passes when protection is enabled and the password is valid.
     */
    it("returns true when protection is enabled and password is valid", () => {
      // Assert: Check that validation returns true for valid passwords when enabled.
      expect(validatePasswordProtection(true, "secure-password")).toBe(true);
      expect(validatePasswordProtection(true, "12345678")).toBe(true);
    });
  });

  /**
   * Tests for the `requestResultsExportSchema` validation logic.
   */
  describe("requestResultsExportSchema", () => {
    // Generate a valid CUID for testing case ID validation.
    const validCaseId = createId();

    /**
     * Tests specific to the 'raw_data' export format.
     */
    describe("Format: raw_data", () => {
      /**
       * Test case to verify successful validation with minimal required fields.
       */
      it("validates successfully with minimal required fields", () => {
        // Arrange: Create a payload with only caseId and format.
        const payload = {
          caseId: validCaseId,
          format: "raw_data",
        };
        // Act: Parse the payload using the schema.
        const result = requestResultsExportSchema.safeParse(payload);
        // Assert: Verify that the validation was successful.
        expect(result.success).toBe(true);
      });

      /**
       * Test case to verify validation with valid password protection settings.
       */
      it("validates successfully with password protection enabled and valid password", () => {
        // Arrange: Create a payload with valid password protection details.
        const payload = {
          caseId: validCaseId,
          format: "raw_data",
          passwordProtection: {
            enabled: true,
            password: "strong-password",
          },
        };
        // Act: Parse the payload using the schema.
        const result = requestResultsExportSchema.safeParse(payload);
        // Assert: Verify that the validation was successful.
        expect(result.success).toBe(true);
      });

      /**
       * Test case to verify validation failure when password is too short.
       */
      it("fails validation if password protection is enabled but password is too short", () => {
        // Arrange: Create a payload with an invalid password.
        const payload = {
          caseId: validCaseId,
          format: "raw_data",
          passwordProtection: {
            enabled: true,
            password: "short",
          },
        };
        // Act: Parse the payload using the schema.
        const result = requestResultsExportSchema.safeParse(payload);
        // Assert: Verify that validation failed and the correct error message is returned.
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Password must be at least 8 characters.");
        }
      });
    });

    /**
     * Tests specific to the 'labelled_images' export format.
     */
    describe("Format: labelled_images", () => {
      /**
       * Test case to verify successful validation with a valid resolution.
       */
      it("validates successfully with valid resolution", () => {
        // Arrange: Create a payload with a valid resolution string.
        const payload = {
          caseId: validCaseId,
          format: "labelled_images",
          resolution: "1920x1080",
        };
        // Act: Parse the payload using the schema.
        const result = requestResultsExportSchema.safeParse(payload);
        // Assert: Verify that the validation was successful.
        expect(result.success).toBe(true);
      });

      /**
       * Test case to verify validation failure when resolution is missing.
       */
      it("fails validation if resolution is missing", () => {
        // Arrange: Create a payload missing the resolution field.
        const payload = {
          caseId: validCaseId,
          format: "labelled_images",
        };
        // Act: Parse the payload using the schema.
        const result = requestResultsExportSchema.safeParse(payload);
        // Assert: Verify that the validation failed.
        expect(result.success).toBe(false);
      });

      /**
       * Test case to verify validation failure when resolution format is invalid.
       */
      it("fails validation if resolution is invalid", () => {
        // Arrange: Create a payload with a malformed resolution string.
        const payload = {
          caseId: validCaseId,
          format: "labelled_images",
          resolution: "invalid-res",
        };
        // Act: Parse the payload using the schema.
        const result = requestResultsExportSchema.safeParse(payload);
        // Assert: Verify that the validation failed.
        expect(result.success).toBe(false);
      });
    });

    /**
     * Tests specific to the 'pdf' export format.
     */
    describe("Format: pdf", () => {
      /**
       * Test case to verify successful validation with standard security.
       */
      it("validates successfully with standard security (no password)", () => {
        // Arrange: Create a payload with standard security settings.
        const payload = {
          caseId: validCaseId,
          format: "pdf",
          pageSize: "a4",
          securityLevel: "standard",
        };
        // Act: Parse the payload using the schema.
        const result = requestResultsExportSchema.safeParse(payload);
        // Assert: Verify that the validation was successful.
        expect(result.success).toBe(true);
      });

      /**
       * Test case to verify successful validation with specific permissions.
       */
      it("validates successfully with permissions options", () => {
        // Arrange: Create a payload with detailed permissions settings.
        const payload = {
          caseId: validCaseId,
          format: "pdf",
          pageSize: "letter",
          securityLevel: "standard",
          permissions: {
            printing: true,
            copying: false,
            annotations: true,
            formFilling: true,
            assembly: false,
            extraction: false,
            pageRotation: true,
            degradedPrinting: false,
            screenReader: true,
            metadataModification: false,
          },
        };
        // Act: Parse the payload using the schema.
        const result = requestResultsExportSchema.safeParse(payload);
        // Assert: Verify that the validation was successful.
        expect(result.success).toBe(true);
      });

      /**
       * Test case to verify successful validation with protected security and a valid password.
       */
      it("validates successfully with protected security and valid password", () => {
        // Arrange: Create a payload with view_protected security and a strong password.
        const payload = {
          caseId: validCaseId,
          format: "pdf",
          pageSize: "a4",
          securityLevel: "view_protected",
          password: "strong-password",
        };
        // Act: Parse the payload using the schema.
        const result = requestResultsExportSchema.safeParse(payload);
        // Assert: Verify that the validation was successful.
        expect(result.success).toBe(true);
      });

      /**
       * Test case to verify validation failure when view_protected security is missing a password.
       */
      it("fails validation if security is view_protected but password is missing", () => {
        // Arrange: Create a payload with view_protected security but no password.
        const payload = {
          caseId: validCaseId,
          format: "pdf",
          pageSize: "a4",
          securityLevel: "view_protected",
        };
        // Act: Parse the payload using the schema.
        const result = requestResultsExportSchema.safeParse(payload);
        // Assert: Verify that validation failed and the correct error message is returned.
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Password must be at least 8 characters.");
        }
      });

      /**
       * Test case to verify validation failure when permissions_protected security has a weak password.
       */
      it("fails validation if security is permissions_protected but password is too short", () => {
        // Arrange: Create a payload with permissions_protected security and a short password.
        const payload = {
          caseId: validCaseId,
          format: "pdf",
          pageSize: "a4",
          securityLevel: "permissions_protected",
          password: "short",
        };
        // Act: Parse the payload using the schema.
        const result = requestResultsExportSchema.safeParse(payload);
        // Assert: Verify that the validation failed.
        expect(result.success).toBe(false);
      });
    });

    /**
     * Tests for common validation failures across formats.
     */
    describe("Common Failures", () => {
      /**
       * Test case to verify validation failure when the case ID format is invalid.
       */
      it("fails if caseId is invalid", () => {
        // Arrange: Create a payload with a clearly invalid ID string.
        const payload = {
          caseId: "invalid-id",
          format: "raw_data",
        };
        // Act: Parse the payload using the schema.
        const result = requestResultsExportSchema.safeParse(payload);
        // Assert: Verify that the validation failed.
        expect(result.success).toBe(false);
      });
    });
  });

  /**
   * Tests for the `requestImageExportSchema` validation logic.
   */
  describe("requestImageExportSchema", () => {
    // Generate a valid CUID for testing upload ID validation.
    const validUploadId = createId();

    /**
     * Tests specific to the 'raw_data' image export format.
     */
    describe("Format: raw_data", () => {
      /**
       * Test case to verify successful validation with minimal required fields.
       */
      it("validates successfully with minimal required fields", () => {
        // Arrange: Create a basic payload with uploadId and format.
        const payload = {
          uploadId: validUploadId,
          format: "raw_data",
        };
        // Act: Parse the payload using the schema.
        const result = requestImageExportSchema.safeParse(payload);
        // Assert: Verify that the validation was successful.
        expect(result.success).toBe(true);
      });

      /**
       * Test case to verify validation logic for password protection.
       */
      it("validates password protection logic correctly", () => {
        // Arrange: Create a payload with valid password protection settings.
        const payload = {
          uploadId: validUploadId,
          format: "raw_data",
          passwordProtection: {
            enabled: true,
            password: "strong-password",
          },
        };
        // Assert: Verify success for valid password.
        expect(requestImageExportSchema.safeParse(payload).success).toBe(true);

        // Arrange: Create a payload with invalid password protection settings.
        const invalidPayload = {
          ...payload,
          passwordProtection: {
            enabled: true,
            password: "short",
          },
        };
        // Assert: Verify failure for invalid password.
        expect(requestImageExportSchema.safeParse(invalidPayload).success).toBe(false);
      });
    });

    /**
     * Tests specific to the 'labelled_images' export format.
     */
    describe("Format: labelled_images", () => {
      /**
       * Test case to verify successful validation with a valid resolution.
       */
      it("validates successfully with valid resolution", () => {
        // Arrange: Create a payload with a valid resolution.
        const payload = {
          uploadId: validUploadId,
          format: "labelled_images",
          resolution: "1280x720",
        };
        // Act: Parse the payload using the schema.
        const result = requestImageExportSchema.safeParse(payload);
        // Assert: Verify that the validation was successful.
        expect(result.success).toBe(true);
      });

      /**
       * Test case to verify validation failure when resolution format is invalid.
       */
      it("fails if resolution is invalid", () => {
        // Arrange: Create a payload with an invalid resolution string.
        const payload = {
          uploadId: validUploadId,
          format: "labelled_images",
          resolution: "invalid",
        };
        // Act: Parse the payload using the schema.
        const result = requestImageExportSchema.safeParse(payload);
        // Assert: Verify that the validation failed.
        expect(result.success).toBe(false);
      });
    });
  });
});
