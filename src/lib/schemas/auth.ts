import { z } from "zod";

// Sign Up Schema
const nameValidation = z
  .string()
  .min(1, { message: "This field is required." })
  .min(2, { message: "Must be at least 2 characters long." })
  .max(50, { message: "Cannot exceed 50 characters." })
  // Allows letters, hyphens, apostrophes, and spaces (for multi-part names)
  .regex(/^[A-Z][a-zA-Z'-]*(?:\s[A-Z][a-zA-Z'-]*)*$/, {
    message: "Start with a capital letter. Use only letters, hyphens, or apostrophes.",
  })
  // No consecutive spaces
  .refine((name) => !/\s{2,}/.test(name), {
    message: "Cannot contain consecutive spaces.",
  })
  .refine((name) => !/['-]{2,}/.test(name), {
    // No consecutive hyphens or apostrophes
    message: "Cannot contain consecutive hyphens or apostrophes.",
  })
  // Cannot start or end with hyphen or apostrophe
  .refine((name) => !/^['-]|['-]$/.test(name), {
    message: "Cannot start or end with a hyphen or apostrophe.",
  });

export const SignUpSchema = z
  .object({
    firstName: nameValidation.refine((val) => val.trim().length > 0, {
      message: "First name is required.",
    }),
    lastName: nameValidation.refine((val) => val.trim().length > 0, {
      message: "Last name is required.",
    }),
    email: z
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
      ),
    password: z
      .string()
      .min(1, { message: "Password is required." })
      // Based from password guidelines of National Institute of Standards and Technology (NIST)
      .min(12, { message: "Password must be at least 12 characters long." })
      .max(128, { message: "Password cannot exceed 128 characters." })
      .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter." })
      .regex(/[a-z]/, { message: "Password must contain at least one lowercase letter." })
      .regex(/[0-9]/, { message: "Password must contain at least one number." })
      .regex(/[^A-Za-z0-9]/, { message: "Password must contain at least one symbol." })
      .refine((password) => !/(.)\1\1\1/.test(password), {
        // No more than 3 consecutive identical characters
        message: "Password cannot have more than 3 identical consecutive characters.",
      })
      .refine((password) => !/\s/.test(password), {
        // No whitespace characters
        message: "Password cannot contain spaces.",
      }),
    confirmPassword: z.string().min(1, { message: "Please confirm your password." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

// Sign In Schema
export const SignInSchema = z.object({
  email: z
    .string()
    .min(1, { message: "Email is required." })
    .email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }),
});

export type SignUpFormValues = z.infer<typeof SignUpSchema>;
export type SignInFormValues = z.infer<typeof SignInSchema>;
