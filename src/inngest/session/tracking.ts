import { inngest } from "@/lib/inngest";
import { inngestLogger, logError } from "@/lib/logger";

/**
 * An Inngest function that serves as the entry point for the session tracking workflow.
 * It is triggered when a user logs in or a new session is detected. Its primary roles are:
 *
 * 1. To call the `trackSession` server action to record the session's metadata in the database.
 * 2. To schedule a follow-up `check-inactivity` event to run in the future.
 */
export const handleSessionTracking = inngest.createFunction(
  {
    id: "handle-session-tracking",
    name: "Handle Session Tracking",
    // Configures the function to automatically retry up to 2 times on failure.
    retries: 2,

    /**
     * An `onFailure` handler that is executed only after all retries have failed.
     */
    onFailure: async ({ error, event }) => {
      // Safely extract data from the event for logging.
      const { sessionToken, userId } = event.data as {
        userId?: string;
        sessionToken?: string;
        userAgent?: string;
        ipAddress?: string;
      };
      logError(
        inngestLogger,
        "Failed to handle session tracking. Session may not be properly managed.",
        error,
        { sessionToken, userId, function: "handle-session-tracking" }
      );
    },
  },
  { event: "account/session.track" },
  async ({ event, step }) => {
    // Destructure the required data from the incoming event payload.
    const { userId, sessionToken, userAgent, ipAddress } = event.data;

    /**
     * Execute the core session tracking logic.
     */
    const trackingResult = await step.run("track-session", async () => {
      try {
        const { trackSession } = await import("@/features/account/actions/track-session");

        // Call the server action to create or update the session record in the database.
        const result = await trackSession({
          userId,
          sessionToken,
          userAgent,
          ipAddress,
        });

        return {
          success: true,
          result,
        };
      } catch (error) {
        throw new Error(
          `Session tracking failed: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    });

    // Define the timestamp for the follow-up check.
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    /**
     * Schedule a follow-up event to check for inactivity.
     */
    await step.sendEvent("schedule-inactivity-check", {
      name: "account/session.check-inactivity",
      data: {
        sessionToken,
        userId,
        lastActiveAt: now.toISOString(),
      },
      ts: oneDayFromNow.getTime(),
    });

    // On successful completion, return a summary for logging in the Inngest dashboard.
    return {
      message: "Session tracking handled and inactivity check scheduled",
      sessionToken,
      userId,
      trackingResult: trackingResult.result,
      inactivityCheckScheduledFor: oneDayFromNow.toISOString(),
    };
  }
);
