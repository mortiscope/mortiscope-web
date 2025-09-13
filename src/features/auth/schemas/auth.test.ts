import { describe, expect, it } from "vitest";

import {
  AccountDeletionRequestSchema,
  ChangePasswordSchema,
  EmailChangeRequestSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  SigninRecoveryCodeSchema,
  SignInSchema,
  SigninTwoFactorSchema,
  SignUpSchema,
} from "@/features/auth/schemas/auth";

/**
 * Test suite for Authentication Zod Schemas to ensure validation rules are enforced correctly.
 */
describe("Auth Schemas", () => {
  const validPassword = "StrongP@ssw0rd123";
  const validEmail = "mortiscope@example.com";

  /**
   * Group of tests for the user registration schema.
   */
  describe("SignUpSchema", () => {
    const baseValidData = {
      firstName: "Mortiscope",
      lastName: "Account",
      email: validEmail,
      password: validPassword,
      confirmPassword: validPassword,
    };

    /**
     * Test case to verify that valid data passes schema validation.
     */
    it("validates correct sign-up data", () => {
      // Act: Parse valid data against the schema.
      const result = SignUpSchema.safeParse(baseValidData);
      // Assert: The parsing should be successful.
      expect(result.success).toBe(true);
    });

    /**
     * Sub-suite for name field validation rules.
     */
    describe("Name Validation", () => {
      /**
       * Test case to ensure names must start with a capital letter.
       */
      it("fails if names do not start with a capital letter", () => {
        // Arrange: Create data with a lowercase first name.
        const result = SignUpSchema.safeParse({
          ...baseValidData,
          firstName: "mortiscope",
        });
        // Assert: Validation should fail with a specific casing error message.
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("Start with a capital letter");
        }
      });

      /**
       * Test case to ensure names do not contain numeric or special characters.
       */
      it("fails if names contain numbers or special characters", () => {
        // Arrange: Create data with numbers in the last name.
        const result = SignUpSchema.safeParse({
          ...baseValidData,
          lastName: "Account123",
        });
        // Assert: Validation should fail.
        expect(result.success).toBe(false);
      });

      /**
       * Test case to ensure names do not contain consecutive separators.
       */
      it("fails if names contain consecutive hyphens or spaces", () => {
        // Arrange: Create data with consecutive hyphens in the first name.
        const result = SignUpSchema.safeParse({
          ...baseValidData,
          firstName: "Morti--Scope",
        });
        // Assert: Validation should fail with a format error message.
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("Cannot contain consecutive");
        }
      });
    });

    /**
     * Sub-suite for email field validation rules.
     */
    describe("Email Validation", () => {
      /**
       * Test case to verify standard email format validation.
       */
      it("fails on invalid email format", () => {
        // Arrange: Create data with a malformed email string.
        const result = SignUpSchema.safeParse({
          ...baseValidData,
          email: "invalid-email",
        });
        // Assert: Validation should fail.
        expect(result.success).toBe(false);
      });

      /**
       * Test case to verify strict domain validation rules.
       */
      it("fails if email domain is too short", () => {
        // Arrange: Create data with an incomplete top-level domain.
        const result = SignUpSchema.safeParse({
          ...baseValidData,
          email: "user@domain.c",
        });
        // Assert: Validation should fail with an invalid address message.
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Please enter a valid email address.");
        }
      });
    });

    /**
     * Sub-suite for password complexity rules based on NIST guidelines.
     */
    describe("Password Complexity (NIST)", () => {
      /**
       * Test case to enforce minimum password length.
       */
      it("fails if password is too short", () => {
        // Arrange: Create data with a password shorter than the required minimum.
        const result = SignUpSchema.safeParse({
          ...baseValidData,
          password: "Short1!",
          confirmPassword: "Short1!",
        });
        // Assert: Validation should fail due to length requirements.
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("at least 12 characters");
        }
      });

      /**
       * Test case to enforce the inclusion of uppercase letters.
       */
      it("fails if password lacks uppercase letters", () => {
        // Arrange: Create data with a lowercase-only password.
        const result = SignUpSchema.safeParse({
          ...baseValidData,
          password: "lowercase123!",
          confirmPassword: "lowercase123!",
        });
        // Assert: Validation should fail due to missing uppercase character.
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("uppercase letter");
        }
      });

      /**
       * Test case to enforce the inclusion of special symbols.
       */
      it("fails if password lacks symbols", () => {
        // Arrange: Create data with an alphanumeric-only password.
        const result = SignUpSchema.safeParse({
          ...baseValidData,
          password: "NoSymbolPassword123",
          confirmPassword: "NoSymbolPassword123",
        });
        // Assert: Validation should fail due to missing symbol.
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain("at least one symbol");
        }
      });

      /**
       * Test case to prevent weak passwords with repeating characters.
       */
      it("fails if password has too many consecutive identical characters", () => {
        // Arrange: Create data with a password containing repeating characters.
        const result = SignUpSchema.safeParse({
          ...baseValidData,
          password: "Paaaassword123!",
          confirmPassword: "Paaaassword123!",
        });
        // Assert: Validation should fail due to repetition rules.
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toContain(
            "more than 3 identical consecutive characters"
          );
        }
      });
    });

    /**
     * Sub-suite for validation rules involving multiple fields.
     */
    describe("Cross-Field Validation", () => {
      /**
       * Test case to verify that the password and confirmation fields must match.
       */
      it("fails if password and confirmPassword do not match", () => {
        // Arrange: Create data where confirmation does not match the password.
        const result = SignUpSchema.safeParse({
          ...baseValidData,
          confirmPassword: "DifferentPassword123!",
        });
        // Assert: Validation should fail with a mismatch error.
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe("Passwords do not match.");
        }
      });

      /**
       * Test case to ensure the password does not contain personal information (email).
       */
      it("fails if password matches email local part", () => {
        // Arrange: Create data where the password contains the user's email handle.
        const result = SignUpSchema.safeParse({
          ...baseValidData,
          email: "mortiscope@example.com",
          password: "mortiscopeaccount",
          confirmPassword: "mortiscopeaccount",
        });
        // Assert: Validation should fail to prevent using personal info in passwords.
        expect(result.success).toBe(false);
      });
    });
  });

  /**
   * Test suite for the Sign In schema.
   */
  describe("SignInSchema", () => {
    /**
     * Test case to verify that valid credentials pass validation.
     */
    it("accepts valid email and password", () => {
      // Act: Parse valid credential data.
      const result = SignInSchema.safeParse({
        email: validEmail,
        password: "somePassword",
      });
      // Assert: Validation should succeed.
      expect(result.success).toBe(true);
    });

    /**
     * Test case to ensure both email and password are required.
     */
    it("requires email and password", () => {
      // Act: Parse empty credential strings.
      const result = SignInSchema.safeParse({
        email: "",
        password: "",
      });
      // Assert: Validation should fail.
      expect(result.success).toBe(false);
    });
  });

  /**
   * Test suite for the Forgot Password schema.
   */
  describe("ForgotPasswordSchema", () => {
    /**
     * Test case to verify email format validation for recovery requests.
     */
    it("validates email", () => {
      // Act: Parse both valid and invalid email inputs.
      const valid = ForgotPasswordSchema.safeParse({ email: validEmail });
      const invalid = ForgotPasswordSchema.safeParse({ email: "invalid" });

      // Assert: The valid email should pass, and the invalid email should fail.
      expect(valid.success).toBe(true);
      expect(invalid.success).toBe(false);
    });
  });

  /**
   * Test suite for the Reset Password schema.
   */
  describe("ResetPasswordSchema", () => {
    /**
     * Test case to verify password matching logic during reset.
     */
    it("enforces complexity and matching", () => {
      // Arrange: Create data with non-matching new passwords.
      const result = ResetPasswordSchema.safeParse({
        newPassword: validPassword,
        confirmNewPassword: "DifferentPassword123!",
      });
      // Assert: Validation should fail due to mismatch.
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("New passwords do not match.");
      }
    });
  });

  /**
   * Test suite for the Change Password schema.
   */
  describe("ChangePasswordSchema", () => {
    /**
     * Test case to ensure the new password is not identical to the current password.
     */
    it("fails if new password is same as current password", () => {
      // Arrange: Create data where the new password matches the current one.
      const result = ChangePasswordSchema.safeParse({
        currentPassword: validPassword,
        newPassword: validPassword,
        confirmNewPassword: validPassword,
      });
      // Assert: Validation should fail with a redundancy error.
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "New password must be different from the current password."
        );
      }
    });
  });

  /**
   * Test suite for the Email Change Request schema.
   */
  describe("EmailChangeRequestSchema", () => {
    /**
     * Test case to verify structural validation of email change requests.
     */
    it("validates new email and current password", () => {
      // Act: Parse valid email change data.
      const result = EmailChangeRequestSchema.safeParse({
        newEmail: "new@example.com",
        currentPassword: "password",
      });
      // Assert: Validation should succeed.
      expect(result.success).toBe(true);
    });
  });

  /**
   * Test suite for the Account Deletion Request schema.
   */
  describe("AccountDeletionRequestSchema", () => {
    /**
     * Test case to verify that the password field is optional (dependent on auth provider type).
     */
    it("allows optional password", () => {
      // Act: Parse data with and without a password.
      const withPass = AccountDeletionRequestSchema.safeParse({
        password: "password",
      });
      const withoutPass = AccountDeletionRequestSchema.safeParse({});

      // Assert: Both scenarios should be valid.
      expect(withPass.success).toBe(true);
      expect(withoutPass.success).toBe(true);
    });
  });

  /**
   * Test suite for the 2FA token schema.
   */
  describe("SigninTwoFactorSchema", () => {
    /**
     * Test case to verify that the token must be exactly 6 digits.
     */
    it("validates 6 digit token", () => {
      // Act: Parse various token formats.
      const valid = SigninTwoFactorSchema.safeParse({ token: "123456" });
      const tooShort = SigninTwoFactorSchema.safeParse({ token: "12345" });
      const notNumbers = SigninTwoFactorSchema.safeParse({ token: "ABCDEF" });

      // Assert: Only the 6-digit numeric string should pass.
      expect(valid.success).toBe(true);
      expect(tooShort.success).toBe(false);
      expect(notNumbers.success).toBe(false);
    });
  });

  /**
   * Test suite for the Recovery Code schema.
   */
  describe("SigninRecoveryCodeSchema", () => {
    /**
     * Test case to verify acceptance of valid recovery code formats.
     */
    it("accepts valid recovery code format", () => {
      // Act: Parse a valid recovery code.
      const result = SigninRecoveryCodeSchema.safeParse({
        recoveryCode: "ABC1-2345",
      });
      // Assert: Validation should succeed.
      expect(result.success).toBe(true);
    });

    /**
     * Test case to verify that the schema sanitizes input by uppercasing and removing separators.
     */
    it("transforms input to uppercase and removes separators", () => {
      // Act: Parse a code with mixed case and separators.
      const result = SigninRecoveryCodeSchema.safeParse({
        recoveryCode: "abc1-2345",
      });

      // Assert: Verify that the output `data` is transformed correctly.
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.recoveryCode).toBe("ABC12345");
      }
    });

    /**
     * Test case to verify validation occurs after the transformation step.
     */
    it("fails on invalid length after transformation", () => {
      // Arrange: Create a code that is too short.
      const result = SigninRecoveryCodeSchema.safeParse({
        recoveryCode: "123",
      });
      // Assert: Validation should fail.
      expect(result.success).toBe(false);
    });
  });
});
