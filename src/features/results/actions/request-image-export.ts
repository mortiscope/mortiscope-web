"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/db";
import { exports, uploads } from "@/db/schema";
import { inngest } from "@/lib/inngest";

/**
 * Creates an export record for a single image and dispatches an Inngest event.
 *
 * @param {object} params - The parameters for the export request.
 * @param {string} params.uploadId - The ID of the specific upload (image) to be exported.
 * @param {'raw_data' | 'labelled_images'} params.format - The desired export format.
 * @returns {Promise<{success?: string; error?: string; exportId?: string}>} An object indicating the result.
 */
export const requestImageExport = async ({
  uploadId,
  format,
}: {
  uploadId: string;
  format: "raw_data" | "labelled_images";
}): Promise<{ success?: string; error?: string; exportId?: string }> => {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "Unauthorized: You must be logged in to perform this action." };
  }

  try {
    // Verify that the upload exists and belongs to the current user.
    const imageToExport = await db.query.uploads.findFirst({
      where: and(eq(uploads.id, uploadId), eq(uploads.userId, session.user.id)),
      columns: { id: true, caseId: true },
    });

    if (!imageToExport || !imageToExport.caseId) {
      return { error: "Image not found or you do not have permission to export it." };
    }

    // Create a new record in the `exports` table to track this job.
    const [newExport] = await db
      .insert(exports)
      .values({
        // The export is linked to the parent case for context.
        caseId: imageToExport.caseId,
        userId: session.user.id,
        format,
        status: "pending",
      })
      .returning();

    // Send the specific single-image export event to Inngest.
    await inngest.send({
      name: "export/image.data.requested",
      data: {
        exportId: newExport.id,
        uploadId: uploadId,
        userId: session.user.id,
        format: format,
      },
    });

    // Revalidate the path to ensure any interface that shows export status is updated.
    revalidatePath(`/results/${imageToExport.caseId}`);

    // Return the success message.
    return { success: "Image export started.", exportId: newExport.id };
  } catch (error) {
    console.error("Failed to initiate image export process:", error);
    return { error: "An unexpected error occurred. Please try again later." };
  }
};
