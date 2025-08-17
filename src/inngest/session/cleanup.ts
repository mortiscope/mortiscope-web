import { eq } from "drizzle-orm";

import { db } from "@/db";
import { sessions, userSessions } from "@/db/schema";
import { inngest } from "@/lib/inngest";
import { inngestLogger, logError } from "@/lib/logger";

/**
 * An Inngest function that handles the logic for deleting a single user session after a
 * prolonged period of inactivity (3 days). It includes several safety checks to prevent
 * the deletion of active or current sessions.
 */
export const deleteInactiveSession = inngest.createFunction(
  {
    id: "delete-inactive-session",
    name: "Delete Inactive Session",
    // Configures the function to automatically retry up to 2 times on failure.
    retries: 2,
    /**
     * An `onFailure` handler that is executed only after all retries have failed.
     */
    onFailure: async ({ error, event }) => {
      // Safely extract data from the event for logging.
      const { sessionToken, userId } = event.data as {
        sessionToken?: string;
        userId?: string;
      };
      logError(
        inngestLogger,
        "Failed to delete inactive session. Session may remain in database longer than intended.",
        error,
        { sessionToken, userId, function: "delete-inactive-session" }
      );
    },
  },
  { event: "account/session.delete" },
  async ({ event, step }) => {
    // Destructure the required data from the incoming event payload.
    const { sessionToken, userId } = event.data;

    /**
     * Verify the session's inactivity status and delete it if appropriate.
     */
    const deletionResult = await step.run("verify-and-delete-session", async () => {
      // A transaction that prevents race conditions.
      return await db.transaction(async (tx) => {
        // Fetch the specific session from the `userSessions` table.
        const session = await tx
          .select({
            lastActiveAt: userSessions.lastActiveAt,
            isCurrentSession: userSessions.isCurrentSession,
          })
          .from(userSessions)
          .where(eq(userSessions.sessionToken, sessionToken))
          .limit(1);

        // Handle the case where the session has already been deleted.
        if (session.length === 0) {
          return {
            deleted: false,
            action: "no-action" as const,
            message: "Session already deleted",
          };
        }

        const sessionData = session[0]!;
        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

        // If the session has become active again since this job was scheduled, do not delete it.
        if (sessionData.lastActiveAt > threeDaysAgo) {
          return {
            deleted: false,
            action: "skipped-active" as const,
            message: "Session became active again, skipping deletion",
          };
        }

        // Never delete the session that is marked as the user's current session.
        if (sessionData.isCurrentSession) {
          return {
            deleted: false,
            action: "skipped-current" as const,
            message: "Skipped deletion of current session",
          };
        }

        // If all checks pass, delete the session from both the `userSessions` table and the core `sessions` table.
        await tx.delete(userSessions).where(eq(userSessions.sessionToken, sessionToken));
        await tx.delete(sessions).where(eq(sessions.sessionToken, sessionToken));

        return {
          deleted: true,
          action: "deleted" as const,
          message: "Session deleted successfully after 3 days of inactivity",
        };
      });
    });

    // On successful completion of the step, return a summary of the outcome.
    return {
      message: deletionResult.message,
      sessionToken,
      userId,
      action: deletionResult.action,
      deleted: deletionResult.deleted,
    };
  }
);
