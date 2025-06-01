import { z } from "zod";

/**
 * Defines a reusable, strict validation schema for email addresses.
 * Includes format, length (based on RFC 5321), and a basic domain check.
 */
const emailValidationSchema = z
  .string()
  .min(1, { message: "Email is required." })
  .email({ message: "Please enter a valid email address." })
  // RFC 5321: Simple Mail Transfer Protocol Limit
  .max(254, { message: "Email cannot exceed 254 characters." })
  .refine(
    (email) => {
      // Basic check for common top-level domains (TLDs)
      const parts = email.split(".");
      return parts.length > 1 && parts[parts.length - 1].length >= 2;
    },
    { message: "Email must include a valid domain." }
  );

/**
 * Defines a reusable, strong password policy based on NIST guidelines.
 * Used for creating or resetting passwords to ensure they meet security standards.
 */
const newPasswordValidationSchema = z
  .string()
  .min(1, { message: "New password is required." })
  // Based from password guidelines of National Institute of Standards and Technology (NIST)
  .min(12, { message: "New password must be at least 12 characters long." })
  .max(128, { message: "New password cannot exceed 128 characters." })
  .regex(/[A-Z]/, { message: "New password must contain at least one uppercase letter." })
  .regex(/[a-z]/, { message: "New password must contain at least one lowercase letter." })
  .regex(/[0-9]/, { message: "New password must contain at least one number." })
  .regex(/[^A-Za-z0-9]/, { message: "New password must contain at least one symbol." })
  .refine((password) => !/(.)\1\1\1/.test(password), {
    // No more than 3 consecutive identical characters
    message: "New password cannot have more than 3 identical consecutive characters.",
  })
  .refine((password) => !/\s/.test(password), {
    // No whitespace characters
    message: "New password cannot contain spaces.",
  });

/**
 * A simple schema for validating a user's current password input.
 * It only checks for non-emptiness, as strength validation is not needed here.
 */
const currentPasswordValidationSchema = z
  .string()
  .min(1, { message: "Current password is required." });

/**
 * A reusable schema for validating user names (first or last).
 * Enforces capitalization, a valid character set, and clean formatting.
 */
const nameValidation = z
  .string()
  .min(1, { message: "This field is required." })
  .min(2, { message: "Must be at least 2 characters long." })
  .max(50, { message: "Cannot exceed 50 characters." })
  .regex(/^[A-Z][a-zA-Z'-]*(?:\s[A-Z][a-zA-Z'-]*)*$/, {
    message: "Start with a capital letter. Use only letters, hyphens, or apostrophes.",
  })
  .refine((name) => !/\s{2,}/.test(name), {
    message: "Cannot contain consecutive spaces.",
  })
  .refine((name) => !/['-]{2,}/.test(name), {
    message: "Cannot contain consecutive hyphens or apostrophes.",
  })
  .refine((name) => !/^['-]|['-]$/.test(name), {
    message: "Cannot start or end with a hyphen or apostrophe.",
  });

/**
 * The base schema definition for sign-up fields before cross-field validation.
 */
const BaseSignUpSchemaObject = z.object({
  firstName: nameValidation.refine((val) => val.trim().length > 0, {
    message: "First name is required.",
  }),
  lastName: nameValidation.refine((val) => val.trim().length > 0, {
    message: "Last name is required.",
  }),
  email: emailValidationSchema,
  password: newPasswordValidationSchema,
  confirmPassword: z.string().min(1, { message: "Please confirm your password." }),
});

/**

 * The complete schema for the user sign-up form.
 * It extends the base object with cross-field validations to ensure password security and confirmation matching.
 */
export const SignUpSchema = BaseSignUpSchemaObject.refine(
  // Password must not be the same as the local part of email
  (data) => {
    if (data.email && data.email.includes("@")) {
      const emailLocalPart = data.email.split("@")[0];
      return data.password !== emailLocalPart;
    }
    return true;
  },
  {
    message: "Password cannot be the same as your email username.",
    path: ["password"],
  }
)
  .refine(
    // Password must not be the same as the entire email
    (data) => {
      return data.password !== data.email;
    },
    {
      message: "Password cannot be the same as your full email address.",
      path: ["password"],
    }
  )
  .refine(
    // Third refinement: password === confirmPassword
    (data) => data.password === data.confirmPassword,
    {
      message: "Passwords do not match.",
      path: ["confirmPassword"],
    }
  );

/**
 * Schema for the user sign-in form.
 */
export const SignInSchema = z.object({
  email: BaseSignUpSchemaObject.shape.email,
  password: currentPasswordValidationSchema,
});

/**
 * Schema for the forgot password form, requiring only a valid email.
 */
export const ForgotPasswordSchema = z.object({
  email: BaseSignUpSchemaObject.shape.email,
});

/**
 * Schema for the password reset form.
 * Ensures the new password meets strength requirements and is confirmed correctly.
 */
export const ResetPasswordSchema = z
  .object({
    newPassword: newPasswordValidationSchema,
    confirmNewPassword: z.string().min(1, { message: "Please confirm your new password." }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match.",
    path: ["confirmNewPassword"],
  });

/**
 * Schema for the change password form (used by authenticated users).
 * Requires the current password and validates the new password against the old password.
 */
export const ChangePasswordSchema = z
  .object({
    currentPassword: currentPasswordValidationSchema,
    newPassword: newPasswordValidationSchema,
    confirmNewPassword: z.string().min(1, { message: "Please confirm your new password." }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match.",
    path: ["confirmNewPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current password.",
    path: ["newPassword"],
  });

/**
 * Schema for the email change request form.
 * Requires the new email and the user's current password for re-authentication.
 */
export const EmailChangeRequestSchema = z.object({
  newEmail: emailValidationSchema,
  currentPassword: z.string().min(1, { message: "Current password is required." }),
});

/**
 * Schema for the account deletion request form.
 * The password field is optional as it's only required for credential-based users,
 * not for OAuth users.
 */
export const AccountDeletionRequestSchema = z.object({
  password: z.string().optional(),
});

/**
 * Exports TypeScript types inferred from the Zod schemas.
 */
export type SignUpFormValues = z.infer<typeof SignUpSchema>;
export type SignInFormValues = z.infer<typeof SignInSchema>;
export type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof ResetPasswordSchema>;
export type ChangePasswordFormValues = z.infer<typeof ChangePasswordSchema>;
export type EmailChangeRequestFormValues = z.infer<typeof EmailChangeRequestSchema>;
export type AccountDeletionRequestFormValues = z.infer<typeof AccountDeletionRequestSchema>;
