import { db } from "@/db";
import { userSessions } from "@/db/schema";
import { inngest } from "@/lib/inngest";
import { inngestLogger, logCritical } from "@/lib/logger";

/**
 * An Inngest function that serves as a system-wide maintenance job.
 */
export const triggerSessionCleanup = inngest.createFunction(
  {
    id: "trigger-session-cleanup",
    name: "Trigger Session Cleanup",
    // Configures the function to automatically retry up to 2 times on failure.
    retries: 2,
    /**
     * An `onFailure` handler that is executed only after all retries have failed.
     */
    onFailure: async ({ error }) => {
      logCritical(
        inngestLogger,
        "Failed to trigger session cleanup. Manual intervention may be required for session maintenance.",
        error,
        { function: "trigger-session-cleanup" }
      );
    },
  },
  { event: "account/session.trigger-cleanup" },
  async ({ step }) => {
    /**
     * Fetch all existing sessions and schedule an inactivity check for each one.
     */
    const cleanupResult = await step.run("schedule-existing-sessions", async () => {
      try {
        // Fetch the essential details of all sessions from the database.
        const existingSessions = await db
          .select({
            sessionToken: userSessions.sessionToken,
            userId: userSessions.userId,
            lastActiveAt: userSessions.lastActiveAt,
          })
          .from(userSessions);

        let scheduledCount = 0;
        const errors: string[] = [];

        // Iterate through each session to schedule its individual inactivity check.
        for (const session of existingSessions) {
          try {
            const now = new Date();
            const daysSinceLastActive =
              (now.getTime() - session.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24);

            // Determine if the check should be immediate or delayed.
            if (daysSinceLastActive >= 1) {
              await inngest.send({
                name: "account/session.check-inactivity",
                data: {
                  sessionToken: session.sessionToken,
                  userId: session.userId,
                  lastActiveAt: session.lastActiveAt.toISOString(),
                },
              });
            } else {
              const checkTime = new Date(session.lastActiveAt.getTime() + 24 * 60 * 60 * 1000);
              await inngest.send({
                name: "account/session.check-inactivity",
                data: {
                  sessionToken: session.sessionToken,
                  userId: session.userId,
                  lastActiveAt: session.lastActiveAt.toISOString(),
                },
                ts: checkTime.getTime(),
              });
            }
            scheduledCount++;
          } catch (error) {
            const errorMessage = `Failed to schedule session ${session.sessionToken}: ${error instanceof Error ? error.message : "Unknown error"}`;
            errors.push(errorMessage);
          }
        }

        // Return a summary of the scheduling operation.
        return {
          success: true,
          scheduledCount,
          totalSessions: existingSessions.length,
          errors,
        };
      } catch (error) {
        // This outer catch handles critical failures, such as the initial database query failing.
        throw new Error(
          `Session cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });

    // On successful completion of the step, return a final summary for logging in the Inngest dashboard.
    return {
      message: `Scheduled inactivity checks for ${cleanupResult.scheduledCount} of ${cleanupResult.totalSessions} sessions`,
      scheduledCount: cleanupResult.scheduledCount,
      totalSessions: cleanupResult.totalSessions,
      errors: cleanupResult.errors,
    };
  }
);
