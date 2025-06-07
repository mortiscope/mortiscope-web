import { z } from "zod";

import { ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";

const acceptedTypes = Object.keys(ACCEPTED_IMAGE_TYPES);

/**
 * Schema for validating requests to generate a pre-signed URL.
 */
export const generatePresignedUrlSchema = z.object({
  fileName: z.string().min(1, { message: "File name cannot be empty." }),
  fileSize: z
    .number()
    .min(1, { message: "File cannot be empty." })
    .max(MAX_FILE_SIZE, {
      message: `File is too large (max ${formatBytes(MAX_FILE_SIZE)}).`,
    }),
  fileType: z.string().refine((type) => acceptedTypes.includes(type), {
    message: "File type is not supported.",
  }),
});

/**
 * Schema to validate the key for the object to be deleted.
 */
export const deleteUploadSchema = z.object({
  key: z.string().min(1, "S3 object key cannot be empty."),
});

export type GeneratePresignedUrlInput = z.infer<typeof generatePresignedUrlSchema>;
export type DeleteUploadInput = z.infer<typeof deleteUploadSchema>;
