import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import { twoFactorRecoveryCodes, users, userTwoFactor, verificationTokens } from "@/db/schema";

// Initialize the connection to the Neon database using the environment variable `DATABASE_URL`.
const sql = neon(process.env.DATABASE_URL!);
// Initialize the Drizzle ORM instance with the HTTP driver for Neon.
const db = drizzle(sql);

/**
 * Creates a new verification token for a specific email address and stores it in the database.
 */
export async function createVerificationToken(email: string): Promise<string> {
  // Generate a unique identifier for the token using a random UUID.
  const token = randomUUID();
  // Set the expiration date to exactly one hour from the current timestamp.
  const expires = new Date(Date.now() + 1000 * 60 * 60);

  // Insert the new token record into the `verificationTokens` table.
  await db.insert(verificationTokens).values({
    identifier: email,
    token,
    expires,
  });

  // Return the generated token string to the caller.
  return token;
}

/**
 * Removes a specific verification token from the database.
 */
export async function deleteVerificationToken(token: string): Promise<void> {
  // Execute a delete operation on the `verificationTokens` table where the `token` column matches the provided string.
  await db.delete(verificationTokens).where(eq(verificationTokens.token, token));
}

/**
 * Retrieves a user record from the database based on the provided email address.
 */
export async function getUserByEmail(email: string) {
  // Query the `users` table for a single record matching the `email` parameter.
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Return the user object if found, otherwise return undefined.
  return user;
}

/**
 * Sets the email verification status of a user to null, effectively making the user unverified.
 */
export async function setUserUnverified(email: string): Promise<void> {
  // Update the `emailVerified` column to null for the user matching the provided `email`.
  await db.update(users).set({ emailVerified: null }).where(eq(users.email, email));
}

/**
 * Restores or sets the email verification date for a specific user.
 */
export async function restoreUserVerified(email: string, date: Date): Promise<void> {
  // Update the `emailVerified` column with the provided `date` object for the user matching the provided `email`.
  await db.update(users).set({ emailVerified: date }).where(eq(users.email, email));
}

/**
 * Hashes a plaintext recovery code and stores it in the database for a specific user.
 */
export async function createRecoveryCode(
  userId: string,
  plaintextCode: string,
  used: boolean = false
): Promise<{ id: string; plaintextCode: string }> {
  // Hash the uppercase version of the plaintext code using bcrypt with a cost factor of 12.
  const hashedCode = await bcrypt.hash(plaintextCode.toUpperCase(), 12);

  // Insert the hashed code and usage status into the `twoFactorRecoveryCodes` table and return the new ID.
  const [result] = await db
    .insert(twoFactorRecoveryCodes)
    .values({
      userId,
      code: hashedCode,
      used,
    })
    .returning({ id: twoFactorRecoveryCodes.id });

  // Return the database ID along with the original uppercase plaintext code for display to the user.
  return { id: result.id, plaintextCode: plaintextCode.toUpperCase() };
}

/**
 * Deletes a specific two-factor recovery code record by its unique identifier.
 */
export async function deleteRecoveryCode(id: string): Promise<void> {
  // Execute a delete operation on the `twoFactorRecoveryCodes` table using the provided `id`.
  await db.delete(twoFactorRecoveryCodes).where(eq(twoFactorRecoveryCodes.id, id));
}

/**
 * Retrieves the encrypted two-factor authentication secret for a specific user.
 */
export async function getUserTwoFactorSecret(userId: string): Promise<string | null> {
  // Select the `secret` column from the `userTwoFactor` table for the matching `userId`.
  const result = await db
    .select({ secret: userTwoFactor.secret })
    .from(userTwoFactor)
    .where(eq(userTwoFactor.userId, userId))
    .limit(1);

  // Return the secret string if a record exists, otherwise return null.
  return result.length > 0 ? result[0].secret : null;
}
