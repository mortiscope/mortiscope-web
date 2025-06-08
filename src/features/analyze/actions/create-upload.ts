"use server";

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createId } from "@paralleldrive/cuid2";
import path from "path";
import { z } from "zod";

import { auth } from "@/auth";
import {
  GeneratePresignedUrlInput,
  generatePresignedUrlSchema,
} from "@/features/analyze/schemas/upload";
import { s3 } from "@/lib/aws";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_FILE_SIZE,
  PRESIGNED_URL_EXPIRATION_SECONDS,
} from "@/lib/constants";
import { formatBytes } from "@/lib/utils";

// Runtime check for AWS Bucket Name
if (!process.env.AWS_BUCKET_NAME) {
  throw new Error("Missing required AWS environment variable: AWS_BUCKET_NAME");
}
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

/**
 * Defines the structured return type for the server action for clarity and type safety.
 */
type ActionResponse = {
  success: boolean;
  data?: {
    url: string;
    key: string;
  };
  error?: string;
  details?: Record<string, string[] | undefined>;
};

// Extend the base schema to include an optional 'key' for overwriting existing files.
const extendedPresignedUrlSchema = generatePresignedUrlSchema.extend({
  key: z.string().optional(),
});

/**
 * Creates a pre-signed URL for uploading a file to S3.
 * If a `key` is provided in the input, it generates a URL to overwrite that specific object.
 * Otherwise, it creates a new unique key for a new upload.
 *
 * @param values The input data containing file details, validated against the extended schema.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function createUpload(
  values: GeneratePresignedUrlInput & { key?: string }
): Promise<ActionResponse> {
  try {
    // Authenticate the user
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }
    const userId = session.user.id;

    // Validate the input parameters using the extended schema
    const parseResult = extendedPresignedUrlSchema.safeParse(values);

    if (!parseResult.success) {
      // Return a detailed error response for invalid input
      return {
        success: false,
        error: "Invalid input",
        details: parseResult.error.flatten().fieldErrors,
      };
    }

    const { fileName, fileType, fileSize, key: existingKey } = parseResult.data;

    // Add server-side validation for file size.
    if (fileSize > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File size cannot exceed ${formatBytes(MAX_FILE_SIZE)}.`,
      };
    }

    // Add server-side validation for file type and extension mismatch.
    const fileExtension = path.extname(fileName).toLowerCase();
    const allowedExtensionsForType =
      ACCEPTED_IMAGE_TYPES[fileType as keyof typeof ACCEPTED_IMAGE_TYPES];

    if (!allowedExtensionsForType || !allowedExtensionsForType.includes(fileExtension)) {
      return {
        success: false,
        error: `The file type "${fileType}" is not permitted or does not match the file extension "${fileExtension}".`,
      };
    }

    // Determine the S3 key. Use the provided key for overwrites, or generate a new one.
    const key =
      existingKey ??
      (() => {
        const baseName = path.basename(fileName, fileExtension);
        const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-]/g, "-");
        const uniqueId = createId();
        // Organize uploads by user ID in a dedicated 'uploads' folder for new files.
        return `uploads/${userId}/${sanitizedBaseName}-${uniqueId}${fileExtension}`;
      })();

    // Create the S3 command for a PUT operation
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      ContentLength: fileSize,
      Metadata: {
        userId: userId,
      },
    });

    // Generate the pre-signed URL using the centralized constant.
    const presignedUrl = await getSignedUrl(s3, command, {
      expiresIn: PRESIGNED_URL_EXPIRATION_SECONDS,
    });

    // Return the URL and key to the client
    return {
      success: true,
      data: {
        url: presignedUrl,
        key: key,
      },
    };
  } catch (error) {
    console.error("Error generating pre-signed URL:", error);
    // Return a generic error to avoid leaking implementation details
    return {
      success: false,
      error: "An internal server error occurred while preparing the upload.",
    };
  }
}
