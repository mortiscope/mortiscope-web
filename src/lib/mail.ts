import { config } from "@/lib/config";

// Lazy load email components and resend to avoid Edge Runtime issues
const getEmailComponents = async () => {
  const [
    { AccountDeletionCancelled },
    { AccountDeletionRequest },
    { AccountDeletionScheduled },
    { EmailChangeVerification },
    { EmailUpdated },
    { EmailVerification },
    { ForgotPassword },
    { GoodbyeEmail },
    { PasswordUpdated },
    { WelcomeEmail },
    { resend },
  ] = await Promise.all([
    import("@/emails/account-deletion-cancelled"),
    import("@/emails/account-deletion-request"),
    import("@/emails/account-deletion-scheduled"),
    import("@/emails/email-change-verification"),
    import("@/emails/email-updated"),
    import("@/emails/email-verification"),
    import("@/emails/forgot-password"),
    import("@/emails/goodbye-email"),
    import("@/emails/password-updated"),
    import("@/emails/welcome-email"),
    import("@/lib/resend"),
  ]);

  return {
    AccountDeletionCancelled,
    AccountDeletionRequest,
    AccountDeletionScheduled,
    EmailChangeVerification,
    EmailUpdated,
    EmailVerification,
    ForgotPassword,
    GoodbyeEmail,
    PasswordUpdated,
    WelcomeEmail,
    resend,
  };
};

/**
 * Sends an email verification link for new user registration.
 * @param email The recipient's email address.
 * @param token The unique verification token.
 */
export const sendEmailVerification = async (email: string, token: string) => {
  const { EmailVerification, resend } = await getEmailComponents();
  await resend.emails.send({
    from: config.mail.fromAddress,
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
  const { WelcomeEmail, resend } = await getEmailComponents();
  await resend.emails.send({
    from: config.mail.fromAddress,
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
  const { EmailChangeVerification, resend } = await getEmailComponents();
  await resend.emails.send({
    from: config.mail.fromAddress,
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
  const { EmailUpdated, resend } = await getEmailComponents();

  await resend.emails.send({
    from: config.mail.fromAddress,
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
  const { ForgotPassword, resend } = await getEmailComponents();
  await resend.emails.send({
    from: config.mail.fromAddress,
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
  const { PasswordUpdated, resend } = await getEmailComponents();
  await resend.emails.send({
    from: config.mail.fromAddress,
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
  const { AccountDeletionRequest, resend } = await getEmailComponents();
  await resend.emails.send({
    from: config.mail.fromAddress,
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
  const { AccountDeletionScheduled, resend } = await getEmailComponents();
  await resend.emails.send({
    from: config.mail.fromAddress,
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
  const { AccountDeletionCancelled, resend } = await getEmailComponents();
  await resend.emails.send({
    from: config.mail.fromAddress,
    to: email,
    subject: "MortiScope: Account Deletion Cancelled",
    react: AccountDeletionCancelled({ username }),
  });
};

/**
 * Sends a final farewell email after an account has been permanently deleted.
 * @param email The user's former email address.
 * @param username The user's name for personalization (optional).
 */
export const sendGoodbyeEmail = async (email: string, username?: string | null) => {
  const { GoodbyeEmail, resend } = await getEmailComponents();
  await resend.emails.send({
    from: config.mail.fromAddress,
    to: email,
    subject: "MortiScope: Account Permanently Deleted",
    react: GoodbyeEmail({ username }),
  });
};
