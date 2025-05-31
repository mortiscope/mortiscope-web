import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

import { db } from "@/db";
import {
  accountDeletionTokens,
  emailChangeTokens,
  forgotPasswordTokens,
  verificationTokens,
} from "@/db/schema";

/**
 * Generates a new email verification token.
 * @param email The user's email address for which to generate the token.
 * @returns A promise resolving to the newly created verification token record.
 */
export const generateVerificationToken = async (email: string) => {
  const token = uuidv4();
  // Token is valid for 1 hour.
  const expires = new Date(new Date().getTime() + 3600 * 1000);

  // Invalidate any existing tokens for this email.
  await db.delete(verificationTokens).where(eq(verificationTokens.identifier, email));

  // Create the new token.
  const [newVerificationToken] = await db
    .insert(verificationTokens)
    .values({
      identifier: email,
      token,
      expires,
    })
    .returning();

  return newVerificationToken;
};

/**
 * Generates a token to confirm an email address change.
 * @param userId The unique ID of the user changing their email.
 * @param newEmail The new email address that needs verification.
 * @returns A promise resolving to the newly created email change token record.
 */
export const generateEmailChangeToken = async (userId: string, newEmail: string) => {
  const token = uuidv4();
  // Token is valid for 30 minutes.
  const expires = new Date(new Date().getTime() + 1800 * 1000);

  // Invalidate any existing tokens for this user.
  await db.delete(emailChangeTokens).where(eq(emailChangeTokens.userId, userId));

  // Create the new token.
  const [newEmailChangeToken] = await db
    .insert(emailChangeTokens)
    .values({
      userId,
      newEmail,
      token,
      expires,
    })
    .returning();

  return newEmailChangeToken;
};

/**
 * Generates a new password reset token.
 * @param email The user's email address.
 * @returns A promise resolving to the newly created password reset token record.
 */
export const generateForgotPasswordToken = async (email: string) => {
  const token = uuidv4();
  // Token is valid for 1 hour.
  const expires = new Date(new Date().getTime() + 3600 * 1000);

  // Invalidate any existing tokens for this email.
  await db.delete(forgotPasswordTokens).where(eq(forgotPasswordTokens.identifier, email));

  // Create the new token.
  const [newForgotPasswordToken] = await db
    .insert(forgotPasswordTokens)
    .values({
      identifier: email,
      token,
      expires,
    })
    .returning();

  return newForgotPasswordToken;
};

/**
 * Generates a token to confirm an account deletion request.
 * @param email The email associated with the account to be deleted.
 * @returns A promise resolving to the newly created account deletion token record.
 */
export const generateAccountDeletionToken = async (email: string) => {
  const token = uuidv4();
  // Token is valid for 1 hour.
  const expires = new Date(new Date().getTime() + 3600 * 1000);

  // Invalidate any existing tokens for this email.
  await db.delete(accountDeletionTokens).where(eq(accountDeletionTokens.identifier, email));

  // Create the new token.
  const [newDeletionToken] = await db
    .insert(accountDeletionTokens)
    .values({
      identifier: email,
      token,
      expires,
    })
    .returning();

  return newDeletionToken;
};
