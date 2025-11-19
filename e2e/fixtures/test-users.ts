import type { TestUser } from "@e2e/fixtures/types";

/**
 * Generates a pool of 2FA-enabled test users (indices 1-5) for parallel worker test execution.
 */
export const testUserPool: TestUser[] = Array.from({ length: 5 }, (_, i) => ({
  // Assign the email from the environment variable corresponding to the current index.
  email: process.env[`E2E_USER_EMAIL_${i + 1}`] || "",
  // Assign the password from the environment variable corresponding to the current index.
  password: process.env[`E2E_USER_PASSWORD_${i + 1}`] || "",
}));

/**
 * Generates a pool of non-2FA test users (indices 6-10) for authenticated test sessions
 * that cannot complete a TOTP challenge, and for parallel authenticated worker execution.
 */
export const nonTwoFactorUserPool: TestUser[] = Array.from({ length: 5 }, (_, i) => ({
  // Assign the email from the environment variable corresponding to the current index (6-10).
  email: process.env[`E2E_USER_EMAIL_${i + 6}`] || "",
  // Assign the password from the environment variable corresponding to the current index (6-10).
  password: process.env[`E2E_USER_PASSWORD_${i + 6}`] || "",
}));

/**
 * Stores the shared Time-based One-Time Password (TOTP) secret used for generating two-factor authentication codes during tests.
 */
export const E2E_TOTP_SECRET = process.env.E2E_TOTP_SECRET || "";

/**
 * Defines a primary test user for credential-based authentication, using the first non-2FA user (index 6).
 * This user is pre-authenticated by global-setup and stored in `e2e/.auth/credential-user.json`.
 */
export const credentialUser: TestUser = {
  // Retrieve the email address from the first entry of the `nonTwoFactorUserPool` array.
  email: nonTwoFactorUserPool[0]?.email || "",
  // Retrieve the password from the first entry of the `nonTwoFactorUserPool` array.
  password: nonTwoFactorUserPool[0]?.password || "",
};
