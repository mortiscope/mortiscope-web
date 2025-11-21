"use server";

import { DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { type ServerActionResponse } from "@/features/cases/constants/types";
import { s3 } from "@/lib/aws";
import { env } from "@/lib/env";
import { logCritical, logError, s3Logger, uploadLogger } from "@/lib/logger";

// Schema is now defined directly in the file that uses it.
const deleteUploadSchema = z.object({
  key: z.string().min(1, "File key is required."),
});

type DeleteUploadInput = z.infer<typeof deleteUploadSchema>;

/**
 * Deletes a file from the S3 bucket after verifying user ownership via object metadata.
 *
 * @param values The input data containing the S3 object key.
 * @returns A promise that resolves to an object indicating success or failure.
 */
export async function deleteUpload(values: DeleteUploadInput): Promise<ServerActionResponse> {
  // Authenticate the user
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = session.user.id;
  const BUCKET_NAME = env.AWS_BUCKET_NAME;

  try {
    // Validate the input parameters
    const parseResult = deleteUploadSchema.safeParse(values);

    if (!parseResult.success) {
      return { success: false, error: "Invalid input provided." };
    }

    const { key } = parseResult.data;

    const headCommand = new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key });
    const objectMetadata = await s3.send(headCommand);

    // Extract the owner's user ID from the custom metadata.
    const keyOwnerId = objectMetadata.Metadata?.userid;

    // Ensures a user can only delete their own files by checking the embedded metadata.
    if (keyOwnerId !== userId) {
      uploadLogger.warn(
        { userId, key, keyOwnerId: keyOwnerId ?? "unknown" },
        "Forbidden deletion attempt: User tried to delete file owned by another user"
      );
      return {
        success: false,
        error: "Forbidden: You do not have permission to delete this file.",
      };
    }

    // Ddelete the corresponding record from the database.
    await db.delete(uploads).where(and(eq(uploads.key, key), eq(uploads.userId, userId)));

    try {
      const deleteCommand = new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key });
      await s3.send(deleteCommand);
      s3Logger.info({ userId, key }, "File successfully deleted from S3");
    } catch (s3Error) {
      // If this block is reached, the database record was deleted but the S3 object was not.
      logCritical(
        s3Logger,
        "Orphaned S3 Object. DB record deleted but S3 deletion failed",
        s3Error,
        { key, userId, requiresManualCleanup: true }
      );
    }

    // Return a success response
    return { success: true };
  } catch (error) {
    // This outer catch block handles errors from the initial auth, validation, S3 metadata check, or DB delete.
    logError(uploadLogger, "Error deleting file", error, { userId, key: values.key });
    return { success: false, error: "An internal server error occurred while deleting the file." };
  }
}
