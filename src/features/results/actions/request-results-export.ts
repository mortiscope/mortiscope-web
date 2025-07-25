"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases, exports } from "@/db/schema";
import { inngest } from "@/lib/inngest";

/**
 * Creates a new export record in the database and dispatches an Inngest event to trigger the asynchronous export process.
 *
 * @param {object} params - The parameters for the export request.
 * @param {string} params.caseId - The ID of the case to be exported.
 * @param {'raw_data' | 'pdf' | 'labelled_images'} params.format - The desired export format.
 * @returns {Promise<{success?: string; error?: string; exportId?: string}>} An object indicating the result.
 */
export const requestResultsExport = async ({
  caseId,
  format,
}: {
  caseId: string;
  format: "raw_data" | "pdf" | "labelled_images";
}): Promise<{ success?: string; error?: string; exportId?: string }> => {
  const session = await auth();

  // Ensure the user is authenticated.
  if (!session?.user?.id) {
    return { error: "Unauthorized: You must be logged in to perform this action." };
  }

  try {
    // Verify that the case exists and belongs to the current user.
    const caseToExport = await db.query.cases.findFirst({
      where: and(eq(cases.id, caseId), eq(cases.userId, session.user.id)),
      columns: { id: true },
    });

    if (!caseToExport) {
      return { error: "Case not found or you do not have permission to export it." };
    }

    // Create a new record in the `exports` table to track this job.
    const [newExport] = await db
      .insert(exports)
      .values({
        caseId,
        userId: session.user.id,
        format,
        status: "pending",
      })
      .returning();

    // Send an event to Inngest to start the background processing.
    await inngest.send({
      name: "export/case.data.requested",
      data: {
        exportId: newExport.id,
        caseId: caseId,
        userId: session.user.id,
        format: format,
      },
    });

    // Revalidate the path to ensure any interface that shows export status is updated.
    revalidatePath(`/results/${caseId}`);

    // Return the success message.
    return { success: "Export process has been successfully initiated.", exportId: newExport.id };
  } catch (error) {
    console.error("Failed to initiate export process:", error);
    return { error: "An unexpected error occurred. Please try again later." };
  }
};
