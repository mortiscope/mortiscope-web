import { z } from "zod";

// Base Email Schema
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

// New Password Schema
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

// Current Password Schema
const currentPasswordValidationSchema = z
  .string()
  .min(1, { message: "Current password is required." });

// Name Validation
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

// Define the base object schema for sign up
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

// Refinement to the base object
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

// Sign In Schema
export const SignInSchema = z.object({
  email: BaseSignUpSchemaObject.shape.email,
  password: currentPasswordValidationSchema,
});

// Forgot Password Schema
export const ForgotPasswordSchema = z.object({
  email: BaseSignUpSchemaObject.shape.email,
});

// Resetting a Forgotten Password
export const PasswordResetSchema = z
  .object({
    newPassword: newPasswordValidationSchema,
    confirmNewPassword: z.string().min(1, { message: "Please confirm your new password." }),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "New passwords do not match.",
    path: ["confirmNewPassword"],
  });

// Changing Password
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

export type SignUpFormValues = z.infer<typeof SignUpSchema>;
export type SignInFormValues = z.infer<typeof SignInSchema>;
export type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordSchema>;
export type PasswordResetFormValues = z.infer<typeof PasswordResetSchema>;
export type ChangePasswordFormValues = z.infer<typeof ChangePasswordSchema>;
