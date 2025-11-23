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

const renameImageSchema = z.object({
  imageId: z.string().min(1, "Image ID is required."),
  newName: z.string().min(1, "New file name is required."),
});
type RenameImageInput = z.infer<typeof renameImageSchema>;

type ActionResponse = {
  success: boolean;
  data?: {
    newKey: string;
    newUrl: string;
  };
  error?: string;
};

/**
 * Renames an image file in S3 and updates its record in the database.
 * This action finds the image by its database ID and verifies user ownership.
 *
 * @param values The input data containing the image ID and the desired new file name.
 * @returns A promise resolving to an object indicating success or failure.
 */
export async function renameImage(values: RenameImageInput): Promise<ActionResponse> {
  // Authenticate the user
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized. Please sign in." };
  }
  const userId = session.user.id;

  const BUCKET_NAME = env.AWS_BUCKET_NAME;
  const BUCKET_REGION = env.AWS_BUCKET_REGION;

  try {
    // Validate the input parameters
    const parseResult = renameImageSchema.safeParse(values);
    if (!parseResult.success) {
      return { success: false, error: "A new name is required." };
    }
    const { imageId, newName } = parseResult.data;

    // Fetch the upload record from the DB to get the key and verify ownership
    const imageRecord = await db.query.uploads.findFirst({
      where: and(eq(uploads.id, imageId), eq(uploads.userId, userId)),
    });

    if (!imageRecord) {
      return {
        success: false,
        error: "You do not have permission to rename this file or it does not exist.",
      };
    }

    // Add a guard clause to ensure the image is associated with a case.
    if (!imageRecord.caseId) {
      console.error(`Attempted to rename image ID ${imageId} which is missing a caseId.`);
      return {
        success: false,
        error: "Cannot rename image: The image is not part of a case.",
      };
    }

    const oldKey = imageRecord.key;

    // Construct the new key while preserving the folder and extension
    const oldPath = path.dirname(oldKey);
    const oldExtension = path.extname(oldKey);
    const newBaseName = path.basename(newName, path.extname(newName));
    const sanitizedBaseName = newBaseName.replace(/[^a-zA-Z0-9-]/g, "-");
    const finalNewFileName = `${sanitizedBaseName}${oldExtension}`;
    const newKey = `${oldPath}/${finalNewFileName}`;

    // If the new key is the same as the old key, no action is needed
    if (newKey === oldKey) {
      return { success: true };
    }

    // Pre-check for duplicates
    const existingFile = await db.query.uploads.findFirst({
      // After the guard clause above, TypeScript now knows imageRecord.caseId is a string.
      where: and(eq(uploads.name, finalNewFileName), eq(uploads.caseId, imageRecord.caseId)),
    });

    if (existingFile) {
      return {
        success: false,
        error: "A file with this name already exists in this case.",
      };
    }

    // Fetch S3 object metadata
    const headCommand = new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: oldKey });
    const objectMetadata = await s3.send(headCommand);

    const newUrl = `https://${BUCKET_NAME}.s3.${BUCKET_REGION}.amazonaws.com/${newKey}`;

    // Copy the object to the new key in S3
    const copyCommand = new CopyObjectCommand({
      Bucket: BUCKET_NAME,
      CopySource: `${BUCKET_NAME}/${oldKey}`,
      Key: newKey,
      Metadata: objectMetadata.Metadata,
      MetadataDirective: "REPLACE",
      ServerSideEncryption: "AES256",
    });
    await s3.send(copyCommand);

    // Delete the old object from S3
    const deleteCommand = new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: oldKey });
    await s3.send(deleteCommand);

    // Update the record in the database using the image ID
    try {
      await db
        .update(uploads)
        .set({
          name: finalNewFileName,
          key: newKey,
          url: newUrl,
        })
        .where(eq(uploads.id, imageId));
    } catch (dbError) {
      console.error(
        `CRITICAL: DB update failed after S3 rename. User: ${userId}, Old Key: ${oldKey}, New Key: ${newKey}`,
        dbError
      );
      return {
        success: false,
        error: "File was renamed, but a database error occurred.",
      };
    }

    // Return the authenticated proxy URL to the client for immediate display.
    return { success: true, data: { newKey, newUrl: `/api/images/${imageId}` } };
  } catch (error) {
    console.error("Error renaming image:", error);
    return {
      success: false,
      error: "An internal server error occurred while renaming the file. Please try again later.",
    };
  }
}
