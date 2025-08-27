"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases, detections, uploads } from "@/db/schema";
import { type Detection } from "@/features/images/hooks/use-results-image-viewer";

/**
 * Defines the shape for a newly created detection that has not yet been saved to the database.
 */
export interface NewDetection {
  uploadId: string;
  label: string;
  confidence: number | null;
  originalConfidence: number | null;
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  status: "user_created" | "user_confirmed" | "user_edited";
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
  status: "user_created" | "user_confirmed" | "user_edited" | "model_generated";
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
      for (const d of changes.modified) {
        await db
          .update(detections)
          .set({
            label: d.label,
            confidence: d.confidence,
            xMin: d.xMin,
            yMin: d.yMin,
            xMax: d.xMax,
            yMax: d.yMax,
            // Ensure the status reflects the user's action.
            status: d.status === "user_confirmed" ? "user_confirmed" : "user_edited",
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
