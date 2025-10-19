"use server";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { users } from "@/db/schema";
import { forgotPassword } from "@/features/auth/actions/forgot-password";

// Mock the mail module to prevent actual emails from being sent during tests.
vi.mock("@/lib/mail", () => ({
  sendForgotPassword: vi.fn().mockResolvedValue(undefined),
}));

// Mock the rate limiter to control request flow and simulate limit exhaustion.
vi.mock("@/lib/rate-limiter", () => ({
  emailActionLimiter: {
    limit: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Mock token generation to provide predictable values for testing.
vi.mock("@/lib/tokens", () => ({
  generateForgotPasswordToken: vi.fn().mockResolvedValue({
    identifier: "mortiscope@example.com",
    token: "mock-token-123",
  }),
}));

/**
 * Integration test suite for `forgotPassword` server action.
 */
describe("forgotPassword (integration)", () => {
  /**
   * Resets the database and mock state before each test case.
   */
  beforeEach(async () => {
    // Arrange: Clear mock call history and reset the database to a clean state.
    vi.clearAllMocks();
    resetMockDb();
  });

  /**
   * Test suite for verifying email input validation logic.
   */
  describe("input validation", () => {
    /**
     * Verifies that the action rejects strings that do not follow email formatting.
     */
    it("returns error for invalid email format", async () => {
      // Act: Invoke the action with a malformed email string.
      const result = await forgotPassword({
        email: "invalid-email",
      });

      // Assert: Verify that the correct validation error is returned.
      expect(result).toEqual({ error: "Invalid email address provided." });
    });

    /**
     * Verifies that the action rejects empty email strings.
     */
    it("returns error for empty email", async () => {
      // Act: Invoke the action with an empty string.
      const result = await forgotPassword({
        email: "",
      });

      // Assert: Verify that the correct validation error is returned.
      expect(result).toEqual({ error: "Invalid email address provided." });
    });
  });

  /**
   * Test suite for verifying rate limiting behavior.
   */
  describe("rate limiting", () => {
    /**
     * Verifies that the action blocks requests when the rate limiter returns failure.
     */
    it("returns error when rate limit exceeded", async () => {
      // Arrange: Configure the rate limiter to simulate an exhausted quota.
      const { emailActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(emailActionLimiter.limit).mockResolvedValue({ success: false } as never);

      // Act: Attempt to trigger the forgot password flow.
      const result = await forgotPassword({ email: mockUsers.primaryUser.email });

      // Assert: Check that the rate limit error message is returned.
      expect(result).toEqual({
        error: "Too many requests. Please wait a minute before retrying.",
      });
    });
  });

  /**
   * Test suite for verifying how the system handles different user existence scenarios.
   */
  describe("user lookup", () => {
    /**
     * Configures a successful rate limit response before each lookup test.
     */
    beforeEach(async () => {
      // Arrange: Ensure the rate limiter allows the request.
      const { emailActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(emailActionLimiter.limit).mockResolvedValue({ success: true } as never);
    });

    /**
     * Verifies that non-existent emails return success to prevent account enumeration.
     */
    it("returns success even when user not found (prevents enumeration)", async () => {
      // Act: Attempt to reset a password for an email not present in the `users` table.
      const result = await forgotPassword({ email: "nonexistent@example.com" });

      // Assert: Verify the user receives a generic success message.
      expect(result).toEqual({
        success: "A password reset link has been sent.",
      });

      // Assert: Confirm that no token was generated for the non-existent user.
      const { generateForgotPasswordToken } = await import("@/lib/tokens");
      expect(generateForgotPasswordToken).not.toHaveBeenCalled();
    });

    /**
     * Verifies that OAuth users without passwords do not receive reset tokens.
     */
    it("returns success when user exists but has no password (OAuth user)", async () => {
      // Arrange: Insert a user into the `users` table with a `null` password.
      await db.insert(users).values({
        id: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        name: mockUsers.primaryUser.name,
        password: null,
      });

      // Act: Attempt to reset the password for the OAuth user.
      const result = await forgotPassword({ email: mockUsers.primaryUser.email });

      // Assert: Verify the generic success message is returned to the client.
      expect(result).toEqual({
        success: "A password reset link has been sent.",
      });

      // Assert: Confirm that no token was generated since there is no password to reset.
      const { generateForgotPasswordToken } = await import("@/lib/tokens");
      expect(generateForgotPasswordToken).not.toHaveBeenCalled();
    });
  });

  /**
   * Test suite for the successful password reset flow.
   */
  describe("successful password reset", () => {
    /**
     * Sets up a valid user with a password before each successful path test.
     */
    beforeEach(async () => {
      // Arrange: Mock the rate limiter and seed the `users` table with a valid record.
      const { emailActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(emailActionLimiter.limit).mockResolvedValue({ success: true } as never);

      await db.insert(users).values({
        id: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        name: mockUsers.primaryUser.name,
        password: "hashed-password",
      });
    });

    /**
     * Verifies the full workflow of token generation and email dispatch.
     */
    it("generates token and sends email for valid user with password", async () => {
      // Arrange: Configure mocks for token generation and email delivery.
      const { generateForgotPasswordToken } = await import("@/lib/tokens");
      const { sendForgotPassword } = await import("@/lib/mail");

      vi.mocked(generateForgotPasswordToken).mockResolvedValue({
        identifier: mockUsers.primaryUser.email,
        token: "mock-token-123",
      } as never);

      // Act: Trigger the forgot password action for the valid user.
      const result = await forgotPassword({ email: mockUsers.primaryUser.email });

      // Assert: Verify the success response.
      expect(result).toEqual({
        success: "A password reset link has been sent.",
      });

      // Assert: Confirm that the token generation was called with the correct `email`.
      expect(generateForgotPasswordToken).toHaveBeenCalledWith(mockUsers.primaryUser.email);

      // Assert: Confirm the email was sent with the generated token.
      expect(sendForgotPassword).toHaveBeenCalledWith(
        mockUsers.primaryUser.email,
        "mock-token-123"
      );
    });
  });

  /**
   * Test suite for handling downstream service failures.
   */
  describe("error handling", () => {
    /**
     * Ensures the rate limiter is bypassed for error handling scenarios.
     */
    beforeEach(async () => {
      // Arrange: Set up the rate limiter to allow the request.
      const { emailActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(emailActionLimiter.limit).mockResolvedValue({ success: true } as never);
    });

    /**
     * Verifies that failure in the token module is caught and logged.
     */
    it("handles token generation errors gracefully", async () => {
      // Arrange: Spy on the console and seed a user.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { generateForgotPasswordToken } = await import("@/lib/tokens");

      await db.insert(users).values({
        id: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        name: mockUsers.primaryUser.name,
        password: "hashed-password",
      });

      // Arrange: Force the token generation module to throw an error.
      vi.mocked(generateForgotPasswordToken).mockRejectedValue(
        new Error("Token generation failed")
      );

      // Act: Attempt the password reset.
      const result = await forgotPassword({ email: mockUsers.primaryUser.email });

      // Assert: Verify the generic error response is returned to the user.
      expect(result).toEqual({
        error: "An unexpected error occurred. Please try again.",
      });

      // Assert: Confirm the error was logged to the console.
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    /**
     * Verifies that failure in the mail service is caught and logged.
     */
    it("handles email sending errors gracefully", async () => {
      // Arrange: Spy on the console and seed a user.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { sendForgotPassword } = await import("@/lib/mail");

      await db.insert(users).values({
        id: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        name: mockUsers.primaryUser.name,
        password: "hashed-password",
      });

      // Arrange: Force the email service to throw an error.
      vi.mocked(sendForgotPassword).mockRejectedValue(new Error("Email send failed"));

      // Act: Attempt the password reset.
      const result = await forgotPassword({ email: mockUsers.primaryUser.email });

      // Assert: Verify the generic error response is returned to the user.
      expect(result).toEqual({
        error: "An unexpected error occurred. Please try again.",
      });

      // Assert: Confirm the error was logged to the console.
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
