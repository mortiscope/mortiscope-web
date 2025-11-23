"use server";

import { CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import path from "path";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import { uploads } from "@/db/schema";
import { s3 } from "@/lib/aws";
import { env } from "@/lib/env";
import { logCritical, logError, uploadLogger } from "@/lib/logger";

const renameUploadSchema = z.object({
  oldKey: z.string().min(1, "Old key is required."),
  newFileName: z.string().min(1, "New file name is required."),
});
type RenameUploadInput = z.infer<typeof renameUploadSchema>;

type ActionResponse = {
  success: boolean;
  data?: {
    newKey: string;
    newUrl: string;
  };
  error?: string;
};

/**
 * Renames a file in S3 and updates its corresponding record in the database.
 * Verifies user ownership via object metadata before performing the operation.
 *
 * @param values The input data containing the old S3 object key and the desired new file name.
 * @returns A promise that resolves to an object indicating success and the new key/URL, or failure.
 */
export async function renameUpload(values: RenameUploadInput): Promise<ActionResponse> {
  // Authenticate the user
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = session.user.id;
  const BUCKET_NAME = env.AWS_BUCKET_NAME;
  const BUCKET_REGION = env.AWS_BUCKET_REGION;

  try {
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

    // Look up the upload record to retrieve its database ID for the response URL.
    const uploadRecord = await db.query.uploads.findFirst({
      where: and(eq(uploads.key, oldKey), eq(uploads.userId, userId)),
      columns: { id: true },
    });

    if (!uploadRecord) {
      return { success: false, error: "Upload record not found." };
    }

    const uploadId = uploadRecord.id;

    // Construct the new key while preserving the original folder structure and extension
    const oldPath = path.dirname(oldKey);
    const oldExtension = path.extname(oldKey);
    // Sanitize the new base name provided by the user
    const newBaseName = path.basename(newFileName, path.extname(newFileName));
    const sanitizedBaseName = newBaseName.replace(/[^a-zA-Z0-9-]/g, "-");
    const finalNewFileName = `${sanitizedBaseName}${oldExtension}`;
    const newKey = `${oldPath}/${finalNewFileName}`;

    // Construct the new S3 URL for database storage (backward compatibility).
    const newUrl = `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/${newKey}`;

    // If the new key is the same as the old key after sanitization, there's nothing to do.
    if (newKey === oldKey) {
      return { success: true, data: { newKey: oldKey, newUrl: `/api/images/${uploadId}` } };
    }

    // Create and execute the CopyObject command
    const copyCommand = new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${oldKey}`,
      Key: newKey,
      Metadata: objectMetadata.Metadata,
      MetadataDirective: "REPLACE",
      ServerSideEncryption: "AES256",
    });
    await s3.send(copyCommand);

    // Create and execute the DeleteObject command for the old object
    const deleteCommand = new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: oldKey });
    await s3.send(deleteCommand);

    // After successful S3 operations, update the record in the database
    try {
      await db
        .update(uploads)
        .set({
          name: finalNewFileName,
          key: newKey,
          url: newUrl,
        })
        .where(and(eq(uploads.key, oldKey), eq(uploads.userId, userId)));
    } catch (dbError) {
      // The S3 object was renamed, but the database update failed.
      logCritical(uploadLogger, "DB update failed after S3 rename", dbError, {
        userId,
        oldKey,
        newKey,
        requiresManualIntervention: true,
      });
      return {
        success: false,
        error: "File was renamed, but a database error occurred. Please contact support.",
      };
    }

    // Return the authenticated proxy URL to the client for immediate display.
    return { success: true, data: { newKey, newUrl: `/api/images/${uploadId}` } };
  } catch (error) {
    // This outer catch handles errors from S3 (copy/delete) or the initial metadata check.
    logError(uploadLogger, "Error renaming file", error, {
      userId,
      oldKey: values.oldKey,
      newFileName: values.newFileName,
    });
    return {
      success: false,
      error: "An internal server error occurred while renaming the file.",
    };
  }
}
