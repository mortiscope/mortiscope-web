import { eq } from "drizzle-orm";

import { db } from "@/db";
import { emailChangeTokens } from "@/db/schema";

/**
 * Retrieves an email change token from the database by its unique token string.
 * @param token The unique token value to query.
 * @returns A promise that resolves to the token object if found, `undefined` if not found, or `null` on a database error.
 */
export const getEmailChangeTokenByToken = async (token: string) => {
  try {
    return await db.query.emailChangeTokens.findFirst({
      where: eq(emailChangeTokens.token, token),
    });
  } catch {
    return null;
  }
};

/**
 * Deletes an email change token from the database by its ID.
 * @param id The unique ID of the token to be deleted.
 * @returns A promise that resolves when the operation is complete.
 */
export const deleteEmailChangeToken = async (id: string): Promise<void> => {
  try {
    await db.delete(emailChangeTokens).where(eq(emailChangeTokens.id, id));
  } catch (error) {
    console.error("Error deleting email change token:", error);
  }
};
