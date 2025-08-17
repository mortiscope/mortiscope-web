import { eq } from "drizzle-orm";

import { db } from "@/db";
import { userSessions } from "@/db/schema";
import { inngest } from "@/lib/inngest";
import { inngestLogger, logError } from "@/lib/logger";

/**
 * An Inngest function that serves as the second step in the session cleanup workflow.
 */
export const checkSessionInactivity = inngest.createFunction(
  {
    id: "check-session-inactivity",
    name: "Check Session Inactivity",
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
        lastActiveAt?: string;
      };
      logError(
        inngestLogger,
        "Failed to check session inactivity. Session cleanup may be delayed.",
        error,
        { sessionToken, userId, function: "check-session-inactivity" }
      );
    },
  },
  { event: "account/session.check-inactivity" },
  async ({ event, step }) => {
    // Destructure the required data from the incoming event payload.
    const { sessionToken, userId, lastActiveAt } = event.data;

    /**
     * Query the database to check the current state of the session.
     */
    const inactivityCheck = await step.run("check-if-still-inactive", async () => {
      // Fetch the latest `lastActiveAt` and `isCurrentSession` status for the token.
      const session = await db
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
          exists: false,
          message: "Session no longer exists",
        };
      }

      const sessionData = session[0]!;
      // `originalInactiveTime` is the `lastActiveAt` timestamp from when this job was first scheduled.
      const originalInactiveTime = new Date(lastActiveAt);
      const currentLastActive = sessionData.lastActiveAt;

      if (currentLastActive > originalInactiveTime) {
        return {
          exists: true,
          stillInactive: false,
          message: "Session became active again",
          newLastActiveAt: currentLastActive.toISOString(),
        };
      }

      // Do not schedule deletion for a session marked as current.
      if (sessionData.isCurrentSession) {
        return {
          exists: true,
          stillInactive: false,
          message: "Session is currently active",
        };
      }

      // If all checks pass, the session is confirmed to be inactive.
      return {
        exists: true,
        stillInactive: true,
        message: "Session is still inactive after 1 day",
      };
    });

    // If the check determined the session is gone or has become active, abort the function.
    if (
      !inactivityCheck.exists ||
      ("stillInactive" in inactivityCheck && !inactivityCheck.stillInactive)
    ) {
      return {
        message: inactivityCheck.message,
        sessionToken,
        userId,
        action: "no-deletion-scheduled",
      };
    }

    /**
     * If the session is confirmed to be inactive, send a new event to trigger
     * the next step in the workflow which is scheduling the final deletion job.
     */
    await step.sendEvent("schedule-deletion", {
      name: "account/session.schedule-deletion",
      data: {
        sessionToken,
        userId,
        inactiveSince: lastActiveAt,
      },
    });

    // On successful completion, return a summary of the outcome.
    return {
      message: "Session scheduled for deletion after 1 day of inactivity",
      sessionToken,
      userId,
      action: "deletion-scheduled",
      inactiveSince: lastActiveAt,
    };
  }
);
