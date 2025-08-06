import { z } from "zod";

/**
 * Defines the schema for requesting a full case results export.
 */
export const requestResultsExportSchema = z.discriminatedUnion("format", [
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
  }),
]);

export type RequestResultsExportInput = z.infer<typeof requestResultsExportSchema>;

/**
 * Defines the schema for requesting a single image export.
 */
export const requestImageExportSchema = z.object({
  uploadId: z.cuid2({ message: "A valid upload ID is required." }),
  format: z.enum(["raw_data", "labelled_images"]),
});

export type RequestImageExportInput = z.infer<typeof requestImageExportSchema>;
