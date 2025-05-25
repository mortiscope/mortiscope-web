import { EmailVerification } from "@/emails/email-verification";
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
