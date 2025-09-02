import { gt } from "drizzle-orm";

import { db } from "@/db";
import { revokedJwtTokens } from "@/db/schema";
import { inngest } from "@/lib/inngest";
import { inngestLogger, logCritical } from "@/lib/logger";
import { syncRevokedSessionsToRedis } from "@/lib/redis-session";

/**
 * An Inngest function that runs on a schedule (cron job) to synchronize the list of
 * revoked session tokens from the persistent database to the in-memory Redis store.
 */
export const syncRevokedSessionsJob = inngest.createFunction(
  {
    id: "sync-revoked-sessions-to-redis",
    name: "Sync Revoked Sessions to Redis",
    // Configures the function to automatically retry up to 2 times on failure.
    retries: 2,
    /**
     * An `onFailure` handler that is executed only after all retries have failed.
     */
    onFailure: async ({ error }) => {
      logCritical(
        inngestLogger,
        "Failed to sync revoked sessions to Redis. Session validation may fall back to database.",
        error,
        { function: "sync-revoked-sessions-to-redis" }
      );
    },
  },
  { cron: "0 * * * *" },
  async ({ step }) => {
    /**
     * Fetch all non-expired revoked tokens from the database and sync them to Redis.
     */
    const syncResult = await step.run("sync-revoked-sessions", async () => {
      try {
        // Fetch all tokens from the `revokedJwtTokens` table that have not yet expired.
        const revokedSessions = await db
          .select({
            sessionToken: revokedJwtTokens.sessionToken,
          })
          .from(revokedJwtTokens)
          .where(gt(revokedJwtTokens.expiresAt, new Date()));

        // Extract just the token strings into a simple array.
        const sessionTokens = revokedSessions.map((s) => s.sessionToken);

        // Handle the common case where there are no active revoked tokens to sync.
        if (sessionTokens.length === 0) {
          inngestLogger.info(
            { function: "sync-revoked-sessions-to-redis" },
            "No revoked sessions to sync to Redis"
          );
          return {
            success: true,
            syncedCount: 0,
            message: "No revoked sessions to sync",
          };
        }

        // Call the Redis utility function to perform the synchronization.
        const success = await syncRevokedSessionsToRedis(sessionTokens);

        // Based on the outcome of the Redis operation, return a success or failure result for the step.
        if (success) {
          inngestLogger.info(
            {
              function: "sync-revoked-sessions-to-redis",
              count: sessionTokens.length,
            },
            `Successfully synced ${sessionTokens.length} revoked sessions to Redis`
          );

          return {
            success: true,
            syncedCount: sessionTokens.length,
            message: `Synced ${sessionTokens.length} revoked sessions`,
          };
        } else {
          // If the Redis sync fails, throw an error to signal failure to Inngest, triggering a retry.
          throw new Error("Failed to sync revoked sessions to Redis");
        }
      } catch (error) {
        // This outer catch handles critical failures, such as the initial database query failing.
        throw new Error(
          `Redis sync failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });

    // On successful completion of the step, return the result as the final output of the function.
    return syncResult;
  }
);
