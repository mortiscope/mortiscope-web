"use server";

import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { and, count, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases, detections, uploads } from "@/db/schema";
import { s3 } from "@/lib/aws";
import { config } from "@/lib/config";
import { STAGE_HIERARCHY } from "@/lib/constants";

/**
 * Finds the oldest stage among the given detections.
 * Adults are excluded from consideration as they are not used for PMI calculation.
 *
 * @param detections Array of detections to analyze
 * @returns The oldest stage label, or null if all detections are adults or no detections exist
 */
function findOldestStage(detections: Array<{ label: string }>): string | null {
  const immatureDetections = detections.filter((d) => d.label !== "adult");

  if (immatureDetections.length === 0) {
    return null;
  }

  let oldestStage = immatureDetections[0].label;
  let highestHierarchy = STAGE_HIERARCHY[oldestStage] ?? 0;

  for (const detection of immatureDetections) {
    const hierarchy = STAGE_HIERARCHY[detection.label] ?? 0;
    if (hierarchy > highestHierarchy) {
      highestHierarchy = hierarchy;
      oldestStage = detection.label;
    }
  }

  return oldestStage;
}

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

    // If the image belonged to a case, check if recalculation is needed
    if (imageRecord.caseId) {
      // Get the current stage used for calculation
      const analysisResult = await db.query.analysisResults.findFirst({
        where: eq(analysisResults.caseId, imageRecord.caseId),
        columns: { stageUsedForCalculation: true },
      });

      // Get all remaining uploads for the case after deletion
      const caseUploads = await db.query.uploads.findMany({
        where: eq(uploads.caseId, imageRecord.caseId),
        columns: { id: true },
      });

      const uploadIds = caseUploads.map((u) => u.id);

      // Find the oldest stage among remaining detections in the case
      let oldestStageAfterDeletion: string | null = null;

      if (uploadIds.length > 0) {
        const allCaseDetections = await db.query.detections.findMany({
          where: and(inArray(detections.uploadId, uploadIds), isNull(detections.deletedAt)),
        });

        oldestStageAfterDeletion = findOldestStage(allCaseDetections);
      }

      // Compare with the stage that was previously used for calculation
      const stageChanged = oldestStageAfterDeletion !== analysisResult?.stageUsedForCalculation;

      if (stageChanged) {
        await db
          .update(cases)
          .set({ recalculationNeeded: true })
          .where(eq(cases.id, imageRecord.caseId));
      }
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
