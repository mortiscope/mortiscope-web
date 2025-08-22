"use server";

import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases, uploads } from "@/db/schema";

/**
 * A server action that fetches a specific image with its detections for the annotation editor.
 * It verifies that the user is authenticated and owns the case before returning the data.
 *
 * @param imageId The ID of the image to fetch.
 * @param resultsId The ID of the case that the image belongs to.
 * @returns An object containing the image data with detections, or null if not found/unauthorized.
 */
export async function getEditorImage(imageId: string, resultsId: string) {
  // Verify that the user is authenticated.
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  try {
    // First, verify that the case exists and belongs to the current user.
    const caseData = await db.query.cases.findFirst({
      where: and(eq(cases.id, resultsId), eq(cases.userId, session.user.id)),
      columns: {
        id: true,
        status: true,
      },
    });

    // If the case doesn't exist, doesn't belong to the user, or is a draft, return null.
    if (!caseData || caseData.status === "draft") {
      return null;
    }

    // Fetch the image with its detections.
    const imageData = await db.query.uploads.findFirst({
      where: and(eq(uploads.id, imageId), eq(uploads.caseId, resultsId)),
      with: {
        detections: true,
      },
    });

    if (!imageData) {
      return null;
    }

    // Return the image data in a format compatible with the editor viewer.
    return {
      id: imageData.id,
      name: imageData.name,
      url: imageData.url,
      size: imageData.size,
      dateUploaded: imageData.createdAt,
      detections: imageData.detections,
    };
  } catch (error) {
    console.error("Error fetching editor image:", error);
    return null;
  }
}
