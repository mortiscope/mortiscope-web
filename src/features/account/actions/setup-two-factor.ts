"use server";

import { eq } from "drizzle-orm";
import { authenticator } from "otplib";

import { auth } from "@/auth";
import { db } from "@/db";
import { userTwoFactor } from "@/db/schema";
import { SetupTwoFactorSchema } from "@/features/account/schemas/account";
import { privateActionLimiter } from "@/lib/rate-limiter";

/**
 * Server action to generate a new TOTP secret and return the QR code data.
 * This is the first step in setting up two-factor authentication.
 */
export const setupTwoFactor = async (values: unknown = {}) => {
  // Validate input using centralized schema
  const validatedFields = SetupTwoFactorSchema.safeParse(values);
  if (!validatedFields.success) {
    return { error: "Invalid input." };
  }
  // Authenticate the user's session
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  const userId = session.user.id;

  // Apply rate limiting
  const { success } = await privateActionLimiter.limit(userId);
  if (!success) {
    return {
      error:
        "You are attempting to setup two-factor authentication too frequently.",
    };
  }

  try {
    // Check if user already has 2FA enabled
    const existingTwoFactor = await db.query.userTwoFactor.findFirst({
      where: eq(userTwoFactor.userId, userId),
    });

    if (existingTwoFactor?.enabled) {
      return {
        error: "Two-factor authentication is already enabled for this account.",
      };
    }

    // Generate a new secret for the user
    const secret = authenticator.generateSecret();

    // Use the user's email from session
    const userEmail = session.user.email || "user@example.com";
    const serviceName = "MortiScope";

    // Generate the otpauth URL for QR code
    const otpauthUrl = authenticator.keyuri(userEmail, serviceName, secret);

    return {
      success: true,
      data: {
        secret,
        qrCodeUrl: otpauthUrl,
      },
    };
  } catch (error) {
    console.error("SETUP_TWO_FACTOR_ACTION_ERROR:", error);
    return {
      error: "Failed to generate two-factor authentication setup.",
    };
  }
};
