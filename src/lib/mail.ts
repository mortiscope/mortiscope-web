import { AccountDeletionCancelled } from "@/emails/account-deletion-cancelled";
import { AccountDeletionRequest } from "@/emails/account-deletion-request";
import { AccountDeletionScheduled } from "@/emails/account-deletion-scheduled";
import { EmailChangeVerification } from "@/emails/email-change-verification";
import { EmailUpdated } from "@/emails/email-updated";
import { EmailVerification } from "@/emails/email-verification";
import { ForgotPassword } from "@/emails/forgot-password";
import { PasswordUpdated } from "@/emails/password-updated";
import { WelcomeEmail } from "@/emails/welcome-email";
import { resend } from "@/lib/resend";

let domain: string;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

// Dynamically construct the 'from' address for emails using the application's public URL
try {
  if (!appUrl) {
    throw new Error("NEXT_PUBLIC_APP_URL is not set in environment variables.");
  }
  domain = new URL(appUrl).hostname;
} catch (error) {
  console.error(
    "FATAL: Invalid or missing NEXT_PUBLIC_APP_URL. Cannot create 'from' address for emails.",
    error
  );
  domain = "invalid-configuration.local";
}

const fromAddress = `MortiScope <noreply@${domain}>`;

/**
 * Sends an email verification link for new user registration.
 * @param email The recipient's email address.
 * @param token The unique verification token.
 */
export const sendEmailVerification = async (email: string, token: string) => {
  await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: "MortiScope: Verify Your Email Address",
    react: EmailVerification({ token }),
  });
};

/**
 * Sends a welcome email to a user upon successful registration.
 * @param email The recipient's email address.
 * @param username The user's name for personalization (optional).
 */
export const sendWelcomeEmail = async (email: string, username?: string | null) => {
  await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: "MortiScope: Getting Started",
    react: WelcomeEmail({ username }),
  });
};

/**
 * Sends a verification link to a new email address to confirm a change.
 * @param email The recipient's new email address.
 * @param token The unique verification token for the email change.
 */
export const sendEmailChangeVerificationLink = async (email: string, token: string) => {
  await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: "MortiScope: Confirm New Email Address",
    react: EmailChangeVerification({ token }),
  });
};

/**
 * Sends a notification about an email change.
 * @param email The recipient's email address (either old or new).
 * @param type Differentiates the notification type: 'old' for a security alert, 'new' for confirmation.
 */
export const sendEmailChangeNotification = async (email: string, type: "old" | "new") => {
  const subject = type === "old" ? "MortiScope: Email Change Request" : "MortiScope: Email Updated";

  await resend.emails.send({
    from: fromAddress,
    to: email,
    subject,
    react: EmailUpdated({ notificationType: type }),
  });
};

/**
 * Sends a password reset link to the user.
 * @param email The recipient's email address.
 * @param token The unique password reset token.
 */
export const sendForgotPassword = async (email: string, token: string) => {
  await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: "MortiScope: Forgot Password",
    react: ForgotPassword({ token }),
  });
};

/**
 * Sends a confirmation that the user's password was changed.
 * @param email The recipient's email address.
 */
export const sendPasswordUpdatedEmail = async (email: string) => {
  await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: "MortiScope: Password Updated",
    react: PasswordUpdated(),
  });
};

/**
 * Sends an email asking the user to confirm their account deletion request.
 * @param email The user's email address.
 * @param token The unique token to authorize deletion.
 */
export const sendAccountDeletionRequest = async (email: string, token: string) => {
  await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: "MortiScope: Account Deletion Request",
    react: AccountDeletionRequest({ token }),
  });
};

/**
 * Informs the user that their account deletion is scheduled and details the grace period.
 * @param email The user's email address.
 * @param deletionWindowDays The number of days in the grace period.
 */
export const sendAccountDeletionScheduled = async (email: string, deletionWindowDays: number) => {
  await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: "MortiScope: Account Deletion Schedule",
    react: AccountDeletionScheduled({ deletionWindowDays }),
  });
};

/**
 * Notifies the user that their scheduled account deletion has been cancelled.
 * @param email The user's email address.
 * @param username The user's name for personalization (optional).
 */
export const sendAccountDeletionCancelled = async (email: string, username?: string | null) => {
  await resend.emails.send({
    from: fromAddress,
    to: email,
    subject: "MortiScope: Account Deletion Cancelled",
    react: AccountDeletionCancelled({ username }),
  });
};
