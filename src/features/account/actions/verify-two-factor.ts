"use server";

import { eq } from "drizzle-orm";
import { authenticator } from "otplib";

import { auth } from "@/auth";
import { db } from "@/db";
import { twoFactorRecoveryCodes, userTwoFactor } from "@/db/schema";
import {
  type VerifyTwoFactorFormValues,
  VerifyTwoFactorSchema,
} from "@/features/account/schemas/account";
import { privateActionLimiter } from "@/lib/rate-limiter";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/two-factor";

/**
 * Server action to verify the TOTP token and enable two-factor authentication.
 * This completes the two-factor authentication setup process.
 */
export const verifyTwoFactor = async (values: VerifyTwoFactorFormValues) => {
  // Validate input using centralized schema
  const validatedFields = VerifyTwoFactorSchema.safeParse(values);
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
      error: "You are attempting to verify two-factor authentication too frequently.",
    };
  }

  const { secret, token } = validatedFields.data;

  try {
    // Verify the token against the secret
    const isValid = authenticator.verify({
      token,
      secret,
    });

    if (!isValid) {
      return {
        error: "Invalid verification code.",
      };
    }

    // Check if user already has 2FA enabled
    const existingTwoFactor = await db.query.userTwoFactor.findFirst({
      where: eq(userTwoFactor.userId, userId),
    });

    if (existingTwoFactor?.enabled) {
      return {
        error: "Two-factor authentication is already enabled for this account.",
      };
    }

    // Generate 16 recovery codes
    const recoveryCodes = generateRecoveryCodes(16);

    // Hash the recovery codes for secure storage
    const hashedCodes = await Promise.all(
      recoveryCodes.map(async (code) => ({
        code: await hashRecoveryCode(code),
        userId,
      }))
    );

    // Save or update the 2FA settings
    if (existingTwoFactor) {
      await db
        .update(userTwoFactor)
        .set({
          secret,
          enabled: true,
          backupCodesGenerated: true,
          updatedAt: new Date(),
        })
        .where(eq(userTwoFactor.userId, userId));
    } else {
      await db.insert(userTwoFactor).values({
        userId,
        secret,
        enabled: true,
        backupCodesGenerated: true,
      });
    }

    // Save the recovery codes
    await db.insert(twoFactorRecoveryCodes).values(hashedCodes);

    return {
      success: "Two-factor authentication has been successfully enabled.",
      data: {
        recoveryCodes,
      },
    };
  } catch (error) {
    console.error("VERIFY_TWO_FACTOR_ACTION_ERROR:", error);
    return {
      error: "Failed to verify two-factor authentication code.",
    };
  }
};
