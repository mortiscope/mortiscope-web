"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { getUserById } from "@/data/user";
import { db } from "@/db";
import { users } from "@/db/schema";
import { type ChangePasswordFormValues, ChangePasswordSchema } from "@/features/auth/schemas/auth";
import { sendPasswordUpdatedEmail } from "@/lib/mail";
import { privateActionLimiter } from "@/lib/rate-limiter";

/**
 * A server action to handle user password changes.
 * @param values The form values containing the current and new passwords.
 * @returns A promise resolving to an object with either a `success` or `error` message.
 */
export const changePassword = async (values: ChangePasswordFormValues) => {
  // Authenticate the user's session
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  // Apply a rate limit based on the user's ID to prevent rapid password change attempts from a single account
  const { success } = await privateActionLimiter.limit(session.user.id);
  if (!success) {
    return {
      error: "You are attempting to change your password too frequently. Please try again shortly.",
    };
  }

  // Validate the form fields against the schema
  const validatedFields = ChangePasswordSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Invalid fields provided." };
  }

  const { currentPassword, newPassword } = validatedFields.data;
  const userId = session.user.id;

  try {
    // Retrieve the current user from the database
    const user = await getUserById(userId);

    // If the user doesn't exist or doesn't have a password (is an OAuth user), block the action.
    if (!user || !user.password) {
      return { error: "Password cannot be changed for accounts signed in with a provider." };
    }

    // Verify that the provided current password is correct
    const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordCorrect) {
      return { error: "Incorrect current password." };
    }

    // Hash the new password and update the user record in the database
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Send a notification email about the password change
    try {
      await sendPasswordUpdatedEmail(user.email);
    } catch (error) {
      console.error("Failed to send password updated email after change:", error);
    }

    return { success: "Password updated successfully." };
  } catch (error) {
    console.error("CHANGE_PASSWORD_ACTION_ERROR:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
};
