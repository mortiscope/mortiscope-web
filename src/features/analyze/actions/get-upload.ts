"use server";

import { desc, eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { uploads } from "@/db/schema";

/**
 * Fetches all upload records for the currently authenticated user.
 *
 * @returns A promise that resolves to an array of the user's uploads.
 */
export async function getUpload() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      throw new Error("Unauthorized: User not authenticated.");
    }
    const userId = session.user.id;

    const userUploads = await db.query.uploads.findMany({
      where: eq(uploads.userId, userId),
      orderBy: [desc(uploads.createdAt)],
    });

    return { success: true, data: userUploads };
  } catch (error) {
    console.error("Error fetching user uploads:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { success: false, error: `Failed to fetch uploads: ${errorMessage}` };
  }
}
