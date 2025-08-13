import { inngest } from "@/lib/inngest";
import { emailLogger, inngestLogger, logError } from "@/lib/logger";
import { sendEmailChangeNotification, sendEmailChangeVerificationLink } from "@/lib/mail";
import { generateEmailChangeToken } from "@/lib/tokens";

/**
 * Handles the asynchronous process of sending notifications when a user initiates 
 * an email address change. It ensures a verification link is sent to the new email 
 * and a security alert is sent to the old email.
 */
export const emailUpdated = inngest.createFunction(
  {
    id: "email-updated",
    name: "Email Updated Notification",
    // Configures the function to automatically retry up to 2 times on failure.
    retries: 2,
    /**
     * An `onFailure` handler that is executed only after all retries have failed.
     * It logs the terminal failure for monitoring and debugging purposes.
     */
    onFailure: async ({ error, event }) => {
      // Safely extract data from the event for logging.
      const newEmail = (event.data as { newEmail?: string })?.newEmail || "unknown";
      const oldEmail = (event.data as { oldEmail?: string })?.oldEmail || "unknown";
      logError(inngestLogger, "Failed to send email update notifications", error, {
        newEmail,
        oldEmail,
        function: "email-updated",
      });
    },
  },
  { event: "account/email.updated" },
  async ({ event, step }) => {
    // Destructure the required data from the incoming event payload.
    const { userId, oldEmail, newEmail, userName } = event.data;

    /**
     * Generate a unique verification token for the new email address.
     */
    const emailChangeToken = await step.run("generate-verification-token", async () => {
      try {
        return await generateEmailChangeToken(userId, newEmail);
      } catch (tokenError) {
        logError(inngestLogger, "Failed to generate email change verification token", tokenError, {
          userId,
          newEmail,
        });
        // Rethrow the error to signal failure to Inngest, triggering a retry.
        throw tokenError;
      }
    });

    /**
     * Send the verification link to the new email address.
     */
    await step.run("send-verification-email", async () => {
      try {
        await sendEmailChangeVerificationLink(newEmail, emailChangeToken.token);
        emailLogger.info(
          { userId, newEmail, userName },
          "Email change verification link sent successfully"
        );
      } catch (emailError) {
        logError(
          emailLogger,
          "Email was updated, but the verification email failed to send",
          emailError,
          { userId, newEmail, userName }
        );
        // Rethrow the error to trigger a retry for this specific step.
        throw emailError;
      }
    });

    /**
     * Send a security notification to the old email address.
     */
    await step.run("send-security-notification", async () => {
      try {
        await sendEmailChangeNotification(oldEmail, "old");
        emailLogger.info(
          { userId, oldEmail, userName },
          "Email change security notification sent successfully"
        );
      } catch (emailError) {
        logError(
          emailLogger,
          "Email was updated, but the security notification failed to send",
          emailError,
          { userId, oldEmail, userName }
        );
        // The error is intentionally not re-thrown here.
      }
    });

    // On successful completion of all critical steps, return a success message and metadata.
    return {
      message: `Email update notifications sent successfully from ${oldEmail} to ${newEmail}`,
      userId,
      oldEmail,
      newEmail,
      sentAt: new Date().toISOString(),
    };
  }
);
