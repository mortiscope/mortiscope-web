"use server";

import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { DeleteUploadInput, deleteUploadSchema } from "@/features/analyze/schemas/upload";
import { s3 } from "@/lib/aws";

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
  error?: string;
};

/**
 * Deletes a file from the S3 bucket after verifying user ownership via object metadata.
 * This approach is more robust than parsing the object key.
 *
 * @param values The input data containing the S3 object key.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function deleteUpload(values: DeleteUploadInput): Promise<ActionResponse> {
  try {
    // Authenticate the user
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }
    const userId = session.user.id;

    // Validate the input parameters
    const parseResult = deleteUploadSchema.safeParse(values);

    if (!parseResult.success) {
      // Return a detailed error response for invalid input
      return {
        success: false,
        error: "Invalid input provided.",
      };
    }

    const { key } = parseResult.data;

    // Create a command to fetch the object's metadata without downloading the object body.
    const headCommand = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const objectMetadata = await s3.send(headCommand);

    // Extract the owner's user ID from the custom metadata.
    const keyOwnerId = objectMetadata.Metadata?.userid;

    // Ensures a user can only delete their own files by checking the embedded metadata.
    if (keyOwnerId !== userId) {
      console.warn(
        `Forbidden Deletion Attempt: User '${userId}' tried to delete key '${key}' owned by '${
          keyOwnerId ?? "unknown"
        }'.`
      );
      return {
        success: false,
        error: "Forbidden: You do not have permission to delete this file.",
      };
    }

    // Ddelete the corresponding record from the database.
    await db.delete(uploads).where(and(eq(uploads.key, key), eq(uploads.userId, userId)));

    try {
      // Create and execute the S3 command for a DELETE operation.
      const deleteCommand = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      });
      await s3.send(deleteCommand);
    } catch (s3Error) {
      // If this block is reached, the database record was deleted but the S3 object was not.
      console.error(
        `CRITICAL: Orphaned S3 Object. DB record deleted but S3 deletion failed for key: '${key}'. User: '${userId}'.`,
        s3Error
      );
    }

    // Return a success response
    return { success: true };
  } catch (error) {
    // This outer catch block handles errors from the initial auth, validation, S3 metadata check, or DB delete.
    console.error("Error deleting file:", error);
    // Return a generic error to avoid leaking implementation details
    return {
      success: false,
      error: "An internal server error occurred while deleting the file.",
    };
  }
}
