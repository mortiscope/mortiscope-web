"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { getUserById } from "@/data/user";
import { db } from "@/db";
import { twoFactorRecoveryCodes, userTwoFactor } from "@/db/schema";
import { privateActionLimiter } from "@/lib/rate-limiter";

/**
 * Defines the shape of the input values for the disable two factor server action.
 */
type DisableTwoFactorValues = {
  currentPassword: string;
};

/**
 * A server action to disable two-factor authentication (2FA) for the currently authenticated user.
 *
 * @param values An object containing the user's `currentPassword` for re-authentication.
 * @returns A promise that resolves to a structured response object.
 */
export const disableTwoFactor = async (values: DisableTwoFactorValues) => {
  // Authenticate the user's session to ensure they are logged in.
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  const userId = session.user.id;

  // Apply rate limiting to prevent abuse of this sensitive action.
  const { success } = await privateActionLimiter.limit(userId);
  if (!success) {
    return {
      error: "You are making too many requests.",
    };
  }

  const { currentPassword } = values;

  // Perform basic validation to ensure a password was provided.
  if (
    !currentPassword ||
    typeof currentPassword !== "string" ||
    currentPassword.trim().length === 0
  ) {
    return {
      error: "Current password is required.",
    };
  }

  try {
    // Fetch the full user record to access their hashed password.
    const user = await getUserById(userId);

    // Protects against attempting this action on OAuth-only accounts.
    if (!user?.password) {
      return {
        error: "User not found or password not set.",
      };
    }

    // Re-authenticate the user by verifying their current password.
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return {
        error: "Invalid password.",
      };
    }

    // Confirm that 2FA is actually enabled for this user before attempting to disable it.
    const existingTwoFactor = await db.query.userTwoFactor.findFirst({
      where: eq(userTwoFactor.userId, userId),
    });

    if (!existingTwoFactor || !existingTwoFactor.enabled) {
      return {
        error: "Two-factor authentication is not enabled for this account.",
      };
    }

    // Sequentially delete all associated recovery codes and then the main 2FA setting.
    await db.delete(twoFactorRecoveryCodes).where(eq(twoFactorRecoveryCodes.userId, userId));
    await db.delete(userTwoFactor).where(eq(userTwoFactor.userId, userId));

    // Return a success message upon completion.
    return {
      success: "Two-factor authentication has been disabled successfully.",
    };
  } catch (error) {
    // Catch any unexpected errors during the database operations.
    console.error("DISABLE_TWO_FACTOR_ACTION_ERROR:", error);
    return {
      error: "Failed to disable two-factor authentication.",
    };
  }
};
