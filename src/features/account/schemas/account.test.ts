import { describe, expect, it } from "vitest";

import {
  AccountAllSessionsModalSchema,
  AccountDeletionModalSchema,
  AccountDeletionPasswordSchema,
  AccountProfileSchema,
  AccountSecuritySchema,
  DisableTwoFactorSchema,
  ProfileImageSchema,
  VerifyTwoFactorSchema,
} from "@/features/account/schemas/account";

/**
 * Test suite for the `AccountProfileSchema` which handles user profile information.
 */
describe("AccountProfileSchema", () => {
  /**
   * Test case to verify that a fully populated profile object passes validation.
   */
  it("validates a correct profile object", () => {
    // Arrange: Define a valid data structure including name, title, and geographic location.
    const validData = {
      name: "John Doe",
      professionalTitle: "Professional Title",
      institution: "Institution",
      location: {
        region: { code: "13", name: "Region 1" },
        province: { code: "1339", name: "Province 1" },
        city: { code: "133900", name: "City 1" },
        barangay: { code: "133900001", name: "Barangay 1" },
      },
    };

    // Act: Parse the data using the Zod schema.
    const result = AccountProfileSchema.safeParse(validData);

    // Assert: Check that the validation succeeds.
    expect(result.success).toBe(true);
  });

  /**
   * Test case to verify that names must begin with an uppercase character.
   */
  it("fails if name does not start with a capital letter", () => {
    // Arrange: Provide a name starting with a lowercase 'j'.
    const invalidData = {
      name: "john Doe",
      location: { region: { code: "1", name: "R1" }, province: null, city: null, barangay: null },
    };

    // Act: Perform the schema validation.
    const result = AccountProfileSchema.safeParse(invalidData);

    // Assert: Verify failure and check for the specific error message requirement.
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Start with a capital letter");
    }
  });

  /**
   * Test case to verify that the name field does not permit double spaces.
   */
  it("fails if name contains consecutive spaces", () => {
    // Arrange: Insert two spaces between parts of the name.
    const invalidData = {
      name: "John  Doe",
      location: { region: { code: "1", name: "R1" }, province: null, city: null, barangay: null },
    };

    // Act: Perform the schema validation.
    const result = AccountProfileSchema.safeParse(invalidData);

    // Assert: Verify failure and confirm the error message regarding character usage.
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "Start with a capital letter. Use only letters, hyphens, or apostrophes."
      );
    }
  });

  /**
   * Test case to verify that special characters common in names are allowed.
   */
  it("validates names with hyphens and apostrophes correctly", () => {
    // Arrange: Provide a name containing a hyphen and an apostrophe.
    const validData = {
      name: "Mary-Jane O'Connor",
      location: { region: { code: "1", name: "R1" }, province: null, city: null, barangay: null },
    };

    // Act: Perform the schema validation.
    const result = AccountProfileSchema.safeParse(validData);

    // Assert: Confirm that these characters are considered valid.
    expect(result.success).toBe(true);
  });

  /**
   * Test case to verify that the professional title field enforces strict spacing rules.
   */
  it("fails if professional title has consecutive spaces", () => {
    // Arrange: Provide a title with a double space.
    const invalidData = {
      name: "John Doe",
      professionalTitle: "Software  Engineer",
      location: { region: { code: "1", name: "R1" }, province: null, city: null, barangay: null },
    };

    // Act: Perform the schema validation.
    const result = AccountProfileSchema.safeParse(invalidData);

    // Assert: Verify that the spacing violation causes a validation failure.
    expect(result.success).toBe(false);
  });

  /**
   * Test case to verify that non-mandatory fields can be omitted.
   */
  it("allows optional fields to be undefined", () => {
    // Arrange: Provide only the mandatory name and location objects.
    const validData = {
      name: "John Doe",
      location: { region: { code: "1", name: "R1" }, province: null, city: null, barangay: null },
    };

    // Act: Perform the schema validation.
    const result = AccountProfileSchema.safeParse(validData);

    // Assert: Ensure the schema supports partial data for optional profile components.
    expect(result.success).toBe(true);
  });
});

/**
 * Test suite for the `AccountSecuritySchema` which handles email and password updates.
 */
describe("AccountSecuritySchema", () => {
  // Define a base valid object for reuse across security tests.
  const validBase = {
    email: "mortiscope@example.com",
    currentPassword: "OldPassword123!",
    newPassword: "NewPassword123!",
    repeatPassword: "NewPassword123!",
  };

  /**
   * Test case to verify a standard password and email change payload.
   */
  it("validates a correct security update object", () => {
    // Act: Parse the valid base data.
    const result = AccountSecuritySchema.safeParse(validBase);

    // Assert: Confirm successful validation.
    expect(result.success).toBe(true);
  });

  /**
   * Test case to verify that `newPassword` and `repeatPassword` must be identical.
   */
  it("fails if passwords do not match", () => {
    // Act: Provide mismatching strings for the confirmation field.
    const result = AccountSecuritySchema.safeParse({
      ...validBase,
      repeatPassword: "DifferentPassword123!",
    });

    // Assert: Verify failure and check for the specific comparison error message.
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("New passwords do not match.");
    }
  });

  /**
   * Test case to verify that the new password cannot be the same as the old one.
   */
  it("fails if new password is same as current password", () => {
    // Act: Set the new password to equal the current password.
    const result = AccountSecuritySchema.safeParse({
      ...validBase,
      newPassword: "OldPassword123!",
      repeatPassword: "OldPassword123!",
    });

    // Assert: Verify failure and check for the password uniqueness requirement.
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "New password must be different from the current password."
      );
    }
  });

  /**
   * Test case to verify that passwords must contain at least one uppercase letter.
   */
  it("fails if new password is too weak (no uppercase)", () => {
    // Act: Provide a password containing only lowercase, numbers, and symbols.
    const result = AccountSecuritySchema.safeParse({
      ...validBase,
      newPassword: "password123!",
      repeatPassword: "password123!",
    });

    // Assert: Ensure the complexity requirements block the weak password.
    expect(result.success).toBe(false);
  });

  /**
   * Test case to verify that passwords must contain at least one special character.
   */
  it("fails if new password is too weak (no symbol)", () => {
    // Act: Provide an alphanumeric password without special characters.
    const result = AccountSecuritySchema.safeParse({
      ...validBase,
      newPassword: "Password12345",
      repeatPassword: "Password12345",
    });

    // Assert: Ensure the symbol requirement is enforced.
    expect(result.success).toBe(false);
  });

  /**
   * Test case to verify that passwords cannot contain excessive repeating characters.
   */
  it("fails if new password contains repeating characters", () => {
    // Act: Provide a password with four consecutive '1' characters.
    const result = AccountSecuritySchema.safeParse({
      ...validBase,
      newPassword: "Password1111!",
      repeatPassword: "Password1111!",
    });

    // Assert: Verify failure and check for the consecutive character limit message.
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain(
        "New password cannot have more than 3 identical consecutive characters."
      );
    }
  });
});

/**
 * Test suite for the `AccountDeletionPasswordSchema` used to confirm identity during deletion.
 */
describe("AccountDeletionPasswordSchema", () => {
  /**
   * Test case to verify that the password field cannot be empty.
   */
  it("requires a password", () => {
    // Act: Pass an empty string.
    const result = AccountDeletionPasswordSchema.safeParse({ password: "" });

    // Assert: Verify that an empty password is rejected.
    expect(result.success).toBe(false);
  });

  /**
   * Test case to verify that any non-empty string passes this specific schema.
   */
  it("passes with a non-empty password", () => {
    // Act: Pass a valid string.
    const result = AccountDeletionPasswordSchema.safeParse({ password: "some-password" });

    // Assert: Verify successful validation.
    expect(result.success).toBe(true);
  });
});

/**
 * Test suite for the `AccountDeletionModalSchema` which requires manual text confirmation.
 */
describe("AccountDeletionModalSchema", () => {
  /**
   * Test case to verify that the confirmation text must match the required phrase exactly.
   */
  it("passes when confirmation text matches exactly", () => {
    // Act: Provide the exact expected phrase.
    const result = AccountDeletionModalSchema.safeParse({
      confirmationText: "Delete this account",
    });

    // Assert: Confirm validation success.
    expect(result.success).toBe(true);
  });

  /**
   * Test case to verify that the confirmation phrase is case-sensitive.
   */
  it("fails when confirmation text has wrong casing", () => {
    // Act: Provide the phrase in lowercase.
    const result = AccountDeletionModalSchema.safeParse({
      confirmationText: "delete this account",
    });

    // Assert: Verify that casing differences cause failure.
    expect(result.success).toBe(false);
  });

  /**
   * Test case to verify that incorrect phrases are rejected.
   */
  it("fails when confirmation text is different", () => {
    // Act: Provide a similar but incorrect string.
    const result = AccountDeletionModalSchema.safeParse({ confirmationText: "Delete account" });

    // Assert: Verify failure.
    expect(result.success).toBe(false);
  });
});

/**
 * Test suite for the `AccountAllSessionsModalSchema` used for bulk session termination.
 */
describe("AccountAllSessionsModalSchema", () => {
  /**
   * Test case to verify that a valid password and a legitimate enum option for signing out pass.
   */
  it("passes with valid password and sign out option", () => {
    // Act: Provide a password and a valid `signOutOption`.
    const result = AccountAllSessionsModalSchema.safeParse({
      password: "password123",
      signOutOption: "exclude_current",
    });

    // Assert: Confirm validation success.
    expect(result.success).toBe(true);
  });

  /**
   * Test case to verify that the sign-out behavior option must come from the permitted list.
   */
  it("fails if sign out option is invalid", () => {
    // Act: Provide an unrecognized option string.
    const result = AccountAllSessionsModalSchema.safeParse({
      password: "password123",
      signOutOption: "invalid_option",
    });

    // Assert: Verify failure.
    expect(result.success).toBe(false);
  });
});

/**
 * Test suite for the `VerifyTwoFactorSchema` which validates 2FA setup codes.
 */
describe("VerifyTwoFactorSchema", () => {
  /**
   * Test case to verify that a standard 6-digit numeric token is accepted.
   */
  it("passes with a 6-digit numeric token", () => {
    // Act: Provide a valid secret and a 6-digit string.
    const result = VerifyTwoFactorSchema.safeParse({
      secret: "some-secret",
      token: "123456",
    });

    // Assert: Confirm validation success.
    expect(result.success).toBe(true);
  });

  /**
   * Test case to verify that tokens must be exactly 6 digits long.
   */
  it("fails if token length is incorrect", () => {
    // Act: Provide a 5-digit token.
    const result = VerifyTwoFactorSchema.safeParse({
      secret: "some-secret",
      token: "12345",
    });

    // Assert: Verify failure due to length.
    expect(result.success).toBe(false);
  });

  /**
   * Test case to verify that tokens must only contain numbers.
   */
  it("fails if token contains non-numeric characters", () => {
    // Act: Provide a 6-character token containing a letter.
    const result = VerifyTwoFactorSchema.safeParse({
      secret: "some-secret",
      token: "12345a",
    });

    // Assert: Verify failure due to character type.
    expect(result.success).toBe(false);
  });
});

/**
 * Test suite for the `DisableTwoFactorSchema` which requires verification before removing 2FA.
 */
describe("DisableTwoFactorSchema", () => {
  /**
   * Test case to verify that the current user password is required to disable 2FA.
   */
  it("requires current password", () => {
    // Act: Provide an empty string for the password field.
    const result = DisableTwoFactorSchema.safeParse({ currentPassword: "" });

    // Assert: Verify that the schema rejects the missing password.
    expect(result.success).toBe(false);
  });
});

/**
 * Test suite for the `ProfileImageSchema` which validates avatar uploads.
 */
describe("ProfileImageSchema", () => {
  /**
   * Test case to verify that a standard JPEG file within size limits is accepted.
   */
  it("validates a correct image file", () => {
    // Arrange: Create a mock File object.
    const file = new File(["dummy content"], "test.jpg", { type: "image/jpeg" });

    // Act: Parse the file through the schema.
    const result = ProfileImageSchema.safeParse({ file });

    // Assert: Confirm validation success.
    expect(result.success).toBe(true);
  });

  /**
   * Test case to verify that unsupported image formats like GIF are rejected.
   */
  it("fails if file type is not supported", () => {
    // Arrange: Create a mock GIF File object.
    const file = new File(["dummy content"], "test.gif", { type: "image/gif" });

    // Act: Parse the file through the schema.
    const result = ProfileImageSchema.safeParse({ file });

    // Assert: Verify failure and check for the supported types error message.
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Only JPEG, PNG");
    }
  });

  /**
   * Test case to verify that the schema enforces a maximum file size of 10MB.
   */
  it("fails if file size exceeds 10MB", () => {
    // Arrange: Create a mock File object slightly larger than 10MB.
    const largeSize = 10 * 1024 * 1024 + 1;
    const buffer = new ArrayBuffer(largeSize);
    const file = new File([buffer], "large.jpg", { type: "image/jpeg" });

    // Mock the size property as File constructor doesn't always reflect buffer size in tests.
    Object.defineProperty(file, "size", { value: largeSize });

    // Act: Parse the file through the schema.
    const result = ProfileImageSchema.safeParse({ file });

    // Assert: Verify failure and check for the file size error message.
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Image must be smaller than 10MB");
    }
  });
});
