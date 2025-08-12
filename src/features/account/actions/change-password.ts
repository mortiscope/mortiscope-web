"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { getUserById } from "@/data/user";
import { db } from "@/db";
import { users } from "@/db/schema";
import { AccountSecuritySchema } from "@/features/account/schemas/account";
import { type ChangePasswordFormValues, ChangePasswordSchema } from "@/features/auth/schemas/auth";
import { inngest } from "@/lib/inngest";
import { sendPasswordUpdatedEmail } from "@/lib/mail";
import { privateActionLimiter } from "@/lib/rate-limiter";

// Support both old and new form value types
type UpdatePasswordValues = {
  currentPassword: string;
  newPassword: string;
  repeatPassword: string;
};

/**
 * A server action to handle user password changes.
 * @param values The form values containing the current and new passwords.
 * @returns A promise resolving to an object with either a `success` or `error` message.
 */
export const changePassword = async (values: ChangePasswordFormValues | UpdatePasswordValues) => {
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

  let currentPassword: string;
  let newPassword: string;

  // Handle both old and new form value types
  if ("repeatPassword" in values) {
    // New format from account security form
    const validationResult = AccountSecuritySchema.pick({
      currentPassword: true,
      newPassword: true,
      repeatPassword: true,
    }).safeParse(values);

    if (!validationResult.success) {
      return { error: "Invalid fields provided." };
    }

    currentPassword = validationResult.data.currentPassword;
    newPassword = validationResult.data.newPassword;
  } else {
    // Legacy format from auth forms
    const validatedFields = ChangePasswordSchema.safeParse(values);
    if (!validatedFields.success) {
      return { error: "Invalid fields provided." };
    }

    currentPassword = validatedFields.data.currentPassword;
    newPassword = validatedFields.data.newPassword;
  }
  const userId = session.user.id;

  try {
    // Retrieve the current user from the database
    const user = await getUserById(userId);

    // If the user doesn't exist or doesn't have a password, block the action.
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
      await inngest.send({
        name: "account/password.updated",
        data: {
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
        },
      });
    } catch (inngestError) {
      console.error("Failed to trigger password update email event:", inngestError);
      // Fallback to direct email sending
      try {
        await sendPasswordUpdatedEmail(user.email);
      } catch (emailError) {
        console.error("Failed to send password updated email after change:", emailError);
      }
    }

    return { success: "Password updated successfully." };
  } catch (error) {
    console.error("CHANGE_PASSWORD_ACTION_ERROR:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
};

// Export alias for backward compatibility
export const updatePassword = changePassword;
