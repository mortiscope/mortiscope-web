import { eq } from "drizzle-orm";

import { db } from "@/db";
import { forgotPasswordTokens } from "@/db/schema";

/**
 * Retrieves a forgot password token from the database by the user's email address.
 * @param email The email address (identifier) associated with the token.
 * @returns A promise that resolves to the token object if found, `undefined` if not found, or `null` on a database error.
 */
export const getForgotPasswordTokenByEmail = async (email: string) => {
  try {
    const forgotPasswordToken = await db.query.forgotPasswordTokens.findFirst({
      where: eq(forgotPasswordTokens.identifier, email),
    });

    return forgotPasswordToken;
  } catch {
    return null;
  }
};

/**
 * Retrieves a forgot password token from the database by its unique token string.
 * @param token The unique token value to query.
 * @returns A promise that resolves to the token object if found, `undefined` if not found, or `null` on a database error.
 */
export const getForgotPasswordTokenByToken = async (token: string) => {
  try {
    const forgotPasswordToken = await db.query.forgotPasswordTokens.findFirst({
      where: eq(forgotPasswordTokens.token, token),
    });

    return forgotPasswordToken;
  } catch {
    return null;
  }
};
