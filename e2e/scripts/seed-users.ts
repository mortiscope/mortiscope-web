#!/usr/bin/env tsx

/**
 * E2E User Seeding Utility
 *
 * This script seeds the database with a specific set of test users required for
 * End-to-End (E2E) testing environments.
 *
 * Functionality:
 * - Reads user credentials from numbered environment variables (1-5)
 * - Performs a clean-up of existing E2E users to ensure idempotency
 * - Creates new user records with pre-verified emails
 * - Sets up Two-Factor Authentication (2FA) for each user
 * - Generates and hashes standardized recovery codes
 *
 * Usage:
 * Just run the script directly. It relies on .env variables:
 * - E2E_USER_EMAIL_{1-5}
 * - E2E_USER_PASSWORD_{1-5}
 * - E2E_TOTP_SECRET
 */

import { neon } from "@neondatabase/serverless";
import { createId } from "@paralleldrive/cuid2";
import bcrypt from "bcryptjs";
import chalk from "chalk";
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";

import { twoFactorRecoveryCodes, users, userTwoFactor } from "@/db/schema";

// Initialize environment variables from .env file
config();

// Database connection setup using Neon serverless driver
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

/**
 * Logs an informational message with blue styling
 * @param message - The info message to display
 */
function logInfo(message: string): void {
  console.log(`${chalk.blue("info")} - ${message}`);
}

/**
 * Logs a success message with green checkmark
 * @param message - The success message to display
 */
function logSuccess(message: string): void {
  console.log(`${chalk.green("✓")} ${message}`);
}

/**
 * Logs an error message with red X mark
 * @param message - The error message to display
 */
function logError(message: string): void {
  console.log(`${chalk.red("✗")} ${message}`);
}

/**
 * Interface representing the structure of an E2E user
 * derived from environment variables
 */
interface E2EUser {
  email: string;
  password: string;
}

/**
 * Retrieves E2E user credentials from environment variables.
 * @returns Array of valid user objects containing email and password
 */
function getE2EUsers(): E2EUser[] {
  const users: E2EUser[] = [];

  // Loop through expected indices (1 to 5) to collect user config
  for (let i = 1; i <= 5; i++) {
    const email = process.env[`E2E_USER_EMAIL_${i}`];
    const password = process.env[`E2E_USER_PASSWORD_${i}`];

    // Only add the user if both email and password are defined
    if (email && password) {
      users.push({ email, password });
    }
  }

  return users;
}

/**
 * Deletes existing E2E users and their associated data from the database.
 * This ensures the seeding process starts with a clean slate.
 *
 * @param e2eUsers - Array of users to check for and delete
 * @returns Promise resolving to the count of users actually deleted
 */
async function deleteExistingE2EUsers(e2eUsers: E2EUser[]): Promise<number> {
  let deletedCount = 0;

  for (const { email } of e2eUsers) {
    // Check if the user currently exists in the DB
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      const userId = existingUser[0].id;

      // Manually delete related records to satisfy foreign key constraints
      await db.delete(twoFactorRecoveryCodes).where(eq(twoFactorRecoveryCodes.userId, userId));
      await db.delete(userTwoFactor).where(eq(userTwoFactor.userId, userId));

      // Finally delete the user record itself
      await db.delete(users).where(eq(users.id, userId));
      deletedCount++;
    }
  }

  return deletedCount;
}

/**
 * Creates a new E2E user in the database with full 2FA configuration.
 *
 * @param email - The email address for the new user
 * @param password - The raw password (will be hashed)
 * @param totpSecret - The shared TOTP secret for generating 2FA codes
 * @param workerIndex - Index used to generate a unique display name
 */
async function createE2EUser(
  email: string,
  password: string,
  totpSecret: string,
  workerIndex: number
): Promise<void> {
  // Hash the password with a salt round of 12
  const hashedPassword = await bcrypt.hash(password, 12);
  const userId = createId();

  // Insert the main user record
  await db.insert(users).values({
    id: userId,
    email,
    password: hashedPassword,
    emailVerified: new Date(), // Automatically mark email as verified
    name: `MortiScope Worker ${workerIndex}`,
  });

  // Enable 2FA for the user with the provided secret
  await db.insert(userTwoFactor).values({
    userId,
    secret: totpSecret,
    enabled: true,
    backupCodesGenerated: true,
  });

  // Generate a standard set of recovery codes for testing purposes
  const recoveryCodes = ["E2E00001", "E2E00002", "E2E00003", "E2E00004"];
  for (const code of recoveryCodes) {
    // Hash each recovery code before storage for security
    const hashedCode = await bcrypt.hash(code, 12);
    await db.insert(twoFactorRecoveryCodes).values({
      userId,
      code: hashedCode,
      used: false,
    });
  }
}

/**
 * Orchestrates the validation, cleanup, and creation of E2E users.
 */
async function main(): Promise<void> {
  console.log(chalk.bold("\nE2E User Seeding\n"));

  // Fetch user configuration
  const e2eUsers = getE2EUsers();

  if (e2eUsers.length === 0) {
    logError("No E2E users configured in environment variables");
    logInfo("Expected: E2E_USER_EMAIL_1 through E2E_USER_EMAIL_5");
    process.exit(1);
  }

  // Validate TOTP Secret existence
  const totpSecret = process.env.E2E_TOTP_SECRET;
  if (!totpSecret) {
    logError("E2E_TOTP_SECRET not configured");
    process.exit(1);
  }

  logInfo(`Found ${e2eUsers.length} E2E users to seed`);

  // Cleanup: Remove any existing instances of these users
  const deletedCount = await deleteExistingE2EUsers(e2eUsers);
  if (deletedCount > 0) {
    logSuccess(`Deleted ${deletedCount} existing E2E users`);
  }

  // Seeding: Create new users with 2FA
  for (let i = 0; i < e2eUsers.length; i++) {
    const user = e2eUsers[i];
    await createE2EUser(user.email, user.password, totpSecret, i + 1);
    logSuccess(`Created ${chalk.cyan(user.email)}`);
  }

  console.log();
  logSuccess(`Seeding complete: ${e2eUsers.length} users created with 2FA enabled`);
}

// Execute the main function and handle any fatal errors
main().catch((error) => {
  logError(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
