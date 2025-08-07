import { z } from "zod";

/**
 * Defines the schema for requesting a full case results export.
 */
export const requestResultsExportSchema = z
  .discriminatedUnion("format", [
    z.object({
      caseId: z.cuid2({ message: "A valid case ID is required." }),
      format: z.literal("raw_data"),
    }),
    z.object({
      caseId: z.cuid2({ message: "A valid case ID is required." }),
      format: z.literal("labelled_images"),
      resolution: z.enum(["1280x720", "1920x1080", "3840x2160"], {
        message: "Please select an image resolution.",
      }),
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
      // If the format is not PDF, this refinement does not apply.
      if (data.format !== "pdf") return true;

      // If a protected level is chosen, a password must be provided and meet the length requirement.
      if (
        data.securityLevel === "view_protected" ||
        data.securityLevel === "permissions_protected"
      ) {
        return data.password && data.password.length >= 8;
      }

      // If the security level is standard, no password is needed.
      return true;
    },
    {
      // This message will be shown if the refinement check fails.
      message: "Password must be at least 8 characters.",
      // Associates the error with the 'password' field in the form.
      path: ["password"],
    }
  );

export type RequestResultsExportInput = z.infer<typeof requestResultsExportSchema>;

/**
 * Defines the schema for requesting a single image export.
 */
export const requestImageExportSchema = z.discriminatedUnion("format", [
  z.object({
    uploadId: z.cuid2({ message: "A valid upload ID is required." }),
    format: z.literal("raw_data"),
  }),
  z.object({
    uploadId: z.cuid2({ message: "A valid upload ID is required." }),
    format: z.literal("labelled_images"),
    resolution: z.enum(["1280x720", "1920x1080", "3840x2160"], {
      message: "Please select an image resolution.",
    }),
  }),
]);

export type RequestImageExportInput = z.infer<typeof requestImageExportSchema>;
