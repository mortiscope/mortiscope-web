import type { TestUser } from "@e2e/fixtures/types";

/**
 * Generates a pool of test users by reading environment variables for parallel test execution.
 */
export const testUserPool: TestUser[] = Array.from({ length: 5 }, (_, i) => ({
  // Assign the email from the environment variable corresponding to the current index.
  email: process.env[`E2E_USER_EMAIL_${i + 1}`] || "",
  // Assign the password from the environment variable corresponding to the current index.
  password: process.env[`E2E_USER_PASSWORD_${i + 1}`] || "",
}));

/**
 * Stores the shared Time-based One-Time Password (TOTP) secret used for generating two-factor authentication codes during tests.
 */
export const E2E_TOTP_SECRET = process.env.E2E_TOTP_SECRET || "";

/**
 * Defines a primary test user for credential-based authentication, defaulting to the first user in the `testUserPool`.
 */
export const credentialUser: TestUser = {
  // Retrieve the email address from the first entry of the `testUserPool` array.
  email: testUserPool[0]?.email || "",
  // Retrieve the password from the first entry of the `testUserPool` array.
  password: testUserPool[0]?.password || "",
};
