"use server";

import { eq } from "drizzle-orm";

import { getUserByEmail } from "@/data/user";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { verifyEmailChange } from "@/features/account/actions/verify-email-change";
import { getVerificationTokenByToken } from "@/features/auth/tokens/verification-token";
import { sendWelcomeEmail } from "@/lib/mail";

/**
 * Defines the standardized return structure for verification actions.
 */
export interface VerificationActionResult {
  /** The outcome of the verification process */
  status: "success" | "error" | "info";
  /** A user-facing message describing the result */
  message: string;
}

/**
 * A server action that serves as a router for different token-based verification flows.
 * @param token The unique verification token from the URL.
 * @param type The type of verification being performed (e.g., 'email-change').
 * @returns A promise resolving to a VerificationActionResult object.
 */
export const verification = async (
  token: string | null | undefined,
  type: string | null | undefined
): Promise<VerificationActionResult> => {
  if (!token) {
    return {
      status: "error",
      message: "Verification link incomplete. Use the link from your email.",
    };
  }

  // Route the request based on the verification type
  switch (type) {
    case "email-change":
      return await verifyEmailChange(token);

    // Default case handles new user email verification
    default:
      return await verifyNewUser(token);
  }
};

/**
 * Handles the verification process specifically for a new user account.
 * @param token The verification token for the new user.
 * @returns A promise resolving to a VerificationActionResult object.
 */
const verifyNewUser = async (token: string): Promise<VerificationActionResult> => {
  // Find the token in the database
  const existingToken = await getVerificationTokenByToken(token);
  if (!existingToken) {
    return {
      status: "error",
      message: "Invalid or used verification link. Please request a new one if needed.",
    };
  }

  // Check if the token has expired
  const hasExpired = new Date(existingToken.expires) < new Date();
  if (hasExpired) {
    // Clean up the expired token from the database
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.token, token))
      .catch((e) => console.error(e));
    return { status: "error", message: "This verification link has expired." };
  }

  // Find the user associated with the token
  const existingUser = await getUserByEmail(existingToken.identifier);
  if (!existingUser) {
    return { status: "error", message: "User for this verification link not found." };
  }

  // Handle the edge case where the user is already verified
  if (existingUser.emailVerified) {
    // Clean up the now-redundant token
    await db
      .delete(verificationTokens)
      .where(eq(verificationTokens.token, token))
      .catch((e) => console.error(e));
    return { status: "success", message: "Your email is already verified." };
  }

  try {
    // Update the user and delete the token
    await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, existingUser.id));

    await db.delete(verificationTokens).where(eq(verificationTokens.token, existingToken.token));

    // Send a welcome email
    await sendWelcomeEmail(existingUser.email, existingUser.name).catch((e) => console.error(e));

    return { status: "success", message: "Email successfully verified." };
  } catch (error) {
    // Handle any unexpected database errors during the transaction
    console.error("Error during new user verification:", error);
    return { status: "error", message: "Verification failed due to an unexpected error." };
  }
};
