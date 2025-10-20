"use server";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { users } from "@/db/schema";
import { signUp } from "@/features/auth/actions/signup";

// Mock the next/headers module to simulate request-specific metadata like IP addresses.
vi.mock("next/headers", () => ({
  headers: vi.fn().mockReturnValue({
    get: vi.fn().mockReturnValue("127.0.0.1"),
  }),
}));

// Mock the mail service to intercept verification emails and prevent actual delivery.
vi.mock("@/lib/mail", () => ({
  sendEmailVerification: vi.fn().mockResolvedValue(undefined),
}));

// Mock the rate limiter to verify that registration attempts are controlled.
vi.mock("@/lib/rate-limiter", () => ({
  publicActionLimiter: {
    limit: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock the token module to provide predictable verification token values.
vi.mock("@/lib/tokens", () => ({
  generateVerificationToken: vi.fn().mockResolvedValue({
    identifier: mockUsers.primaryUser.email,
    token: "mock-verification-token",
  }),
}));

// Mock bcryptjs to simulate secure password hashing for new user records.
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-password"),
  },
}));

/**
 * Integration test suite for the user registration server action.
 */
describe("signUp (integration)", () => {
  const validInput = {
    firstName: "MortiScope",
    lastName: "Account",
    email: "mortiscope@example.com",
    password: "SecurePassword123!",
    confirmPassword: "SecurePassword123!",
  };

  /**
   * Clears mock history and resets the database before each test.
   */
  beforeEach(async () => {
    // Arrange: Reset all mocks and the database state to ensure test isolation.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Ensure the headers mock returns a default local IP address.
    const { headers } = await import("next/headers");
    vi.mocked(headers).mockReturnValue({
      get: vi.fn().mockReturnValue("127.0.0.1"),
    } as never);
  });

  /**
   * Test suite for verifying rate limiting during registration.
   */
  describe("rate limiting", () => {
    /**
     * Verifies that the action rejects requests when the registration limit is reached.
     */
    it("returns error when rate limit exceeded", async () => {
      // Arrange: Configure the rate limiter to return a failed success status.
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: false } as never);

      // Act: Attempt to register a new user.
      const result = await signUp(validInput);

      // Assert: Verify the rate limit error message is returned.
      expect(result).toEqual({
        error: "Too many requests. Please try again in a moment.",
      });
    });

    /**
     * Verifies that the rate limiter falls back to a local IP if headers are missing.
     */
    it("uses fallback IP when x-forwarded-for is null", async () => {
      // Arrange: Simulate a request environment where no IP header is provided.
      const { headers } = await import("next/headers");
      const { publicActionLimiter } = await import("@/lib/rate-limiter");

      vi.mocked(headers).mockReturnValue({
        get: vi.fn().mockReturnValue(null),
      } as never);
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);

      // Act: Trigger the registration action.
      await signUp(validInput);

      // Assert: Confirm the rate limiter was invoked with the fallback address `127.0.0.1`.
      expect(publicActionLimiter.limit).toHaveBeenCalledWith("127.0.0.1");
    });
  });

  /**
   * Test suite for verifying registration data validation.
   */
  describe("input validation", () => {
    /**
     * Resets the rate limiter state before each validation test.
     */
    beforeEach(async () => {
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);
    });

    /**
     * Verifies that malformed email addresses are caught by the schema.
     */
    it("returns error for invalid email", async () => {
      // Act: Submit registration with an improperly formatted email.
      const result = await signUp({
        ...validInput,
        email: "invalid-email",
      });

      // Assert: Verify that an error property is present in the response.
      expect(result.error).toBeDefined();
    });

    /**
     * Verifies that passwords not meeting complexity rules are rejected.
     */
    it("returns error for weak password", async () => {
      // Act: Submit registration with a simple password string.
      const result = await signUp({
        ...validInput,
        password: "weak",
      });

      // Assert: Verify that the validation error is captured.
      expect(result.error).toBeDefined();
    });

    /**
     * Verifies that required fields like the first name are enforced.
     */
    it("returns error for empty first name", async () => {
      // Act: Submit registration with a missing first name.
      const result = await signUp({
        ...validInput,
        firstName: "",
      });

      // Assert: Verify that the validation failure is returned.
      expect(result.error).toBeDefined();
    });

    /**
     * Verifies the fallback error message when schema validation fails without specific issues.
     */
    it("uses fallback error message when validation error has no message", async () => {
      // Arrange: Mock the `SignUpSchema` to return a failure without specific error issues.
      const SignUpSchemaModule = await import("@/features/auth/schemas/auth");

      const originalSafeParse = SignUpSchemaModule.SignUpSchema.safeParse;
      vi.spyOn(SignUpSchemaModule.SignUpSchema, "safeParse").mockReturnValue({
        success: false,
        error: { issues: [] },
      } as never);

      // Act: Attempt to sign up.
      const result = await signUp(validInput);

      // Assert: Verify the generic error message is returned.
      expect(result).toEqual({ error: "Invalid details." });

      // Clean up: Restore the original schema parse function.
      SignUpSchemaModule.SignUpSchema.safeParse = originalSafeParse;
    });
  });

  /**
   * Test suite for handling collisions with existing user records.
   */
  describe("existing user", () => {
    /**
     * Configures the rate limiter for existence check tests.
     */
    beforeEach(async () => {
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);
    });

    /**
     * Verifies failure when the email is already verified and registered.
     */
    it("returns error when user already verified", async () => {
      // Arrange: Seed the `users` table with a verified user using the same email.
      await db.insert(users).values({
        id: mockUsers.primaryUser.id,
        email: validInput.email,
        name: mockUsers.primaryUser.name,
        emailVerified: new Date(),
      });

      // Act: Attempt to register with the duplicate email.
      const result = await signUp(validInput);

      // Assert: Check for the existing registration error.
      expect(result).toEqual({ error: "This email is already registered." });
    });

    /**
     * Verifies that unverified accounts trigger a new verification email instead of a duplicate error.
     */
    it("resends verification email when user not verified", async () => {
      // Arrange: Seed the `users` table with an unverified user record.
      const { sendEmailVerification } = await import("@/lib/mail");
      const { generateVerificationToken } = await import("@/lib/tokens");

      await db.insert(users).values({
        id: mockUsers.primaryUser.id,
        email: validInput.email,
        name: mockUsers.primaryUser.name,
        emailVerified: null,
      });

      vi.mocked(generateVerificationToken).mockResolvedValue({
        identifier: validInput.email,
        token: "mock-verification-token",
      } as never);

      // Act: Attempt registration with the same email.
      const result = await signUp(validInput);

      // Assert: Verify the response indicating the account exists but requires verification.
      expect(result).toEqual({
        success: "An account already exists with this email but not verified.",
      });
      // Assert: Confirm that the verification email was resent.
      expect(sendEmailVerification).toHaveBeenCalled();
    });
  });

  /**
   * Test suite for the primary success path of user registration.
   */
  describe("successful signup", () => {
    /**
     * Sets up the environment for successful registration tests.
     */
    beforeEach(async () => {
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);
    });

    /**
     * Verifies the full workflow of user creation and verification dispatch.
     */
    it("creates user and sends verification email", async () => {
      // Arrange: Mock token generation and email service.
      const { sendEmailVerification } = await import("@/lib/mail");
      const { generateVerificationToken } = await import("@/lib/tokens");

      vi.mocked(generateVerificationToken).mockResolvedValue({
        identifier: validInput.email,
        token: "mock-verification-token",
      } as never);

      // Act: Perform a valid registration.
      const result = await signUp(validInput);

      // Assert: Verify the success response.
      expect(result).toEqual({ success: "Email verification sent." });
      // Assert: Confirm the verification email was triggered.
      expect(sendEmailVerification).toHaveBeenCalled();
    });
  });

  /**
   * Test suite for verifying error handling in registration workflows.
   */
  describe("error handling", () => {
    /**
     * Resets the rate limiter for error scenario tests.
     */
    beforeEach(async () => {
      const { publicActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(publicActionLimiter.limit).mockResolvedValue({ success: true } as never);
    });

    /**
     * Verifies that the action catches exceptions during token generation and returns a generic error.
     */
    it("handles token generation errors gracefully", async () => {
      // Arrange: Suppress console error output and force an exception in the token module.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { generateVerificationToken } = await import("@/lib/tokens");

      vi.mocked(generateVerificationToken).mockRejectedValue(new Error("Token error"));

      // Act: Attempt registration.
      const result = await signUp(validInput);

      // Assert: Check for the generic fallback error message.
      expect(result).toEqual({ error: "An unexpected error occurred." });
      // Assert: Confirm the error was logged for debugging.
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
