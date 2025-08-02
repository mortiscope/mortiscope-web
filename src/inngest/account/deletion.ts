import { eq } from "drizzle-orm";

import { getUserByEmail } from "@/data/user";
import { db } from "@/db";
import { accountDeletionTokens, users } from "@/db/schema";
import { getAccountDeletionTokenByToken } from "@/features/account/tokens/account-deletion-token";
import { DELETION_GRACE_PERIOD_DAYS } from "@/lib/constants";
import { inngest } from "@/lib/inngest";
import { sendAccountDeletionScheduled, sendGoodbyeEmail } from "@/lib/mail";

/**
 * Handles account deletion confirmation when a user clicks the deletion link.
 *
 * This function validates the token, schedules the user for deletion by setting
 * a grace period, and sends a notification email.
 */
export const confirmAccountDeletion = inngest.createFunction(
  {
    id: "confirm-account-deletion",
    name: "Confirm Account Deletion",
    retries: 2,
    /**
     * Handles terminal failure of the confirmation process. This is a critical
     * alert because it indicates a systemic issue (e.g., database connectivity)
     * preventing users from initiating account deletion.
     */
    onFailure: async ({ error, event }) => {
      const token = (event.data as { token?: string })?.token || "unknown";
      console.error(
        `CRITICAL FAILURE: The 'confirm-account-deletion' function failed terminally for token: ${token}. The user's deletion was NOT scheduled.`,
        error
      );
    },
  },
  { event: "account/deletion.confirmed" },
  async ({ event, step }) => {
    const { token } = event.data;

    // Validate the provided token
    const deletionToken = await step.run("validate-deletion-token", async () => {
      const deletionToken = await getAccountDeletionTokenByToken(token);
      if (!deletionToken) {
        throw new Error("Token not found");
      }

      // Check for token expiration
      const hasExpired = new Date(deletionToken.expires) < new Date();
      if (hasExpired) {
        throw new Error("Token has expired");
      }

      return deletionToken;
    });

    // Invalidate the token immediately to prevent reuse
    await step.run("invalidate-token", async () => {
      await db
        .delete(accountDeletionTokens)
        .where(eq(accountDeletionTokens.token, deletionToken.token));
    });

    // Find the user and schedule deletion
    const scheduledDeletion = await step.run("schedule-user-deletion", async () => {
      const existingUser = await getUserByEmail(deletionToken.identifier);

      // Gracefully handle cases where the user is gone or deletion is already pending
      if (!existingUser || existingUser.deletionScheduledAt) {
        return { message: "User not found or deletion already scheduled", user: null };
      }

      // Calculate the final deletion date based on the grace period
      const deletionDate = new Date();
      deletionDate.setDate(deletionDate.getDate() + DELETION_GRACE_PERIOD_DAYS);

      // Schedule the user for deletion by setting the `deletionScheduledAt` timestamp
      await db
        .update(users)
        .set({ deletionScheduledAt: deletionDate })
        .where(eq(users.id, existingUser.id));

      // Send notification email
      try {
        await sendAccountDeletionScheduled(existingUser.email, DELETION_GRACE_PERIOD_DAYS);
      } catch (emailError) {
        console.error(
          `CRITICAL LOG: Account deletion for ${existingUser.email} was scheduled, but the notification email failed to send.`,
          emailError
        );
      }

      return {
        message: `Account deletion scheduled for ${existingUser.email}`,
        user: existingUser,
        deletionDate: deletionDate,
      };
    });

    // Schedule the exact deletion event if a user and deletion date were successfully determined.
    if (scheduledDeletion.user && scheduledDeletion.deletionDate) {
      const deletionTimestamp = new Date(scheduledDeletion.deletionDate).getTime();

      // Schedule the final deletion event, passing only the user's unique identifier.
      await step.sendEvent("schedule-exact-deletion", {
        name: "account/deletion.execute",
        data: {
          userId: scheduledDeletion.user.id,
        },
        ts: deletionTimestamp,
      });
    }

    return { message: "Account deletion confirmation processed successfully" };
  }
);

/**
 * Executes the permanent deletion of a specific user account at the exact scheduled time.
 *
 * This function is triggered at the precise moment when a user's grace period expires.
 * It uses a database transaction to atomically verify and delete the user, preventing
 * race conditions where a user might cancel deletion at the exact moment of execution.
 */
export const executeAccountDeletion = inngest.createFunction(
  {
    id: "execute-account-deletion",
    name: "Execute Account Deletion",
    retries: 2,
    /**
     * Handles terminal failure of the account deletion execution. This is a
     * high-priority event requiring manual intervention, as it means a user
     * who should have been deleted remains in the system.
     */
    onFailure: async ({ error, event }) => {
      const userId = (event.data as { userId?: string })?.userId || "unknown";
      console.error(
        `CRITICAL FAILURE & MANUAL INTERVENTION REQUIRED: The 'execute-account-deletion' function failed terminally. User with ID '${userId}' was NOT deleted and requires manual removal.`,
        error
      );
    },
  },
  { event: "account/deletion.execute" },
  async ({ event, step }) => {
    // Extract the userId from the event payload.
    const { userId } = event.data;

    // Execute the verification and deletion within a single atomic step to eliminate race conditions.
    const deletionResult = await step.run("verify-and-delete-user-atomically", async () => {
      // Use a database transaction to ensure the check and delete operations are atomic.
      return await db.transaction(async (tx) => {
        // Fetch the user's current data within the transaction.
        const user = await tx.query.users.findFirst({
          where: eq(users.id, userId),
        });

        // Ensure all return paths have a consistent shape for type safety.
        if (!user || !user.deletionScheduledAt) {
          console.log(
            `User ${userId} no longer exists or cancelled deletion. Halting transaction.`
          );
          return {
            deleted: false,
            message: "User not found or deletion was cancelled.",
            userEmail: null,
            userName: null,
          };
        }

        // Verify that the scheduled deletion time has arrived.
        const now = new Date();
        const scheduledTime = new Date(user.deletionScheduledAt);
        if (now < scheduledTime && now.getTime() - scheduledTime.getTime() < -3600000) {
          console.log(`Deletion for user ${userId} (${user.email}) triggered too early. Halting.`);
          return {
            deleted: false,
            message: "Triggered too early.",
            userEmail: null,
            userName: null,
          };
        }

        // Permanently delete the user account within the transaction.
        await tx.delete(users).where(eq(users.id, user.id));

        console.log(
          `ACCOUNT DELETION: Successfully deleted account for ${user.email} (ID: ${userId}) within transaction.`
        );

        // Return the fresh user details for subsequent steps.
        return {
          deleted: true,
          message: "Deletion successful.",
          userEmail: user.email,
          userName: user.name,
        };
      });
    });

    // Exit the function if the transaction step indicated that no deletion occurred.
    if (!deletionResult.deleted || !deletionResult.userEmail) {
      return { message: `User deletion skipped: ${deletionResult.message}` };
    }

    // Send a final goodbye email using the fresh user data retrieved during the transaction.
    await step.run("send-goodbye-email", async () => {
      try {
        await sendGoodbyeEmail(deletionResult.userEmail, deletionResult.userName);
        console.log(
          `ACCOUNT DELETION: Goodbye email sent successfully to ${deletionResult.userEmail}.`
        );
      } catch (emailError) {
        console.error(
          `ACCOUNT DELETION: Account for ${deletionResult.userEmail} was deleted, but the goodbye email failed to send.`,
          emailError
        );
      }
    });

    // Return a success payload containing the details of the completed deletion.
    return {
      message: `Account deletion completed successfully for ${deletionResult.userEmail}`,
      userId,
      userEmail: deletionResult.userEmail,
      deletedAt: new Date().toISOString(),
    };
  }
);
