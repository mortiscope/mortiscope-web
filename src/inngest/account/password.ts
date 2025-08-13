import { inngest } from "@/lib/inngest";
import { emailLogger, inngestLogger, logError } from "@/lib/logger";
import { sendPasswordUpdatedEmail } from "@/lib/mail";

/**
 * Handles sending a security notification to a user after their password has been
 * successfully changed. This is a crucial security measure to alert users of
 * potentially unauthorized activity.
 */
export const passwordUpdated = inngest.createFunction(
  {
    id: "password-updated",
    name: "Password Updated Notification",
    // Configures the function to automatically retry up to 2 times on failure.
    retries: 2,
    /**
     * An `onFailure` handler that is executed only after all retries have failed.
     * It logs the terminal failure for monitoring.
     */
    onFailure: async ({ error, event }) => {
      // Safely extract data from the event for logging.
      const userEmail = (event.data as { userEmail?: string })?.userEmail || "unknown";
      logError(inngestLogger, "Failed to send password update notification email", error, {
        userEmail,
        function: "password-updated",
      });
    },
  },
  { event: "account/password.updated" },
  async ({ event, step }) => {
    // Destructure the required data from the incoming event payload.
    const { userId, userEmail, userName } = event.data;

    /**
     * Send the password update notification email.
     */
    await step.run("send-password-update-email", async () => {
      try {
        await sendPasswordUpdatedEmail(userEmail);
        emailLogger.info(
          { userId, email: userEmail, userName },
          "Password update notification email sent successfully"
        );
      } catch (emailError) {
        // Log the specific error for immediate debugging.
        logError(
          emailLogger,
          "Password was updated, but the notification email failed to send",
          emailError,
          { userId, email: userEmail, userName }
        );
        // Rethrow the error to signal failure to Inngest, triggering a retry for this step.
        throw emailError;
      }
    });

    // On successful completion, return a success message and metadata.
    return {
      message: `Password update notification sent successfully to ${userEmail}`,
      userId,
      userEmail,
      sentAt: new Date().toISOString(),
    };
  }
);
