"use server";

import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases } from "@/db/schema";

/**
 * Fetches the current recalculation status for a specific case.
 * This is a lightweight action designed for client-side polling.
 *
 * @param caseId The ID of the case to check.
 * @returns A promise that resolves to a boolean indicating if recalculation is still needed.
 * @throws An error if the user is not authenticated or the case is not found.
 */
export const getRecalculationStatus = async (caseId: string): Promise<boolean> => {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("User not authenticated");
  }

  const result = await db
    .select({
      recalculationNeeded: cases.recalculationNeeded,
    })
    .from(cases)
    .where(and(eq(cases.id, caseId), eq(cases.userId, session.user.id)))
    .limit(1);

  if (result.length === 0) {
    // If the case isn't found for this user, throw an error to stop polling.
    throw new Error("Case not found or permission denied.");
  }

  // Return the current value of the flag. The poller will look for this to become `false`.
  return result[0].recalculationNeeded;
};
