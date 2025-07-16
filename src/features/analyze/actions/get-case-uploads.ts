"use server";

import { and, desc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { uploads } from "@/db/schema";

/**
 * Fetches all upload records for a specific case, ensuring the user is authorized.
 *
 * @param caseId The ID of the case to fetch uploads for.
 * @returns A promise that resolves to an array of the case's uploads.
 */
export async function getCaseUploads(caseId: string) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Unauthorized: User not authenticated.");
    }
    const userId = session.user.id;

    // Fetch uploads that match both the caseId and the authenticated userId
    const caseUploads = await db.query.uploads.findMany({
      where: and(eq(uploads.caseId, caseId), eq(uploads.userId, userId)),
      orderBy: [desc(uploads.createdAt)],
    });

    return { success: true, data: caseUploads };
  } catch (error) {
    console.error("Error fetching case uploads:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: `Failed to fetch uploads: ${errorMessage}` };
  }
}
