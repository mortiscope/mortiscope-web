"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases } from "@/db/schema";
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
    // Delete the analysis results entry for the given case ID.
    const [deletedResult] = await db
      .delete(analysisResults)
      .where(eq(analysisResults.caseId, caseId))
      .returning({ id: analysisResults.caseId });

    // Revert the case status back to "draft" so the user can edit it again.
    await db.update(cases).set({ status: "draft" }).where(eq(cases.id, caseId));

    // If no row was deleted, it might be because the analysis already finished or was cancelled.
    if (!deletedResult) {
      return {
        status: "success",
        message: "Analysis has been successfully cancelled.",
      };
    }

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
