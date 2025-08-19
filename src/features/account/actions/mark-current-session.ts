"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { userSessions } from "@/db/schema";

/**
 * A server action to mark a specific session as the current one for a user.
 * It first resets the flag on all of the user's other sessions.
 * @param sessionToken The token of the session to mark as current.
 * @param userId The ID of the user who owns the session.
 * @returns A promise resolving to an object indicating success.
 */
export async function markCurrentSession(sessionToken: string, userId: string) {
  try {
    // Reset the `isCurrentSession` flag for all of the user's sessions.
    await db
      .update(userSessions)
      .set({ isCurrentSession: false })
      .where(eq(userSessions.userId, userId));

    // Set the `isCurrentSession` flag to true for only the specified session.
    await db
      .update(userSessions)
      .set({ isCurrentSession: true })
      .where(and(eq(userSessions.sessionToken, sessionToken), eq(userSessions.userId, userId)));

    return { success: true };
  } catch (error) {
    console.error("Error occurred:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      userId,
      sessionToken: sessionToken.slice(0, 8) + "...",
    });
    return { success: false };
  }
}
