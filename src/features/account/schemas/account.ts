import { z } from "zod";

/**
 * A reusable schema for validating user names.
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
 * A reusable schema for a location part.
 */
const locationValueSchema = z.object({
  code: z.string().min(1, "Code cannot be empty."),
  name: z.string().min(1, "Name cannot be empty."),
});

/**
 * Schema for validating professional title input.
 * Allows letters, spaces, hyphens, apostrophes, and common professional symbols.
 */
const professionalTitleValidation = z
  .string()
  .min(1, { message: "Professional title is required." })
  .max(100, { message: "Professional title cannot exceed 100 characters." })
  .regex(/^[a-zA-Z0-9\s\-'.,()&/]*$/, {
    message:
      "Professional title can only contain letters, numbers, spaces, and common punctuation.",
  })
  .refine((title) => !/\s{2,}/.test(title), {
    message: "Cannot contain consecutive spaces.",
  })
  .refine((title) => !/^[\s\-'.,()&/]|[\s\-'.,()&/]$/.test(title), {
    message: "Cannot start or end with spaces or punctuation.",
  });

/**
 * Schema for validating institution/organization input.
 * Allows letters, numbers, spaces, and common organizational symbols.
 */
const institutionValidation = z
  .string()
  .min(1, { message: "Institution is required." })
  .max(150, { message: "Institution name cannot exceed 150 characters." })
  .regex(/^[a-zA-Z0-9\s\-'.,()&/]*$/, {
    message: "Institution name can only contain letters, numbers, spaces, and common punctuation.",
  })
  .refine((institution) => !/\s{2,}/.test(institution), {
    message: "Cannot contain consecutive spaces.",
  })
  .refine((institution) => !/^[\s\-'.,()&/]|[\s\-'.,()&/]$/.test(institution), {
    message: "Cannot start or end with spaces or punctuation.",
  });

/**
 * Schema for the account profile update form.
 * Uses existing validation patterns for name and location.
 */
export const AccountProfileSchema = z.object({
  name: nameValidation,
  professionalTitle: professionalTitleValidation.optional(),
  institution: institutionValidation.optional(),
  location: z.object({
    region: locationValueSchema,
    province: z.nullable(locationValueSchema),
    city: z.nullable(locationValueSchema),
    barangay: z.nullable(locationValueSchema),
  }),
});

/**
 * A reusable, strict validation schema for email addresses.
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
 * A simple schema for validating a user's current password input.
 * It only checks for non-emptiness, as strength validation is not needed here.
 */
const currentPasswordValidationSchema = z
  .string()
  .min(1, { message: "Current password is required." });

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
 * Schema for the account security form.
 * Validates email and password change fields with cross-field validation.
 */
export const AccountSecuritySchema = z
  .object({
    email: emailValidationSchema,
    currentPassword: currentPasswordValidationSchema,
    newPassword: newPasswordValidationSchema,
    repeatPassword: z.string().min(1, { message: "Please confirm your new password." }),
  })
  .refine((data) => data.newPassword === data.repeatPassword, {
    message: "New passwords do not match.",
    path: ["repeatPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from the current password.",
    path: ["newPassword"],
  });

/**
 * Schema for the account deletion modal confirmation text.
 * Validates that the user enters the exact confirmation text.
 */
export const AccountDeletionModalSchema = z.object({
  confirmationText: z
    .string()
    .min(1, { message: "Confirmation text is required." })
    .refine((text) => text === "Delete this account", {
      message: "Text doesn't match the expected text.",
    }),
});

/**
 * Exports TypeScript types inferred from the Zod schemas.
 */
export type AccountProfileFormValues = z.infer<typeof AccountProfileSchema>;
export type AccountSecurityFormValues = z.infer<typeof AccountSecuritySchema>;
export type AccountDeletionModalFormValues = z.infer<typeof AccountDeletionModalSchema>;
