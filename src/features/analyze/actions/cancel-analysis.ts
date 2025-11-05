"use server";

import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases, detections, uploads } from "@/db/schema";
import { privateActionLimiter } from "@/lib/rate-limiter";

// Schema for validating the case ID input.
const CancelAnalysisSchema = z.object({
  caseId: z.string().cuid2("Invalid Case ID"),
});

type CancelAnalysisState = {
  status: "success" | "error";
  message: string;
};

/**
 * Cancels a running analysis by deleting its corresponding record from the `analysisResults` table.
 * This effectively stops the frontend from receiving a "completed" status and prevents
 * the final results from being saved if the analysis process on FastAPI finishes.
 *
 * @param {object} values - The input values.
 * @param {string} values.caseId - The ID of the case whose analysis should be cancelled.
 * @returns {Promise<CancelAnalysisState>} - An object indicating the outcome of the operation.
 */
export const cancelAnalysis = async (
  values: z.infer<typeof CancelAnalysisSchema>
): Promise<CancelAnalysisState> => {
  const session = await auth();

  // Ensure the user is authenticated before proceeding.
  if (!session?.user?.id) {
    return {
      status: "error",
      message: "You must be logged in to perform this action.",
    };
  }

  // Apply rate limiting to prevent abuse.
  const { success } = await privateActionLimiter.limit(session.user.id);
  if (!success) {
    return {
      status: "error",
      message: "Rate limit exceeded. Please try again later.",
    };
  }

  const validatedFields = CancelAnalysisSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      status: "error",
      message: "Invalid input provided. Please try again.",
    };
  }

  const { caseId } = validatedFields.data;

  try {
    // Execute all cleanup operations atomically within a transaction.
    await db.transaction(async (tx) => {
      // Retrieve all upload IDs associated with the case.
      const caseUploads = await tx
        .select({ id: uploads.id })
        .from(uploads)
        .where(eq(uploads.caseId, caseId));

      const uploadIds = caseUploads.map((u) => u.id);

      // Delete all detections linked to the case's uploads to prevent duplicates on resubmission.
      if (uploadIds.length > 0) {
        await tx.delete(detections).where(inArray(detections.uploadId, uploadIds));
      }

      // Delete the analysis results record.
      await tx.delete(analysisResults).where(eq(analysisResults.caseId, caseId));

      // Revert the case status back to "draft" so the user can edit it again.
      await tx.update(cases).set({ status: "draft" }).where(eq(cases.id, caseId));
    });

    return {
      status: "success",
      message: "Analysis has been successfully cancelled.",
    };
  } catch (error) {
    console.error("Failed to cancel analysis:", error);
    return {
      status: "error",
      message: "A database error occurred. Please try again.",
    };
  }
};
