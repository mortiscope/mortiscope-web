"use server";

import bcrypt from "bcryptjs";

import { auth } from "@/auth";
import { getUserByEmail, getUserById } from "@/data/user";
import {
  type EmailChangeRequestFormValues,
  EmailChangeRequestSchema,
} from "@/features/auth/schemas/auth";
import { sendEmailChangeNotification, sendEmailChangeVerificationLink } from "@/lib/mail";
import { emailActionLimiter, privateActionLimiter } from "@/lib/rate-limiter";
import { generateEmailChangeToken } from "@/lib/tokens";

/**
 * A server action to handle an email change request.
 * @param values The form values containing the new email and current password.
 * @returns A promise resolving to an object with either a `success` or `error` message.
 */
export const requestEmailChange = async (values: EmailChangeRequestFormValues) => {
  // Authenticate the user's session
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { error: "Unauthorized." };
  }

  // Apply a general rate limit for this authenticated action based on the user's ID
  const { success: privateLimitSuccess } = await privateActionLimiter.limit(session.user.id);
  if (!privateLimitSuccess) {
    return { error: "You are making too many requests. Please try again shortly." };
  }

  // Validate the form fields against the schema
  const validatedFields = EmailChangeRequestSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Invalid fields provided." };
  }

  const { newEmail, currentPassword } = validatedFields.data;

  // Apply a stricter rate limit based on the target email address to prevent spamming
  const { success: emailLimitSuccess } = await emailActionLimiter.limit(newEmail);
  if (!emailLimitSuccess) {
    return { error: "A verification link for this email was requested recently. Please wait." };
  }

  // Fetch the full user record to perform password re-authentication
  const user = await getUserById(session.user.id);

  // Ensure this flow is only for users with a password (not OAuth-only accounts)
  if (!user || !user.password) {
    return { error: "Email cannot be changed for accounts without a password." };
  }

  // Re-authenticate the user by verifying their current password
  const passwordsMatch = await bcrypt.compare(currentPassword, user.password);
  if (!passwordsMatch) {
    return { error: "Incorrect password. Please try again." };
  }

  // Perform business logic checks
  if (newEmail === user.email) {
    return { error: "New email must be different from the current one." };
  }

  // Check if the new email is already taken by another account
  const existingUserWithNewEmail = await getUserByEmail(newEmail);
  if (existingUserWithNewEmail) {
    return { error: "This email address is already in use." };
  }

  try {
    // If all checks pass, generate a secure token for the change
    const emailChangeToken = await generateEmailChangeToken(session.user.id, newEmail);

    // Send a verification link to the new email address to confirm ownership
    await sendEmailChangeVerificationLink(emailChangeToken.newEmail, emailChangeToken.token);

    // Send a security alert to the old email address to notify of the change attempt
    await sendEmailChangeNotification(user.email, "old");

    return { success: "Verification link sent to your new email address." };
  } catch (error) {
    // Handle any unexpected server errors
    console.error("REQUEST_EMAIL_CHANGE_ACTION_ERROR:", error);
    return { error: "An unexpected error occurred while processing your request." };
  }
};
