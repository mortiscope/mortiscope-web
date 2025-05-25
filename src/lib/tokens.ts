import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

import { db } from "@/db";
import { verificationTokens } from "@/db/schema";

/**
 * Generates a new email verification token.
 * @param email The user's email address for which to generate the token.
 * @returns A promise resolving to the newly created verification token record.
 */
export const generateVerificationToken = async (email: string) => {
  const token = uuidv4();
  // Token is valid for 1 hour.
  const expires = new Date(new Date().getTime() + 3600 * 1000);

  const newVerificationToken = await db.transaction(async (tx) => {
    // Invalidate any existing tokens for this email.
    await tx.delete(verificationTokens).where(eq(verificationTokens.identifier, email));

    const result = await tx
      .insert(verificationTokens)
      .values({
        identifier: email,
        token,
        expires,
      })
      .returning();

    return result[0];
  });

  return newVerificationToken;
};
