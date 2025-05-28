"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { getForgotPasswordTokenByToken } from "@/data/forgot-password-token";
import { getUserByEmail } from "@/data/user";
import { db } from "@/db";
import { forgotPasswordTokens, users } from "@/db/schema";
import { sendPasswordUpdatedEmail } from "@/lib/mail";
import { type ResetPasswordFormValues, ResetPasswordSchema } from "@/lib/schemas/auth";

/**
 * A server action to finalize the password reset process.
 * @param values The form values containing the new password.
 * @param token The unique token from the password reset link.
 * @returns A promise resolving to an object with either a `success` or `error` message.
 */
export const resetPassword = async (values: ResetPasswordFormValues, token?: string | null) => {
  // Ensure a token is provided in the request
  if (!token) {
    return { error: "Missing password reset token." };
  }

  // Validate the new password against the schema
  const validatedFields = ResetPasswordSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Invalid password. Check the requirements and try again." };
  }

  const { newPassword } = validatedFields.data;

  try {
    // Find the token in the database
    const existingToken = await getForgotPasswordTokenByToken(token);
    if (!existingToken) {
      return { error: "Invalid token provided." };
    }

    // Check if the token has expired
    const hasExpired = new Date(existingToken.expires) < new Date();
    if (hasExpired) {
      // If expired, delete the token to clean up the database
      await db
        .delete(forgotPasswordTokens)
        .where(eq(forgotPasswordTokens.token, existingToken.token));
      return { error: "Your reset link has expired." };
    }

    // Find the user associated with the token
    const existingUser = await getUserByEmail(existingToken.identifier);
    if (!existingUser) {
      return { error: "No user found for this reset link." };
    }

    // Hash the new password before storing it
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atomically update the user's password and delete the reset token
    await db.transaction(async (tx) => {
      // Update the user record with the new hashed password
      await tx
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id!));

      // Invalidate the token by deleting it from the database
      await tx
        .delete(forgotPasswordTokens)
        .where(eq(forgotPasswordTokens.token, existingToken.token));
    });

    // Send a confirmation email about the password change
    try {
      await sendPasswordUpdatedEmail(existingUser.email);
    } catch (error) {
      console.error("Failed to send password updated email:", error);
    }

    return { success: "Your password has been successfully updated!" };
  } catch (error) {
    // Handle any unexpected server errors
    console.error("RESET_PASSWORD_ACTION_ERROR:", error);
    return { error: "An unexpected error occurred. Please try again later." };
  }
};
