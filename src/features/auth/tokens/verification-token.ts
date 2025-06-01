import { eq } from "drizzle-orm";

import { db } from "@/db";
import { verificationTokens } from "@/db/schema";

/**
 * Retrieves a verification token from the database by the user's email address.
 * @param email The email address (identifier) associated with the token.
 * @returns A promise that resolves to the token object if found, `undefined` if not found, or `null` on a database error.
 */
export const getVerificationTokenByEmail = async (email: string) => {
  try {
    const verificationToken = await db.query.verificationTokens.findFirst({
      where: eq(verificationTokens.identifier, email),
    });

    return verificationToken;
  } catch {
    return null;
  }
};

/**
 * Retrieves a verification token from the database by its unique token string.
 * @param token The unique token value to query.
 * @returns A promise that resolves to the token object if found, `undefined` if not found, or `null` on a database error.
 */
export const getVerificationTokenByToken = async (token: string) => {
  try {
    const verificationToken = await db.query.verificationTokens.findFirst({
      where: eq(verificationTokens.token, token),
    });

    return verificationToken;
  } catch {
    return null;
  }
};
