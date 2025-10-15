/**
 * Constant containing mock user credentials for authentication testing scenarios.
 */
export const mockAuthCredentials = {
  // Credentials for a user account that exists in the mock database.
  validUser: {
    email: "mortiscope@example.com",
    password: "SecurePassword123!",
  },
  // Credentials used to simulate incorrect login attempts or non-existent accounts.
  invalidUser: {
    email: "invalid@example.com",
    password: "wrongpassword",
  },
};

/**
 * Constant containing mock data for testing two-factor authentication (2FA) functionality.
 */
export const mockTwoFactorAuth = {
  // The base32 shared secret used for generating Time-based One-Time Passwords.
  secret: "JBSWY3DPEHPK3PXP",
  // A mock six-digit verification token provided by an authenticator application.
  token: "123456",
  // A list of backup recovery codes used when the primary 2FA method is unavailable.
  recoveryCodes: [
    "AAAA-BBBB-CCCC",
    "DDDD-EEEE-FFFF",
    "GGGG-HHHH-IIII",
    "JJJJ-KKKK-LLLL",
    "MMMM-NNNN-OOOO",
    "PPPP-QQQQ-RRRR",
    "SSSS-TTTT-UUUU",
    "VVVV-WWWW-XXXX",
  ],
};
