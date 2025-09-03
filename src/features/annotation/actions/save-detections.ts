"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases, detections, uploads } from "@/db/schema";
import { type Detection } from "@/features/images/hooks/use-results-image-viewer";
import { STAGE_HIERARCHY } from "@/lib/constants";

/**
 * Finds the oldest stage among the given detections.
 * Adults are excluded from consideration as they are not used for PMI calculation.
 *
 * @param detections Array of detections to analyze
 * @returns The oldest stage label, or null if all detections are adults or no detections exist
 */
function findOldestStage(detections: Detection[]): string | null {
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
 * Defines the shape for a newly created detection that has not yet been saved to the database.
 */
export interface NewDetection {
  uploadId: string;
  label: string;
  originalLabel: string;
  confidence: number | null;
  originalConfidence: number | null;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  status: "user_created" | "user_confirmed" | "user_edited" | "user_edited_confirmed";
}

/**
 * Defines the shape for an existing detection that has been modified on the client.
 */
export interface ModifiedDetection {
  id: string;
  label: string;
  confidence: number | null;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  status:
    | "user_created"
    | "user_confirmed"
    | "user_edited"
    | "user_edited_confirmed"
    | "model_generated";
}

/**
 * Defines the structure for the changeset object, which contains arrays of
 * added, modified, and deleted detections to be synchronized with the database.
 */
export interface DetectionChanges {
  added: NewDetection[];
  modified: ModifiedDetection[];
  deleted: string[];
}

/**
 * A server action to save a changeset of detection modifications (add, modify, delete)
 * for a specific image. It includes authorization checks to ensure the user owns
 * the case and the image. The database operations are performed sequentially.
 *
 * @param imageId The unique ID of the image being edited.
 * @param resultsId The unique ID of the parent case.
 * @param changes An object containing the arrays of added, modified, and deleted detections.
 * @returns A promise resolving to a structured response object.
 */
export async function saveDetections(
  imageId: string,
  resultsId: string,
  changes: DetectionChanges
) {
  // Authenticate the user's session.
  const session = await auth();

  if (!session?.user?.id) {
    return { success: false as const, error: "Unauthorized" };
  }

  const userId = session.user.id;

  try {
    // Verify that the user owns the specified case and it's not a draft.
    const caseData = await db.query.cases.findFirst({
      where: and(eq(cases.id, resultsId), eq(cases.userId, userId)),
      columns: { id: true, status: true },
    });

    if (!caseData || caseData.status === "draft") {
      return { success: false as const, error: "Case not found or unauthorized." };
    }

    // Verify that the specified image belongs to the case.
    const imageData = await db.query.uploads.findFirst({
      where: and(eq(uploads.id, imageId), eq(uploads.caseId, resultsId)),
      columns: { id: true },
    });

    if (!imageData) {
      return { success: false as const, error: "Image not found." };
    }

    // Handle deletions by performing a soft delete by setting the `deletedAt` timestamp.
    if (changes.deleted.length > 0) {
      await db
        .update(detections)
        .set({ deletedAt: new Date(), lastModifiedById: userId })
        .where(
          and(
            inArray(detections.id, changes.deleted),
            eq(detections.uploadId, imageId),
            isNull(detections.deletedAt)
          )
        );
    }

    // Handle additions by inserting the new detection records.
    if (changes.added.length > 0) {
      await db.insert(detections).values(
        changes.added.map((d) => ({
          ...d,
          createdById: userId,
          lastModifiedById: null,
        }))
      );
    }

    // Handle the modifications by iterating and updating each modified detection individually.
    if (changes.modified.length > 0) {
      // Fetch original detections to compare and determine if they were actually edited
      const originalDetections = await db.query.detections.findMany({
        where: and(eq(detections.uploadId, imageId), isNull(detections.deletedAt)),
      });
      const originalMap = new Map(originalDetections.map((det) => [det.id, det]));

      for (const d of changes.modified) {
        const original = originalMap.get(d.id);

        // Determine if the detection was actually edited or just confirmed
        const wasEdited =
          original &&
          (d.label !== original.label ||
            d.xMin !== original.xMin ||
            d.yMin !== original.yMin ||
            d.xMax !== original.xMax ||
            d.yMax !== original.yMax);

        // Determine the correct status based on whether it was edited and/or confirmed
        let finalStatus: "user_confirmed" | "user_edited" | "user_edited_confirmed";
        if (wasEdited) {
          // If edited and user clicked verify, mark as user edited confirmed
          finalStatus = d.status === "user_confirmed" ? "user_edited_confirmed" : "user_edited";
        } else {
          // If not edited, use the status from frontend
          finalStatus = d.status === "user_confirmed" ? "user_confirmed" : "user_edited";
        }

        await db
          .update(detections)
          .set({
            label: d.label,
            confidence: d.confidence,
            xMin: d.xMin,
            yMin: d.yMin,
            xMax: d.xMax,
            yMax: d.yMax,
            status: finalStatus,
            lastModifiedById: userId,
          })
          .where(
            and(
              eq(detections.id, d.id),
              eq(detections.uploadId, imageId),
              isNull(detections.deletedAt)
            )
          );
      }
    }

    // After all changes are applied, fetch the final, complete set of non-deleted detections for the image.
    const updatedDetections = await db.query.detections.findMany({
      where: and(eq(detections.uploadId, imageId), isNull(detections.deletedAt)),
    });

    // Check if recalculation is needed by comparing the oldest stage before and after changes
    const analysisResult = await db.query.analysisResults.findFirst({
      where: eq(analysisResults.caseId, resultsId),
      columns: { stageUsedForCalculation: true },
    });

    // Get all uploads for this case
    const caseUploads = await db.query.uploads.findMany({
      where: eq(uploads.caseId, resultsId),
      columns: { id: true },
    });

    const uploadIds = caseUploads.map((u) => u.id);

    // Find the oldest stage across all detections in the case
    let oldestStageAfterChanges: string | null = null;

    if (uploadIds.length > 0) {
      const allCaseDetections = await db.query.detections.findMany({
        where: and(inArray(detections.uploadId, uploadIds), isNull(detections.deletedAt)),
      });

      oldestStageAfterChanges = findOldestStage(allCaseDetections as Detection[]);
    }

    // Compare with the stage that was previously used for calculation
    const stageChanged = oldestStageAfterChanges !== analysisResult?.stageUsedForCalculation;

    // Update the case flag if recalculation is needed
    if (stageChanged) {
      await db.update(cases).set({ recalculationNeeded: true }).where(eq(cases.id, resultsId));
    }

    // Return the updated list to the client for state synchronization.
    return {
      success: true as const,
      detections: updatedDetections as Detection[],
    };
  } catch (error) {
    // Catch any unexpected errors during the process.
    console.error("Error saving detections:", error);
    return { success: false as const, error: "Failed to save detections." };
  }
}
