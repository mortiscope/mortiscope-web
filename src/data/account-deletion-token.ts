import { eq } from "drizzle-orm";

import { db } from "@/db";
import { accountDeletionTokens } from "@/db/schema";

/**
 * Retrieves an account deletion token from the database by its unique token value.
 * @param token The unique token string to query.
 * @returns A promise that resolves to the token object, or null if not found or a database error occurs.
 */
export const getAccountDeletionTokenByToken = async (token: string) => {
  try {
    const deletionToken = await db.query.accountDeletionTokens.findFirst({
      where: eq(accountDeletionTokens.token, token),
    });
    return deletionToken || null;
  } catch (error) {
    console.error("DATABASE_ERROR: Failed to retrieve account deletion token.", error);
    return null;
  }
};
