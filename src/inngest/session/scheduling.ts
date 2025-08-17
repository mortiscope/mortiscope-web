import { inngest } from "@/lib/inngest";
import { inngestLogger, logError } from "@/lib/logger";

/**
 * An Inngest function that serves as the third step in the session cleanup workflow.
 */
export const scheduleSessionDeletion = inngest.createFunction(
  {
    id: "schedule-session-deletion",
    name: "Schedule Session Deletion",
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
        inactiveSince?: string;
      };
      logError(
        inngestLogger,
        "Failed to schedule session deletion. Session may remain active longer than intended.",
        error,
        { sessionToken, userId, function: "schedule-session-deletion" }
      );
    },
  },
  { event: "account/session.schedule-deletion" },
  async ({ event, step }) => {
    // Destructure the required data from the incoming event payload.
    const { sessionToken, userId, inactiveSince } = event.data;

    /**
     * Calculate the exact timestamp for the final deletion.
     */
    const deletionTime = await step.run("calculate-deletion-time", async () => {
      // The `inactiveSince` date is the original timestamp from when the session was last seen.
      const inactiveDate = new Date(inactiveSince);
      // The final deletion is scheduled for 3 days after that initial point of inactivity.
      const deletionTime = new Date(inactiveDate.getTime() + 3 * 24 * 60 * 60 * 1000);

      return {
        inactiveSince: inactiveDate.toISOString(),
        deletionTime: deletionTime.toISOString(),
        timestamp: deletionTime.getTime(),
      };
    });

    /**
     * Schedule the final `account/session.delete` event to be executed at the calculated future time.
     */
    await step.sendEvent("schedule-deletion", {
      name: "account/session.delete",
      data: {
        sessionToken,
        userId,
      },
      ts: deletionTime.timestamp || undefined,
    });

    // On successful completion, return a summary of the outcome for logging in the Inngest dashboard.
    return {
      message: "Session deletion scheduled for 3 days after inactivity",
      sessionToken,
      userId,
      inactiveSince: deletionTime.inactiveSince,
      scheduledFor: deletionTime.deletionTime,
    };
  }
);
