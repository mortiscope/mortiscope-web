"use server";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases, uploads } from "@/db/schema";
import { s3 } from "@/lib/aws";
import { config } from "@/lib/config";

/**
 * Securely deletes an image from S3 and the database.
 *
 * This action verifies user ownership before proceeding.
 * It first deletes the object from S3, and upon success, deletes the
 * corresponding record from the database.
 *
 * @param {object} params - The parameters for the deletion.
 * @param {string} params.imageId - The ID of the image upload to delete.
 * @param {string} [params.imageName] - Optional name of the image for success message.
 * @returns {Promise<{success?: string; error?: string}>} An object indicating the result.
 */
export const deleteImage = async ({
  imageId,
  imageName,
}: {
  imageId: string;
  imageName?: string;
}): Promise<{ success?: string; error?: string }> => {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized: You must be logged in." };
  }

  try {
    // Find the upload record to get its S3 key and verify ownership.
    const imageRecord = await db.query.uploads.findFirst({
      where: and(eq(uploads.id, imageId), eq(uploads.userId, session.user.id)),
      columns: {
        key: true,
        caseId: true,
        name: true,
      },
    });

    if (!imageRecord) {
      return { error: "Image not found or you do not have permission to delete it." };
    }

    // Server-side validation to prevent deleting the last image in a case.
    if (imageRecord.caseId) {
      const [{ imageCount }] = await db
        .select({ imageCount: count() })
        .from(uploads)
        .where(eq(uploads.caseId, imageRecord.caseId));

      if (imageCount <= 1) {
        return { error: "A case must have at least one image." };
      }
    }

    // Delete the object from S3 first.
    const deleteCommand = new DeleteObjectCommand({
      // Use the bucket name from the config object.
      Bucket: config.aws.s3BucketName,
      Key: imageRecord.key,
    });
    await s3.send(deleteCommand);

    // If S3 deletion is successful, delete the record from the database.
    await db.delete(uploads).where(eq(uploads.id, imageId));

    // If the image belonged to a case, mark that case as needing recalculation.
    if (imageRecord.caseId) {
      await db
        .update(cases)
        .set({ recalculationNeeded: true })
        .where(eq(cases.id, imageRecord.caseId));
    }

    // Revalidate the path to ensure server-rendered components are updated.
    if (imageRecord.caseId) {
      revalidatePath(`/results/${imageRecord.caseId}`);
    }

    // Use provided name or fallback to database name or generic message
    const displayName = imageName || imageRecord.name || "File";
    return { success: `${displayName} successfully deleted.` };
  } catch (error) {
    console.error("Failed to delete image:", error);
    // Provide a generic error to the user for security.
    return { error: "An unexpected error occurred while deleting the image." };
  }
};
