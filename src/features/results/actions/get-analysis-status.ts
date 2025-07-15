"use server";

import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases } from "@/db/schema";

/**
 * The expected return type for the analysis status check.
 */
export type AnalysisStatus = "pending" | "processing" | "completed" | "failed" | "not_found";

/**
 * Fetches the current status of a specific analysis case for the authenticated user.
 * This is a lightweight action designed to be polled by the client.
 *
 * @param caseId The ID of the case to check.
 * @returns A promise that resolves to the current analysis status.
 * @throws An error if the user is not authenticated.
 */
export const getAnalysisStatus = async (caseId: string): Promise<AnalysisStatus> => {
  // Retrieve the current session to identify and authorize the user.
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }

  // Query for the analysis result to ensure the case also belongs to the current user for security.
  const result = await db
    .select({
      status: analysisResults.status,
    })
    .from(analysisResults)
    .innerJoin(cases, eq(analysisResults.caseId, cases.id))
    .where(and(eq(analysisResults.caseId, caseId), eq(cases.userId, session.user.id)))
    .limit(1);

  // If a result record exists, return its status.
  if (result.length > 0 && result[0].status) {
    return result[0].status;
  }

  // If no result record exists yet, the job is implicitly pending.
  return "pending";
};
