import { z } from "zod";

/**
 * Defines the schema for requesting a full case results export.
 */
export const requestResultsExportSchema = z.object({
  caseId: z.string().cuid2({ message: "A valid case ID is required." }),
  format: z.enum(["raw_data", "pdf", "labelled_images"]),
});
export type RequestResultsExportInput = z.infer<typeof requestResultsExportSchema>;

/**
 * Defines the schema for requesting a single image export.
 */
export const requestImageExportSchema = z.object({
  uploadId: z.string().cuid2({ message: "A valid upload ID is required." }),
  format: z.enum(["raw_data", "labelled_images"]),
});

export type RequestImageExportInput = z.infer<typeof requestImageExportSchema>;
