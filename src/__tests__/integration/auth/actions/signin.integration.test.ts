"use server";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { users, userTwoFactor } from "@/db/schema";
import { signIn } from "@/features/auth/actions/signin";

// Mock the next/headers module to simulate request-specific data like IP addresses.
vi.mock("next/headers", () => ({
  headers: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue("127.0.0.1"),
  }),
}));

// Mock the next-auth error class to test specific authentication failure types.
vi.mock("next-auth", () => {
  class MockAuthError extends Error {
    type: string;
    constructor(type: string) {
      super(type);
      this.type = type;
    }
  }
  return {
    AuthError: MockAuthError,
  };
});

// Mock the core Auth.js signIn function to control authentication outcomes.
vi.mock("@/auth", () => ({
  signIn: vi.fn().mockResolvedValue(undefined),
}));

// Mock the auth utility module to simulate session creation logic.
vi.mock("@/lib/auth", () => ({
  createAuthSession: vi.fn().mockResolvedValue(undefined),
}));

// Mock the logging system to verify that events and errors are recorded.
vi.mock("@/lib/logger", () => ({
  authLogger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  emailLogger: {
    info: vi.fn(),
  },
  logError: vi.fn(),
  logUserAction: vi.fn(),
}));

// Mock the mail service to prevent actual email delivery during integration tests.
vi.mock("@/lib/mail", () => ({
  sendAccountDeletionCancelled: vi.fn().mockResolvedValue(undefined),
  sendEmailVerification: vi.fn().mockResolvedValue(undefined),
}));

// Mock the rate limiter to test traffic control and IP fallback logic.
vi.mock("@/lib/rate-limiter", () => ({
  publicActionLimiter: {
    limit: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock the token generation service to provide static verification values.
vi.mock("@/lib/tokens", () => ({
  generateVerificationToken: vi.fn().mockResolvedValue({
    identifier: "mortiscope@example.com",
    token: "mock-token-123",
  }),
}));

// Mock the bcryptjs library to simulate password comparison without hashing overhead.
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn().mockResolvedValue(true),
  },
  compare: vi.fn().mockResolvedValue(true),
}));

/**
 * Integration test suite for `signIn` server action.
 */
describe("signIn (integration)", () => {
  const validInput = {
    email: mockUsers.primaryUser.email,
    password: "SecurePassword123!",
  };

  /**
   * Clears all mock history and resets the database before each test.
   */
  beforeEach(async () => {
    // Arrange: Reset all mocks and the database state.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Set a default IP address in the headers mock.
    const { headers } = await import("next/headers");
    vi.mocked(headers).mockReturnValue({
      get: vi.fn().mockReturnValue("127.0.0.1"),
    } as never);
  });

  /**
   * Test suite for verifying rate limiting during sign-in attempts.
   */
  describe("rate limiting", () => {
    /**
     * Verifies that the action blocks sign-in when too many requests are made.
     */
    it("returns error when rate limit exceeded", async () => {
      // Arrange: Configure the rate limiter to return a failure status.
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: false } as never);

      // Act: Attempt to sign in with valid credentials.
      const result = await signIn(validInput);

      // Assert: Check for the rate limit error message.
      expect(result).toEqual({
        error: "Too many requests. Please try again in a moment.",
      });
    });

    /**
     * Verifies that the system identifies the client via a fallback IP.
     */
    it("uses fallback IP when x-forwarded-for is null", async () => {
      // Arrange: Simulate a request environment where the IP header is missing.
      const { headers } = await import("next/headers");
      const { publicActionLimiter } = await import("@/lib/rate-limiter");

      vi.mocked(headers).mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      } as never);
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);

      // Act: Invoke the sign-in action.
      await signIn(validInput);

      // Assert: Verify the rate limiter received the default local IP.
      expect(publicActionLimiter.limit).toHaveBeenCalledWith("127.0.0.1");
    });
  });

  /**
   * Test suite for verifying sign-in input validation.
   */
  describe("input validation", () => {
    /**
     * Resets the rate limiter for validation-specific tests.
     */
    beforeEach(async () => {
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);
    });

    /**
     * Verifies rejection of malformed email addresses.
     */
    it("returns error for invalid email", async () => {
      // Act: Submit an email that does not match standard patterns.
      const result = await signIn({
        email: "invalid-email",
        password: "password123",
      });

      // Assert: Check for the generic credentials error.
      expect(result).toEqual({ error: "Invalid credentials provided." });
    });

    /**
     * Verifies rejection of empty password fields.
     */
    it("returns error for empty password", async () => {
      // Act: Submit a valid email with an empty password string.
      const result = await signIn({
        email: "test@example.com",
        password: "",
      });

      // Assert: Check for the generic credentials error.
      expect(result).toEqual({ error: "Invalid credentials provided." });
    });
  });

  /**
   * Test suite for verifying user existence and account type.
   */
  describe("user lookup", () => {
    /**
     * Configures the rate limiter for lookup tests.
     */
    beforeEach(async () => {
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);
    });

    /**
     * Verifies failure when the email does not exist in the `users` table.
     */
    it("returns error when user not found", async () => {
      // Act: Attempt to sign in with an email that has no record.
      const result = await signIn(validInput);

      // Assert: Verify the user is informed of the failure without exposing user absence.
      expect(result).toEqual({ error: "Invalid email or password." });
    });

    /**
     * Verifies failure when an OAuth user attempts to sign in via credentials.
     */
    it("returns error when user has no password (OAuth user)", async () => {
      // Arrange: Insert a user record with a null password.
      await db.insert(users).values({
        id: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        name: mockUsers.primaryUser.name,
        password: null,
        emailVerified: new Date(),
      });

      // Act: Attempt credential-based sign-in for the OAuth account.
      const result = await signIn(validInput);

      // Assert: Check for the generic invalid credentials response.
      expect(result).toEqual({ error: "Invalid email or password." });
    });
  });

  /**
   * Test suite for verifying account recovery behavior upon sign-in.
   */
  describe("account recovery", () => {
    /**
     * Configures the rate limiter for account recovery tests.
     */
    beforeEach(async () => {
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);
    });

    /**
     * Verifies that signing in cancels any pending account deletion.
     */
    it("cancels scheduled deletion on signin", async () => {
      // Arrange: Seed a user that is currently scheduled for deletion.
      const { logUserAction } = await import("@/lib/logger");

      await db.insert(users).values({
        id: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        name: mockUsers.primaryUser.name,
        password: "hashed-password",
        emailVerified: new Date(),
        deletionScheduledAt: new Date(),
      });

      // Act: Perform a successful sign-in.
      await signIn(validInput);

      // Assert: Confirm that an account recovery event was logged.
      expect(logUserAction).toHaveBeenCalledWith(
        expect.anything(),
        "account_recovery",
        mockUsers.primaryUser.id,
        expect.objectContaining({
          scheduledDeletionCancelled: true,
        })
      );
    });

    /**
     * Verifies that email failure during recovery does not block the sign-in.
     */
    it("handles email sending failure during account recovery", async () => {
      // Arrange: Seed a deletion-scheduled user and force an email failure.
      const { sendAccountDeletionCancelled } = await import("@/lib/mail");
      const { logError } = await import("@/lib/logger");

      await db.insert(users).values({
        id: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        name: mockUsers.primaryUser.name,
        password: "hashed-password",
        emailVerified: new Date(),
        deletionScheduledAt: new Date(),
      });

      vi.mocked(sendAccountDeletionCancelled).mockRejectedValue(new Error("Email failed"));

      // Act: Sign in to trigger the recovery flow.
      await signIn(validInput);

      // Assert: Confirm the error was logged but execution continued.
      expect(logError).toHaveBeenCalled();
    });
  });

  /**
   * Test suite for verifying email verification enforcement.
   */
  describe("email verification", () => {
    /**
     * Configures the rate limiter for verification tests.
     */
    beforeEach(async () => {
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);
    });

    /**
     * Verifies that unverified accounts are blocked and a new token is sent.
     */
    it("returns error when email not verified", async () => {
      // Arrange: Create a user where `emailVerified` is null.
      const { sendEmailVerification } = await import("@/lib/mail");
      const { generateVerificationToken } = await import("@/lib/tokens");

      await db.insert(users).values({
        id: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        name: mockUsers.primaryUser.name,
        password: "hashed-password",
        emailVerified: null,
      });

      vi.mocked(generateVerificationToken).mockResolvedValue({
        identifier: mockUsers.primaryUser.email,
        token: "mock-verification-token",
      } as never);

      // Act: Attempt to sign in.
      const result = await signIn(validInput);

      // Assert: Check for the verification requirement message.
      expect(result).toEqual({ error: "Please verify the email before signing in." });
      // Assert: Confirm that a new verification email was dispatched.
      expect(sendEmailVerification).toHaveBeenCalled();
    });
  });

  /**
   * Test suite for verifying two-factor authentication requirements.
   */
  describe("two-factor authentication", () => {
    /**
     * Sets up a verified user with 2FA enabled before each test.
     */
    beforeEach(async () => {
      // Arrange: Enable rate limiting and seed a user with an active 2FA record.
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);

      await db.insert(users).values({
        id: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        name: mockUsers.primaryUser.name,
        password: "hashed-password",
        emailVerified: new Date(),
      });

      await db.insert(userTwoFactor).values({
        id: "2fa-1",
        userId: mockUsers.primaryUser.id,
        secret: "TESTSECRET",
        enabled: true,
        backupCodesGenerated: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    /**
     * Verifies that the user is prompted for 2FA after initial password validation.
     */
    it("returns 2FA required when 2FA enabled", async () => {
      // Arrange: Configure bcrypt to return a successful comparison.
      const bcrypt = await import("bcryptjs");
      vi.mocked(bcrypt.default.compare).mockResolvedValue(true as never);

      // Act: Attempt to sign in.
      const result = await signIn(validInput);

      // Assert: Verify the response requires the second factor step.
      expect(result).toEqual({
        success: "Password verified. Please complete two-factor authentication.",
        requiresTwoFactor: true,
      });
    });

    /**
     * Verifies failure when the initial password check fails despite 2FA being enabled.
     */
    it("returns error when 2FA password invalid", async () => {
      // Arrange: Configure bcrypt to return a failed comparison.
      const bcrypt = await import("bcryptjs");
      vi.mocked(bcrypt.default.compare).mockResolvedValue(false as never);

      // Act: Attempt to sign in with an incorrect password.
      const result = await signIn(validInput);

      // Assert: Check for the generic sign-in failure message.
      expect(result).toEqual({ error: "Invalid email or password." });
    });
  });

  /**
   * Test suite for the standard sign-in path for users without 2FA.
   */
  describe("successful signin (no 2FA)", () => {
    /**
     * Seeds a standard verified user without 2FA before each test.
     */
    beforeEach(async () => {
      // Arrange: Configure the rate limiter and seed a basic user.
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);

      await db.insert(users).values({
        id: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        name: mockUsers.primaryUser.name,
        password: "hashed-password",
        emailVerified: new Date(),
      });
    });

    /**
     * Verifies that the core auth service is called with the correct credentials.
     */
    it("signs in successfully when no 2FA", async () => {
      // Arrange: Access the mocked core authentication service.
      const { signIn: authSignIn } = await import("@/auth");

      // Act: Execute the sign-in action.
      await signIn(validInput);

      // Assert: Verify that the credentials provider was invoked correctly.
      expect(authSignIn).toHaveBeenCalledWith(
        "credentials",
        expect.objectContaining({
          email: validInput.email,
          password: validInput.password,
        })
      );
    });
  });

  /**
   * Test suite for handling specialized NextAuth errors.
   */
  describe("error handling", () => {
    /**
     * Seeds a valid user before each error handling test.
     */
    beforeEach(async () => {
      // Arrange: Configure the rate limiter and seed a user record.
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);

      await db.insert(users).values({
        id: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        name: mockUsers.primaryUser.name,
        password: "hashed-password",
        emailVerified: new Date(),
      });
    });

    /**
     * Verifies error mapping for invalid credential failures.
     */
    it("handles CredentialsSignin auth error", async () => {
      // Arrange: Force the core sign-in to throw a `CredentialsSignin` error.
      const { signIn: authSignIn } = await import("@/auth");
      const { AuthError } = await import("next-auth");

      const authError = new AuthError("CredentialsSignin");
      authError.type = "CredentialsSignin";
      vi.mocked(authSignIn).mockRejectedValue(authError);

      // Act: Attempt to sign in.
      const result = await signIn(validInput);

      // Assert: Check the error response.
      expect(result).toEqual({ error: "Invalid email or password." });
    });

    /**
     * Verifies error mapping when trying to link an existing email to a new provider.
     */
    it("handles OAuthAccountNotLinked auth error", async () => {
      // Arrange: Force the core sign-in to throw an `OAuthAccountNotLinked` error.
      const { signIn: authSignIn } = await import("@/auth");
      const { AuthError } = await import("next-auth");

      const authError = new AuthError("OAuthAccountNotLinked");
      authError.type = "OAuthAccountNotLinked";
      vi.mocked(authSignIn).mockRejectedValue(authError);

      // Act: Attempt to sign in.
      const result = await signIn(validInput);

      // Assert: Check the error response.
      expect(result).toEqual({ error: "This email is already linked with another service." });
    });

    /**
     * Verifies error mapping for general verification failures.
     */
    it("handles Verification auth error", async () => {
      // Arrange: Force the core sign-in to throw a `Verification` error.
      const { signIn: authSignIn } = await import("@/auth");
      const { AuthError } = await import("next-auth");

      const authError = new AuthError("Verification");
      authError.type = "Verification";
      vi.mocked(authSignIn).mockRejectedValue(authError);

      // Act: Attempt to sign in.
      const result = await signIn(validInput);

      // Assert: Check the error response.
      expect(result).toEqual({ error: "Please verify the email before signing in." });
    });

    /**
     * Verifies the fallback error message for unknown authentication errors.
     */
    it("handles default auth error", async () => {
      // Arrange: Force the core sign-in to throw an unhandled `AuthError` type.
      const { signIn: authSignIn } = await import("@/auth");
      const { AuthError } = await import("next-auth");

      const authError = new AuthError("UnknownError");
      authError.type = "UnknownError" as never;
      vi.mocked(authSignIn).mockRejectedValue(authError);

      // Act: Attempt to sign in.
      const result = await signIn(validInput);

      // Assert: Verify the generic error response.
      expect(result).toEqual({ error: "An unexpected error occurred." });
    });

    /**
     * Verifies error mapping for failures in the magic link email process.
     */
    it("handles EmailSignInError auth error", async () => {
      // Arrange: Force the core sign-in to throw an `EmailSignInError`.
      const { signIn: authSignIn } = await import("@/auth");
      const { AuthError } = await import("next-auth");

      const authError = new AuthError("EmailSignInError");
      authError.type = "EmailSignInError";
      vi.mocked(authSignIn).mockRejectedValue(authError);

      // Act: Attempt to sign in.
      const result = await signIn(validInput);

      // Assert: Check for the specific email failure message.
      expect(result).toEqual({ error: "Failed to send the sign-in email." });
    });

    /**
     * Verifies error mapping for OAuth callback failures.
     */
    it("handles OAuthCallbackError auth error", async () => {
      // Arrange: Force the core sign-in to throw an `OAuthCallbackError`.
      const { signIn: authSignIn } = await import("@/auth");
      const { AuthError } = await import("next-auth");

      const authError = new AuthError("OAuthCallbackError");
      authError.type = "OAuthCallbackError";
      vi.mocked(authSignIn).mockRejectedValue(authError);

      // Act: Attempt to sign in.
      const result = await signIn(validInput);

      // Assert: Check the error response.
      expect(result).toEqual({ error: "There was an error with social login provider." });
    });

    /**
     * Verifies error mapping for passkey/WebAuthn failures.
     */
    it("handles WebAuthnVerificationError auth error", async () => {
      // Arrange: Force the core sign-in to throw a `WebAuthnVerificationError`.
      const { signIn: authSignIn } = await import("@/auth");
      const { AuthError } = await import("next-auth");

      const authError = new AuthError("WebAuthnVerificationError");
      authError.type = "WebAuthnVerificationError";
      vi.mocked(authSignIn).mockRejectedValue(authError);

      // Act: Attempt to sign in.
      const result = await signIn(validInput);

      // Assert: Check the error response.
      expect(result).toEqual({ error: "Failed to verify passkey." });
    });

    /**
     * Verifies that errors not related to authentication are thrown normally.
     */
    it("rethrows non-AuthError errors", async () => {
      // Arrange: Force an `Error` that does not extend `AuthError`.
      const { signIn: authSignIn } = await import("@/auth");

      vi.mocked(authSignIn).mockRejectedValue(new Error("Unexpected error"));

      // Act & Assert: Verify that the error is not swallowed by the action's catch block.
      await expect(signIn(validInput)).rejects.toThrow("Unexpected error");
    });
  });
});
