import { EmailVerification } from "@/emails/email-verification";
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
