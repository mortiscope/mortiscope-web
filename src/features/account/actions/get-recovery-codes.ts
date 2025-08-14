"use server";

import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { db } from "@/db";
import { twoFactorRecoveryCodes } from "@/db/schema";

/**
 * A server action to retrieve the status of the current user's two-factor
 * authentication (2FA) recovery codes. It provides a summary of the total,
 * used, and unused codes, as well as a boolean array representing the
 * status of the primary set of codes for interface display.
 *
 * @returns A promise that resolves to a structured response object.
 */
export const getRecoveryCodes = async () => {
  // Authenticate the user's session to ensure they are logged in.
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  const userId = session.user.id;

  try {
    // Fetch all recovery codes associated with the user from the database.
    const recoveryCodes = await db.query.twoFactorRecoveryCodes.findMany({
      where: eq(twoFactorRecoveryCodes.userId, userId),
      orderBy: (codes, { asc }) => [asc(codes.createdAt)],
    });

    // Create a boolean array to represent the status of up to 16 codes for the interface.
    const codeStatus: boolean[] = new Array(16).fill(false);

    // Filter for only the codes that have not yet been used.
    const unusedCodes = recoveryCodes.filter((code) => !code.used);
    // Mark the slots in the `codeStatus` array as `true` for each available unused code.
    for (let i = 0; i < Math.min(unusedCodes.length, 16); i++) {
      codeStatus[i] = true;
    }

    // Return the processed data in a structured success response.
    return {
      success: "Recovery codes status retrieved successfully.",
      data: {
        totalCodes: recoveryCodes.length,
        usedCount: recoveryCodes.filter((code) => code.used).length,
        unusedCount: unusedCodes.length,
        codeStatus,
        hasRecoveryCodes: recoveryCodes.length > 0,
      },
    };
  } catch (error) {
    // Catch any unexpected errors during the database operation.
    console.error("GET_RECOVERY_CODES_ACTION_ERROR:", error);
    return {
      error: "Failed to retrieve recovery codes status.",
    };
  }
};
