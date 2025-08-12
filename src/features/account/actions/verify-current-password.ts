"use server";

import bcrypt from "bcryptjs";

import { auth } from "@/auth";
import { getUserById } from "@/data/user";
import { privateActionLimiter } from "@/lib/rate-limiter";

type VerifyCurrentPasswordValues = {
  currentPassword: string;
};

/**
 * A server action to verify the user's current password.
 * Used to enable password change fields after verification.
 * 
 * @param values The form values containing the current password.
 * @returns A promise resolving to an object with either a `success` or `error` message.
 */
export const verifyCurrentPassword = async (values: VerifyCurrentPasswordValues) => {
  // Authenticate the user's session
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  // Apply a rate limit based on the user's ID to prevent rapid verification attempts
  const { success } = await privateActionLimiter.limit(session.user.id);
  if (!success) {
    return {
      error: "You are attempting to verify your password too frequently. Please try again shortly.",
    };
  }

  const { currentPassword } = values;
  const userId = session.user.id;

  try {
    // Retrieve the current user from the database
    const user = await getUserById(userId);

    // If the user doesn't exist or doesn't have a password, block the action.
    if (!user || !user.password) {
      return {
        error: "Password verification is not available for accounts signed in with a provider.",
      };
    }

    // Verify that the provided current password is correct
    const isCurrentPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordCorrect) {
      return { error: "Incorrect current password." };
    }

    return { success: "Password verified successfully." };
  } catch (error) {
    console.error("VERIFY_CURRENT_PASSWORD_ACTION_ERROR:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
};
