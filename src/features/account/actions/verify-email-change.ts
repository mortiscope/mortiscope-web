"use server";

import { eq } from "drizzle-orm";

import { getUserByEmail, getUserById } from "@/data/user";
import { db } from "@/db";
import { emailChangeTokens, sessions, users } from "@/db/schema";
import {
  deleteEmailChangeToken,
  getEmailChangeTokenByToken,
} from "@/features/account/tokens/email-change-token";
import type { VerificationActionResult } from "@/features/auth/actions/verification";
import { sendEmailChangeNotification } from "@/lib/mail";

/**
 * A server action to finalize and verify an email address change.
 * @param token The unique token from the email change verification link.
 * @returns A promise resolving to a VerificationActionResult object.
 */
export const verifyEmailChange = async (token: string): Promise<VerificationActionResult> => {
  // Validate that a token was provided
  if (!token) {
    return { status: "error", message: "Missing verification token." };
  }

  // Find the token in the database to ensure it's valid
  const existingToken = await getEmailChangeTokenByToken(token);
  if (!existingToken) {
    return { status: "error", message: "Invalid verification link." };
  }

  // Check if the token has expired. If so, delete it and inform the user
  const hasExpired = new Date(existingToken.expires) < new Date();
  if (hasExpired) {
    await deleteEmailChangeToken(existingToken.id);
    return { status: "error", message: "Verification link has expired." };
  }

  // Ensure the user associated with the token still exists
  const user = await getUserById(existingToken.userId);
  if (!user) {
    // Token is invalid if the associated user is gone
    await deleteEmailChangeToken(existingToken.id);
    return { status: "error", message: "User not found." };
  }

  //Prevent a race condition by checking if the target email has been taken since the request
  const existingUserWithNewEmail = await getUserByEmail(existingToken.newEmail);
  if (existingUserWithNewEmail && existingUserWithNewEmail.id !== user.id) {
    return {
      status: "error",
      message: "Email address has been taken. Please restart the process.",
    };
  }

  try {
    // Update the user's email and mark it as verified
    await db
      .update(users)
      .set({
        email: existingToken.newEmail,
        emailVerified: new Date(),
      })
      .where(eq(users.id, existingToken.userId));

    // For security, invalidate all active sessions for this user by forcing a log-out on all other devices
    await db.delete(sessions).where(eq(sessions.userId, existingToken.userId));

    // Delete the used token to prevent it from being used again
    await db.delete(emailChangeTokens).where(eq(emailChangeTokens.id, existingToken.id));

    // After the operations succeed, send a final confirmation email to the new address
    await sendEmailChangeNotification(existingToken.newEmail, "new");

    return { status: "success", message: "Your email address has been successfully updated!" };
  } catch (error) {
    // Handle any unexpected errors during the database operations
    console.error("VERIFY_EMAIL_CHANGE_ACTION_ERROR:", error);
    return { status: "error", message: "An unexpected error occurred while updating your email." };
  }
};
