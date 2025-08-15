"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getUserByEmail } from "@/data/user";
import { db } from "@/db";
import { twoFactorRecoveryCodes, userTwoFactor } from "@/db/schema";
import { clearAuthSession, getAuthSession, updateAuthSessionVerification } from "@/lib/auth";
import { authLogger, logUserAction } from "@/lib/logger";
import { publicActionLimiter } from "@/lib/rate-limiter";
import { verifyRecoveryCode } from "@/lib/two-factor";

/**
 * Server action to verify recovery code during the signin process.
 * This action is used when a user is using a recovery code to complete signin.
 */
export const verifySigninRecoveryCode = async (recoveryCode: string) => {
  // Get the request headers to extract the user's IP address for rate limiting
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for");

  // Apply rate limiting to prevent brute-force attacks
  const { success } = await publicActionLimiter.limit(ip ?? "127.0.0.1");
  if (!success) {
    return { error: "Too many attempts. Please try again in a moment." };
  }

  // Validate input
  if (!recoveryCode || typeof recoveryCode !== "string") {
    return { error: "Recovery code is required." };
  }

  // Clean and validate recovery code format
  const cleanCode = recoveryCode.replace(/[-\s]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(cleanCode)) {
    return { error: "Invalid recovery code format." };
  }

  // Get the current auth session
  const authSession = await getAuthSession();
  if (!authSession) {
    authLogger.warn("Recovery code verification attempted without valid auth session");
    return { error: "Session expired. Please sign in again." };
  }

  const { userId, email, provider } = authSession;

  try {
    // Get user data
    const user = await getUserByEmail(email);
    if (!user) {
      authLogger.error({ userId, email }, "User not found during recovery code verification");
      await clearAuthSession();
      return { error: "User not found. Please sign in again." };
    }

    // Check if user has 2FA enabled
    const twoFactorData = await db.query.userTwoFactor.findFirst({
      where: eq(userTwoFactor.userId, userId),
    });

    if (!twoFactorData?.enabled) {
      authLogger.error({ userId }, "2FA not enabled but recovery code verification attempted");
      await clearAuthSession();
      return { error: "Two-factor authentication is not enabled for this account." };
    }

    // Get all unused recovery codes for the user
    const recoveryCodes = await db.query.twoFactorRecoveryCodes.findMany({
      where: eq(twoFactorRecoveryCodes.userId, userId),
    });

    if (recoveryCodes.length === 0) {
      authLogger.warn({ userId }, "No recovery codes found for user");
      return { error: "No recovery codes available. Please use your authenticator app." };
    }

    // Find a matching recovery code (used or unused)
    let matchedCodeId: string | null = null;
    let codeAlreadyUsed = false;

    for (const code of recoveryCodes) {
      if (await verifyRecoveryCode(cleanCode, code.code)) {
        if (code.used) {
          codeAlreadyUsed = true;
        } else {
          matchedCodeId = code.id;
        }
        break;
      }
    }

    if (codeAlreadyUsed) {
      authLogger.warn({ userId, email }, "Used recovery code provided during signin");
      return {
        error: "This recovery code has already been used.",
      };
    }

    if (!matchedCodeId) {
      authLogger.warn({ userId, email }, "Invalid recovery code provided during signin");
      return { error: "Invalid recovery code." };
    }

    // Mark the recovery code as used
    await db
      .update(twoFactorRecoveryCodes)
      .set({
        used: true,
        usedAt: new Date(),
      })
      .where(eq(twoFactorRecoveryCodes.id, matchedCodeId));

    // Mark session as verified
    await updateAuthSessionVerification(true);

    // Log successful recovery code verification
    logUserAction(authLogger, "signin_recovery_verified", userId, {
      email,
      method: "recovery_code",
      provider: provider || "credentials",
      recoveryCodeId: matchedCodeId,
    });

    // Don't clear the auth session
    return {
      success: "Recovery code verified successfully.",
      verified: true,
      email,
      userId,
    };
  } catch (error) {
    authLogger.error({ userId, email, err: error }, "Error during recovery code verification");
    return { error: "An unexpected error occurred. Please try again." };
  }
};

/**
 * Server action to handle redirection when recovery code verification is successful.
 * This is called after successful verification to complete the signin flow.
 */
export const completeRecoverySignin = async () => {
  const authSession = await getAuthSession();

  if (!authSession?.verified) {
    return { error: "Verification required." };
  }

  try {
    // Clear the auth session
    await clearAuthSession();

    // Redirect to dashboard
    redirect("/dashboard");
  } catch (error) {
    authLogger.error({ err: error }, "Error completing recovery signin");
    return { error: "Failed to complete signin." };
  }
};
