"use server";

import { CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import { z } from "zod";

import { auth } from "@/auth";
import { s3 } from "@/lib/aws";

// Runtime check for AWS Bucket Name
if (!process.env.AWS_BUCKET_NAME) {
  throw new Error("Missing required AWS environment variable: AWS_BUCKET_NAME");
}
const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

const renameUploadSchema = z.object({
  oldKey: z.string().min(1, "Old key is required."),
  newFileName: z.string().min(1, "New file name is required."),
});
type RenameUploadInput = z.infer<typeof renameUploadSchema>;

type ActionResponse = {
  success: boolean;
  data?: {
    newKey: string;
  };
  error?: string;
};

/**
 * Renames a file in the S3 bucket by copying it to a new key and deleting the old one.
 * Verifies user ownership via object metadata before performing the operation.
 *
 * @param values The input data containing the old S3 object key and the desired new file name.
 * @returns A promise that resolves to an object indicating success and the new key, or failure.
 */
export async function renameUpload(values: RenameUploadInput): Promise<ActionResponse> {
  try {
    // Authenticate the user
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }
    const userId = session.user.id;

    // Validate the input parameters
    const parseResult = renameUploadSchema.safeParse(values);
    if (!parseResult.success) {
      return { success: false, error: "Invalid input provided." };
    }

    const { oldKey, newFileName } = parseResult.data;

    // Fetch the object's metadata to verify ownership
    const headCommand = new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: oldKey });
    const objectMetadata = await s3.send(headCommand);
    const keyOwnerId = objectMetadata.Metadata?.userid;

    if (keyOwnerId !== userId) {
      return {
        success: false,
        error: "Forbidden: You do not have permission to rename this file.",
      };
    }

    // Construct the new key while preserving the original folder structure and extension
    const oldPath = path.dirname(oldKey);
    const oldExtension = path.extname(oldKey);
    // Sanitize the new base name provided by the user
    const newBaseName = path.basename(newFileName, path.extname(newFileName));
    const sanitizedBaseName = newBaseName.replace(/[^a-zA-Z0-9-]/g, "-");
    const newKey = `${oldPath}/${sanitizedBaseName}${oldExtension}`;

    // If the new key is the same as the old key after sanitization, there's nothing to do
    if (newKey === oldKey) {
      return { success: true, data: { newKey: oldKey } };
    }

    // Create and execute the CopyObject command
    const copyCommand = new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${oldKey}`,
      Key: newKey,
      Metadata: objectMetadata.Metadata,
      MetadataDirective: "REPLACE",
    });
    await s3.send(copyCommand);

    // Create and execute the DeleteObject command for the old object
    const deleteCommand = new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: oldKey });
    await s3.send(deleteCommand);

    return { success: true, data: { newKey } };
  } catch (error) {
    console.error("Error renaming file in S3:", error);
    return { success: false, error: "An internal server error occurred while renaming the file." };
  }
}
