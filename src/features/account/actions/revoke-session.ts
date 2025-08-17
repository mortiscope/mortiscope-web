"use server";

import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { revokedJwtTokens, sessions, userSessions } from "@/db/schema";

/**
 * A server action to revoke a single, specific user session by its ID.
 * It includes a crucial ownership check to ensure a user can only revoke their own sessions.
 *
 * @param sessionId The unique ID of the session (from the `userSessions` table) to be revoked.
 * @param userId The ID of the user who owns the session, used for the ownership check.
 * @returns A promise resolving to an object indicating success or failure.
 */
export async function revokeSession(sessionId: string, userId: string) {
  try {
    // Fetch the session metadata to ensure it belongs to the specified user for authorization.
    const userSession = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.id, sessionId), eq(userSessions.userId, userId)))
      .limit(1);

    // If the session doesn't exist or doesn't belong to the user, return an error.
    if (userSession.length === 0) {
      return { success: false, error: "Session not found" };
    }

    const sessionToken = userSession[0]!.sessionToken;

    // Fetch the corresponding session from the core `sessions` table to get its expiry time.
    const recentSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, sessionToken))
      .limit(1);

    // If the session exists in the core table, perform JWT blacklisting to invalidate the token immediately.
    if (recentSessions.length > 0) {
      const session = recentSessions[0]!;

      // Insert the token into the blacklist.
      try {
        await db.insert(revokedJwtTokens).values({
          jti: sessionToken,
          userId,
          sessionToken,
          expiresAt: session.expires,
        });
      } catch (error) {
        // Gracefully handle cases where the token might already be in the blacklist.
        if (
          error instanceof Error &&
          !error.message.includes("duplicate") &&
          !error.message.includes("unique")
        ) {
          console.error("Failed to blacklist session token:", error);
        }
      }
    }

    // Clean up the database by deleting the session from both tables.
    await db.delete(userSessions).where(eq(userSessions.id, sessionId));

    await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));

    // Return a success response.
    return { success: true };
  } catch (error) {
    // Catch any unexpected errors during the overall process.
    console.error("Failed to revoke session:", error);
    return { success: false, error: "Failed to revoke session" };
  }
}

/**
 * A server action to revoke a session directly by its session token.
 * @param sessionToken The session token of the session to be revoked.
 * @returns A promise resolving to an object indicating success or failure.
 */
export async function revokeSessionByToken(sessionToken: string) {
  try {
    // Delete the session from the custom metadata table.
    await db.delete(userSessions).where(eq(userSessions.sessionToken, sessionToken));

    // Delete the session from the core NextAuth.js session table.
    await db.delete(sessions).where(eq(sessions.sessionToken, sessionToken));

    // Return a success response.
    return { success: true };
  } catch (error) {
    // Catch any unexpected errors during the database operations.
    console.error("Failed to revoke session by token:", error);
    return { success: false, error: "Failed to revoke session" };
  }
}
