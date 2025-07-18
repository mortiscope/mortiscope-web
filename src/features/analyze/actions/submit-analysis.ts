"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases } from "@/db/schema";
import { inngest } from "@/lib/inngest";

/**
 * Defines the schema for the input data, expecting just the caseId.
 */
const submitAnalysisSchema = z.object({
  caseId: z.string().cuid2("Invalid Case ID"),
});

/**
 * Defines the structured return type for the server action.
 */
type ActionResponse = {
  success: boolean;
  message?: string;
  error?: string;
};

/**
 * Triggers the asynchronous analysis workflow for a given case.
 * This action is called from the final "Review and Submit" step.
 *
 * @param values An object containing the caseId.
 * @returns A promise resolving to a success or error message.
 */
export async function submitAnalysis(values: { caseId: string }): Promise<ActionResponse> {
  // Authenticate the user session.
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, error: "Unauthorized" };
  }
  const userId = session.user.id;

  // Validate the input to ensure we have a valid case ID.
  const parseResult = submitAnalysisSchema.safeParse(values);
  if (!parseResult.success) {
    return { success: false, error: "Invalid input provided." };
  }
  const { caseId } = parseResult.data;

  try {
    // Verify that the case exists and belongs to the authenticated user before proceeding.
    const existingCase = await db.query.cases.findFirst({
      where: and(eq(cases.id, caseId), eq(cases.userId, userId), eq(cases.status, "draft")),
      columns: { id: true },
    });

    if (!existingCase) {
      // If the case is not found, it's either already submitted or doesn't exist.
      return { success: false, error: "Case not found or has already been submitted." };
    }

    // Update the case status from 'draft' to 'active'.
    await db.update(cases).set({ status: "active" }).where(eq(cases.id, caseId));

    // Create the initial 'pending' record in the analysis_results table.
    await db.insert(analysisResults).values({
      caseId,
      status: "pending",
    });

    // If the database operations were successful, send the event to Inngest.
    await inngest.send({
      name: "analysis/request.sent",
      data: { caseId },
    });

    return { success: true, message: "Analysis has been successfully submitted." };
  } catch (error) {
    console.error("Error submitting analysis:", error);

    // Return a generic error to the client instead of the specific database error.
    return { success: false, error: "An internal server error occurred." };
  }
}
