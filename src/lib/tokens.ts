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

  const newVerificationToken = await db.transaction(async (tx) => {
    // Invalidate any existing tokens for this email.
    await tx.delete(verificationTokens).where(eq(verificationTokens.identifier, email));

    const result = await tx
      .insert(verificationTokens)
      .values({
        identifier: email,
        token,
        expires,
      })
      .returning();

    return result[0];
  });

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

  const newEmailChangeToken = await db.transaction(async (tx) => {
    await tx.delete(emailChangeTokens).where(eq(emailChangeTokens.userId, userId));

    const result = await tx
      .insert(emailChangeTokens)
      .values({
        userId,
        newEmail,
        token,
        expires,
      })
      .returning();

    return result[0];
  });

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

  const newForgotPasswordToken = await db.transaction(async (tx) => {
    await tx.delete(forgotPasswordTokens).where(eq(forgotPasswordTokens.identifier, email));

    const result = await tx
      .insert(forgotPasswordTokens)
      .values({
        identifier: email,
        token,
        expires,
      })
      .returning();

    return result[0];
  });

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

  const newDeletionToken = await db.transaction(async (tx) => {
    await tx.delete(accountDeletionTokens).where(eq(accountDeletionTokens.identifier, email));

    const result = await tx
      .insert(accountDeletionTokens)
      .values({
        identifier: email,
        token,
        expires,
      })
      .returning();

    return result[0];
  });

  return newDeletionToken;
};
