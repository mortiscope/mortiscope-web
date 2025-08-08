import { z } from "zod";

/**
 * Defines the schema for requesting a full case results export.
 */
export const requestResultsExportSchema = z
  .discriminatedUnion("format", [
    z.object({
      caseId: z.cuid2({ message: "A valid case ID is required." }),
      format: z.literal("raw_data"),
      passwordProtection: z
        .object({
          enabled: z.boolean(),
          password: z.string().optional(),
        })
        .optional(),
    }),
    z.object({
      caseId: z.cuid2({ message: "A valid case ID is required." }),
      format: z.literal("labelled_images"),
      resolution: z.enum(["1280x720", "1920x1080", "3840x2160"], {
        message: "Please select an image resolution.",
      }),
      passwordProtection: z
        .object({
          enabled: z.boolean(),
          password: z.string().optional(),
        })
        .optional(),
    }),
    z.object({
      caseId: z.cuid2({ message: "A valid case ID is required." }),
      format: z.literal("pdf"),
      pageSize: z.enum(["a4", "letter"]),
      securityLevel: z.enum(["standard", "view_protected", "permissions_protected"]),
      password: z.string().optional(),
      permissions: z
        .object({
          printing: z.boolean(),
          copying: z.boolean(),
        })
        .optional(),
    }),
  ])
  .refine(
    (data) => {
      // PDF format validation
      if (data.format === "pdf") {
        // If a protected level is chosen, a password must be provided and meet the length requirement.
        if (
          data.securityLevel === "view_protected" ||
          data.securityLevel === "permissions_protected"
        ) {
          return data.password && data.password.length >= 8;
        }
        return true;
      }

      // Non-PDF format validation (raw_data, labelled_images)
      if ("passwordProtection" in data && data.passwordProtection?.enabled) {
        return data.passwordProtection.password && data.passwordProtection.password.length >= 8;
      }

      return true;
    },
    {
      // This message will be shown if the refinement check fails.
      message: "Password must be at least 8 characters.",
      // Associates the error with the 'password' field in the form.
      path: ["passwordProtection", "password"],
    }
  );

export type RequestResultsExportInput = z.infer<typeof requestResultsExportSchema>;

/**
 * Defines the schema for requesting a single image export.
 */
export const requestImageExportSchema = z
  .discriminatedUnion("format", [
    z.object({
      uploadId: z.cuid2({ message: "A valid upload ID is required." }),
      format: z.literal("raw_data"),
      passwordProtection: z
        .object({
          enabled: z.boolean(),
          password: z.string().optional(),
        })
        .optional(),
    }),
    z.object({
      uploadId: z.cuid2({ message: "A valid upload ID is required." }),
      format: z.literal("labelled_images"),
      resolution: z.enum(["1280x720", "1920x1080", "3840x2160"], {
        message: "Please select an image resolution.",
      }),
      passwordProtection: z
        .object({
          enabled: z.boolean(),
          password: z.string().optional(),
        })
        .optional(),
    }),
  ])
  .refine(
    (data) => {
      // If password protection is enabled, password must be at least 8 characters
      if (data.passwordProtection?.enabled) {
        return data.passwordProtection.password && data.passwordProtection.password.length >= 8;
      }
      return true;
    },
    {
      message: "Password must be at least 8 characters.",
      path: ["passwordProtection", "password"],
    }
  );

export type RequestImageExportInput = z.infer<typeof requestImageExportSchema>;

/**
 * Utility function to validate password protection settings using Zod schema validation.
 * Returns true if password protection is disabled OR if it's enabled with a valid password.
 */
export const validatePasswordProtection = (isEnabled: boolean, password: string): boolean => {
  if (!isEnabled) return true;

  // Use the same validation logic as the Zod schema
  return password.length >= 8;
};
