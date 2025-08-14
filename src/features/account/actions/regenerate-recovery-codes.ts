"use server";

import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { twoFactorRecoveryCodes } from "@/db/schema";
import { privateActionLimiter } from "@/lib/rate-limiter";
import {
  formatRecoveryCodesForDisplay,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "@/lib/two-factor";

/**
 * A server action to regenerate two-factor authentication (2FA) recovery codes.
 * This is a security-sensitive operation that invalidates all old codes and
 * creates a new set. It is protected by authentication and rate limiting.
 *
 * @returns A promise that resolves to a structured response object.
 */
export const regenerateRecoveryCodes = async () => {
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
      error: "You are regenerating recovery codes too frequently. Please try again later.",
    };
  }

  try {
    // Invalidate all existing recovery codes for the user by deleting them from the database.
    await db.delete(twoFactorRecoveryCodes).where(eq(twoFactorRecoveryCodes.userId, userId));

    // Generate a new set of 16 plaintext recovery codes.
    const newRecoveryCodes = generateRecoveryCodes(16);

    // Hash each of the new codes before storing them in the database.
    const hashedCodes = await Promise.all(
      newRecoveryCodes.map(async (code) => ({
        code: await hashRecoveryCode(code),
        userId,
      }))
    );

    // Insert the new, hashed codes into the database.
    await db.insert(twoFactorRecoveryCodes).values(hashedCodes);

    // Format the unhashed codes for display to the user.
    const formattedCodes = formatRecoveryCodesForDisplay(newRecoveryCodes);

    // Return the formatted codes in a success response.
    return {
      success: "Recovery codes have been regenerated successfully.",
      data: {
        recoveryCodes: formattedCodes,
      },
    };
  } catch (error) {
    // Catch any unexpected errors during the process.
    console.error("REGENERATE_RECOVERY_CODES_ACTION_ERROR:", error);
    return {
      error: "Failed to regenerate recovery codes.",
    };
  }
};
