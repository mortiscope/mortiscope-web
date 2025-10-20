"use server";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { forgotPasswordTokens, users } from "@/db/schema";
import { resetPassword } from "@/features/auth/actions/reset-password";

// Mock the mail module to intercept password update notifications.
vi.mock("@/lib/mail", () => ({
  sendPasswordUpdatedEmail: vi.fn().mockResolvedValue(undefined),
}));

// Mock bcryptjs to simulate password hashing without computational overhead.
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed-new-password"),
  },
}));

/**
 * Integration test suite for `resetPassword` server action.
 */
describe("resetPassword (integration)", () => {
  const validToken = "valid-reset-token";
  const validInput = {
    newPassword: "NewSecurePassword123!",
    confirmNewPassword: "NewSecurePassword123!",
  };

  /**
   * Sets up a clean database and mock state before each test case.
   */
  beforeEach(async () => {
    // Arrange: Clear mock history and reset the database.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Create a primary test user in the `users` table.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
      password: "old-hashed-password",
    });
  });

  /**
   * Test suite for verifying the presence of the reset token.
   */
  describe("token validation", () => {
    /**
     * Verifies that the action fails if the token parameter is null.
     */
    it("returns error when token is missing", async () => {
      // Act: Attempt to reset password with a null token.
      const result = await resetPassword(validInput, null);

      // Assert: Check for the missing token error message.
      expect(result).toEqual({ error: "Missing password reset token." });
    });

    /**
     * Verifies that the action fails if the token parameter is undefined.
     */
    it("returns error when token is undefined", async () => {
      // Act: Attempt to reset password with an undefined token.
      const result = await resetPassword(validInput, undefined);

      // Assert: Check for the missing token error message.
      expect(result).toEqual({ error: "Missing password reset token." });
    });
  });

  /**
   * Test suite for validating password complexity and matching.
   */
  describe("input validation", () => {
    /**
     * Verifies that passwords failing complexity requirements are rejected.
     */
    it("returns error for invalid password", async () => {
      // Act: Attempt to use a password that is too short or simple.
      const result = await resetPassword(
        {
          newPassword: "weak",
          confirmNewPassword: "weak",
        },
        validToken
      );

      // Assert: Check for the password requirement error.
      expect(result).toEqual({
        error: "Invalid password. Check the requirements and try again.",
      });
    });

    /**
     * Verifies that mismatched password and confirmation fields are rejected.
     */
    it("returns error for mismatched passwords", async () => {
      // Act: Attempt to reset with two different password strings.
      const result = await resetPassword(
        {
          newPassword: "NewSecurePassword123!",
          confirmNewPassword: "DifferentPassword123!",
        },
        validToken
      );

      // Assert: Check for the validation error message.
      expect(result).toEqual({
        error: "Invalid password. Check the requirements and try again.",
      });
    });
  });

  /**
   * Test suite for verifying token existence and expiration in the database.
   */
  describe("token lookup", () => {
    /**
     * Verifies failure when the provided token string is not in the `forgotPasswordTokens` table.
     */
    it("returns error when token not found", async () => {
      // Act: Attempt to reset with a token that was never generated.
      const result = await resetPassword(validInput, "nonexistent-token");

      // Assert: Check for the invalid token error.
      expect(result).toEqual({ error: "Invalid token provided." });
    });

    /**
     * Verifies failure when the token exists but the expiration timestamp has passed.
     */
    it("returns error when token has expired", async () => {
      // Arrange: Insert an expired token into the `forgotPasswordTokens` table.
      await db.insert(forgotPasswordTokens).values({
        identifier: mockUsers.primaryUser.email,
        token: validToken,
        expires: new Date(Date.now() - 1000),
      });

      // Act: Attempt to use the expired token.
      const result = await resetPassword(validInput, validToken);

      // Assert: Check for the expired link error.
      expect(result).toEqual({ error: "Your reset link has expired." });
    });
  });

  /**
   * Test suite for verifying that the token identifier maps to a real user.
   */
  describe("user lookup", () => {
    /**
     * Verifies failure when a valid token exists for an email not found in the `users` table.
     */
    it("returns error when user not found", async () => {
      // Arrange: Insert a valid token associated with a non-existent email.
      await db.insert(forgotPasswordTokens).values({
        identifier: "nonexistent@example.com",
        token: validToken,
        expires: new Date(Date.now() + 3600000),
      });

      // Act: Attempt to reset password.
      const result = await resetPassword(validInput, validToken);

      // Assert: Check for the user not found error.
      expect(result).toEqual({ error: "No user found for this reset link." });
    });
  });

  /**
   * Test suite for the successful password update flow.
   */
  describe("successful password reset", () => {
    /**
     * Seeds a valid token before each success path test.
     */
    beforeEach(async () => {
      // Arrange: Insert a valid, active token for the primary test user.
      await db.insert(forgotPasswordTokens).values({
        identifier: mockUsers.primaryUser.email,
        token: validToken,
        expires: new Date(Date.now() + 3600000),
      });
    });

    /**
     * Verifies that a valid request returns a success response.
     */
    it("resets password and returns success", async () => {
      // Act: Execute the password reset with valid data.
      const result = await resetPassword(validInput, validToken);

      // Assert: Verify the success message.
      expect(result).toEqual({
        success: "Your password has been successfully updated!",
      });
    });

    /**
     * Verifies that the system triggers a notification email upon successful reset.
     */
    it("sends password updated email on success", async () => {
      // Arrange: Access the mocked email utility.
      const { sendPasswordUpdatedEmail } = await import("@/lib/mail");

      // Act: Reset the password.
      await resetPassword(validInput, validToken);

      // Assert: Confirm the notification email was sent to the correct address.
      expect(sendPasswordUpdatedEmail).toHaveBeenCalledWith(mockUsers.primaryUser.email);
    });
  });

  /**
   * Test suite for handling errors in secondary processes or external dependencies.
   */
  describe("error handling", () => {
    /**
     * Seeds a valid token before each error handling test.
     */
    beforeEach(async () => {
      // Arrange: Insert a valid token to allow the action to reach deeper logic.
      await db.insert(forgotPasswordTokens).values({
        identifier: mockUsers.primaryUser.email,
        token: validToken,
        expires: new Date(Date.now() + 3600000),
      });
    });

    /**
     * Verifies that the user still sees success even if the notification email fails.
     */
    it("handles email sending failure gracefully", async () => {
      // Arrange: Suppress console error output and force an email failure.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { sendPasswordUpdatedEmail } = await import("@/lib/mail");

      vi.mocked(sendPasswordUpdatedEmail).mockRejectedValue(new Error("Email send failed"));

      // Act: Attempt to reset the password.
      const result = await resetPassword(validInput, validToken);

      // Assert: Ensure the password change is still considered successful.
      expect(result).toEqual({
        success: "Your password has been successfully updated!",
      });
      // Assert: Confirm the error was logged for administrative review.
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    /**
     * Verifies that critical failures during processing return a generic error.
     */
    it("handles unexpected errors gracefully", async () => {
      // Arrange: Suppress console error output and force a failure in the hashing library.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const bcrypt = await import("bcryptjs");

      vi.mocked(bcrypt.default.hash).mockRejectedValue(new Error("Hashing failed"));

      // Act: Attempt to reset the password.
      const result = await resetPassword(validInput, validToken);

      // Assert: Check for the generic fallback error message.
      expect(result).toEqual({
        error: "An unexpected error occurred. Please try again later.",
      });
      // Assert: Confirm the specific exception was logged.
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
