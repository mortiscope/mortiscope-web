import { createId } from "@paralleldrive/cuid2";
import { describe, expect, it } from "vitest";

import { DeleteSelectedCasesSchema } from "@/features/dashboard/schemas/dashboard";

/**
 * Test suite for the validation schema used when deleting selected dashboard cases.
 */
describe("DeleteSelectedCasesSchema", () => {
  /**
   * Test case to verify that a fully compliant data object passes validation.
   */
  it("validates a correct payload", () => {
    // Arrange: Create a valid payload with a password and generated `CUID2` identifiers.
    const validData = {
      currentPassword: "password123",
      caseIds: [createId(), createId()],
    };

    // Act: Parse the data using the Zod schema.
    const result = DeleteSelectedCasesSchema.safeParse(validData);

    // Assert: Verify that the validation result indicates success.
    expect(result.success).toBe(true);
  });

  /**
   * Test case to ensure that an empty password string triggers a validation error.
   */
  it("fails when currentPassword is empty", () => {
    // Arrange: Define a payload with an empty `currentPassword` field.
    const invalidData = {
      currentPassword: "",
      caseIds: [createId()],
    };

    // Act: Perform a safe parse of the invalid data.
    const result = DeleteSelectedCasesSchema.safeParse(invalidData);

    // Assert: Check that validation fails and returns the specific required password message.
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Current password is required.");
    }
  });

  /**
   * Test case to verify that at least one case identifier must be provided for deletion.
   */
  it("fails when caseIds array is empty", () => {
    // Arrange: Define a payload where the `caseIds` array is empty.
    const invalidData = {
      currentPassword: "password123",
      caseIds: [],
    };

    // Act: Perform a safe parse of the invalid data.
    const result = DeleteSelectedCasesSchema.safeParse(invalidData);

    // Assert: Check that validation fails and returns the selection requirement message.
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("At least one case must be selected.");
    }
  });

  /**
   * Test case to verify that identifiers must adhere to the specific CUID2 format.
   */
  it("fails when caseIds contains invalid CUID2 strings", () => {
    // Arrange: Define a payload with a string that does not match the `CUID2` pattern.
    const invalidData = {
      currentPassword: "password123",
      caseIds: ["invalid-id"],
    };

    // Act: Perform a safe parse of the invalid identifiers.
    const result = DeleteSelectedCasesSchema.safeParse(invalidData);

    // Assert: Ensure that the schema rejects the improperly formatted identifier.
    expect(result.success).toBe(false);
  });

  /**
   * Test case to ensure that the schema rejects a completely empty input object.
   */
  it("fails when inputs are missing", () => {
    // Act: Parse an empty object to check for missing required fields.
    const result = DeleteSelectedCasesSchema.safeParse({});

    // Assert: Verify that validation fails due to the absence of required properties.
    expect(result.success).toBe(false);
  });
});
