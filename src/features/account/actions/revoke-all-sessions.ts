"use server";

import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { revokedJwtTokens, sessions, userSessions } from "@/db/schema";

/**
 * A server action to revoke user sessions. It can revoke all sessions for a user or all
 * sessions except for the current one. This is a key security feature for actions like
 * "sign out all other devices".
 *
 * This process involves three main steps for each session to be revoked:
 * 1. Blacklisting the JWT by adding its token to the `revokedJwtTokens` table.
 * 2. Deleting the session from the custom `userSessions` table.
 * 3. Deleting the session from the core `sessions` table.
 *
 * @param userId The unique ID of the user whose sessions are to be revoked.
 * @param currentSessionToken An optional session token to exclude from revocation, preserving the current session.
 * @returns A promise resolving to an object indicating success and the number of revoked sessions, or an error.
 */
export async function revokeAllSessions(userId: string, currentSessionToken?: string) {
  try {
    // Fetch all session metadata records for the user from the custom `userSessions` table.
    const userSessionsList = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, userId));

    // If the user has no sessions, the operation is trivially successful.
    if (userSessionsList.length === 0) {
      return { success: true, revokedCount: 0 };
    }

    // Determine which sessions to revoke.
    const sessionsToRevoke = currentSessionToken
      ? userSessionsList.filter((session) => session.sessionToken !== currentSessionToken)
      : userSessionsList;

    // If there are no sessions to revoke after filtering, the operation is complete.
    if (sessionsToRevoke.length === 0) {
      return { success: true, revokedCount: 0 };
    }

    // Collect the unique tokens and IDs for the batch database operations.
    const sessionTokensToRevoke = sessionsToRevoke.map((session) => session.sessionToken);
    const sessionIdsToRevoke = sessionsToRevoke.map((session) => session.id);

    // Perform JWT blacklisting to invalidate the tokens immediately.
    const actualSessions = await db
      .select()
      .from(sessions)
      .where(inArray(sessions.sessionToken, sessionTokensToRevoke));

    // Prepare the entries for the `revokedJwtTokens` blacklist table.
    const blacklistEntries = actualSessions.map((session) => ({
      jti: session.sessionToken,
      userId,
      sessionToken: session.sessionToken,
      expiresAt: session.expires,
    }));

    if (blacklistEntries.length > 0) {
      try {
        // Iterate and insert tokens into the blacklist one by one.
        for (const entry of blacklistEntries) {
          try {
            await db.insert(revokedJwtTokens).values(entry);
          } catch (insertError) {
            // Ignore duplicate key errors gracefully, but log any other insertion errors.
            if (
              insertError instanceof Error &&
              !insertError.message.includes("duplicate") &&
              !insertError.message.includes("unique")
            ) {
              console.error("Failed to blacklist individual JWT token:", insertError);
            }
          }
        }

        // Add revoked sessions to Redis for immediate validation
        try {
          const { revokeSessionsInRedis } = await import("@/lib/redis-session");
          const tokensToRevoke = blacklistEntries.map((entry) => entry.sessionToken);
          await revokeSessionsInRedis(tokensToRevoke);
        } catch (redisError) {
          console.error("Failed to add revoked sessions to Redis:", redisError);
        }
      } catch (error) {
        // Outer catch that handles broader, unexpected errors during the looping process.
        console.error("Failed to blacklist JWT tokens:", error);
      }
    }

    // Clean up the database by deleting the revoked sessions from both tables.
    await db.delete(userSessions).where(inArray(userSessions.id, sessionIdsToRevoke));
    // Delete from the core NextAuth.js session table.
    await db.delete(sessions).where(inArray(sessions.sessionToken, sessionTokensToRevoke));

    // Return a success response with the count of revoked sessions.
    return { success: true, revokedCount: sessionsToRevoke.length };
  } catch (error) {
    // Catch any unexpected errors during the overall process.
    console.error("Failed to revoke all sessions:", error);
    return { success: false, error: "Failed to revoke sessions" };
  }
}

/**
 * A convenience wrapper for revoke all sessions that revokes all sessions for a given user
 * without preserving any current session.
 *
 * @param userId The unique ID of the user.
 * @returns A promise resolving to the result of the revoke all sessions call.
 */
export async function revokeAllUserSessions(userId: string) {
  return revokeAllSessions(userId);
}
