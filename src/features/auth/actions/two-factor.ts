"use server";

import { eq } from "drizzle-orm";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { headers } from "next/headers";
import { verify as verifyTotp } from "otplib";

import { getUserByEmail } from "@/data/user";
import { db } from "@/db";
import { userTwoFactor } from "@/db/schema";
import { clearAuthSession, getAuthSession, updateAuthSessionVerification } from "@/lib/auth";
import { authLogger, logUserAction } from "@/lib/logger";
import { publicActionLimiter } from "@/lib/rate-limiter";

/**
 * Server action to verify TOTP token during the signin process.
 * This action is used when a user is completing 2FA verification to sign in.
 */
export const verifySigninTwoFactor = async (token: string) => {
  // Get the request headers to extract the user's IP address for rate limiting
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for");

  // Apply rate limiting to prevent brute-force attacks
  const { success } = await publicActionLimiter.limit(ip ?? "127.0.0.1");
  if (!success) {
    return { error: "Too many attempts. Please try again in a moment." };
  }

  // Validate input
  if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) {
    return { error: "Invalid verification code format." };
  }

  // Get the current auth session
  const authSession = await getAuthSession();
  if (!authSession) {
    authLogger.warn("Two-factor verification attempted without valid auth session");
    return { error: "Session expired. Please sign in again." };
  }

  const { userId, email, provider } = authSession;

  try {
    // Get user data
    const user = await getUserByEmail(email);
    if (!user) {
      authLogger.error({ userId, email }, "User not found during 2FA verification");
      await clearAuthSession();
      return { error: "User not found. Please sign in again." };
    }

    // Get user's 2FA settings
    const twoFactorData = await db.query.userTwoFactor.findFirst({
      where: eq(userTwoFactor.userId, userId),
    });

    if (!twoFactorData?.enabled || !twoFactorData.secret) {
      authLogger.error({ userId }, "2FA not enabled but verification attempted");
      await clearAuthSession();
      return { error: "Two-factor authentication is not enabled for this account." };
    }

    // Verify the TOTP token
    const result = await verifyTotp({
      token,
      secret: twoFactorData.secret,
    });

    if (!result.valid) {
      authLogger.warn({ userId, email }, "Invalid 2FA token provided during signin");
      return { error: "Invalid verification code. Please try again." };
    }

    // Mark session as verified
    await updateAuthSessionVerification(true);

    // Log successful 2FA verification
    logUserAction(authLogger, "signin_2fa_verified", userId, {
      email,
      method: "totp",
      provider: provider || "credentials",
    });

    // Don't clear the auth session
    return {
      success: "Two-factor authentication verified successfully.",
      verified: true,
      email,
      userId,
    };
  } catch (error) {
    authLogger.error({ userId, email, err: error }, "Error during 2FA verification");
    return { error: "An unexpected error occurred. Please try again." };
  }
};

/**
 * Server action to clear the temporary auth session after successful client-side signin.
 */
export const clearTwoFactorSession = async () => {
  try {
    await clearAuthSession();
    return { success: "Session cleared successfully." };
  } catch (error) {
    authLogger.error({ err: error }, "Error clearing 2FA session");
    return { error: "Failed to clear session." };
  }
};

/**
 * Server action to complete the sign-in process after two-factor verification.
 * @returns A promise that resolves to an object with an `error` message on failure.
 */
export const completeTwoFactorSignIn = async () => {
  // Dynamically import necessary modules.
  const { signIn: authSignIn } = await import("@/auth");
  const { AuthError } = await import("next-auth");

  // Retrieve the temporary 2FA session.
  const authSession = await getAuthSession();
  // The `verified` flag must be true.
  if (!authSession || !authSession.verified) {
    authLogger.warn("completeTwoFactorSignIn called without verified auth session");
    return { error: "Session expired. Please sign in again." };
  }

  try {
    // Call the main NextAuth.js `signIn` function using the 'credentials' provider.
    await authSignIn("credentials", {
      email: authSession.email,
      // This special, hardcoded string acts as a signal to the `authorize` callback.
      password: "2fa-verified",
      // Prevent server-side redirect. Let the client navigate instead.
      redirect: false,
    });

    return { success: "Sign-in completed successfully." };
  } catch (error) {
    // Handle specific authentication errors that might be thrown by NextAuth.js.
    if (error instanceof AuthError) {
      authLogger.error(
        { userId: authSession.userId, email: authSession.email, type: error.type },
        "2FA sign-in completion failed"
      );
      return { error: "Authentication failed. Please try again." };
    }
    if (isRedirectError(error)) {
      return { success: "Sign-in completed successfully." };
    }
    // For any other unexpected errors, re-throw them to be handled by the server.
    throw error;
  }
};
