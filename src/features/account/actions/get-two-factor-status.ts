"use server";

import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { userTwoFactor } from "@/db/schema";

/**
 * Server action to get the current two-factor authentication status for the user.
 */
export const getTwoFactorStatus = async () => {
  // Authenticate the user's session
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  try {
    // Get the user's 2FA settings
    const twoFactorSettings = await db.query.userTwoFactor.findFirst({
      where: eq(userTwoFactor.userId, session.user.id),
      columns: {
        enabled: true,
        backupCodesGenerated: true,
        createdAt: true,
      },
    });

    return {
      success: true,
      data: {
        enabled: twoFactorSettings?.enabled ?? false,
        backupCodesGenerated: twoFactorSettings?.backupCodesGenerated ?? false,
        enabledAt: twoFactorSettings?.createdAt ?? null,
      },
    };
  } catch (error) {
    console.error("GET_TWO_FACTOR_STATUS_ACTION_ERROR:", error);
    return {
      error: "Failed to get two-factor authentication status.",
    };
  }
};
