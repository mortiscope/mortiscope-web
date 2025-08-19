"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { userSessions } from "@/db/schema";

/**
 * A lightweight server action to update the `lastActiveAt` timestamp for a given session token.
 * This is used to keep a session alive during user activity.
 * @param sessionToken The session token to update.
 * @returns A promise resolving to an object indicating success.
 */
export async function updateSessionActivity(sessionToken: string) {
  try {
    await db
      .update(userSessions)
      .set({
        lastActiveAt: new Date(),
      })
      .where(eq(userSessions.sessionToken, sessionToken));
    return { success: true };
  } catch {
    return { success: false };
  }
}
