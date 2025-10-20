"use server";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { verification } from "@/features/auth/actions/verification";

// Mock the email change verification action to isolate it from the main verification flow.
vi.mock("@/features/account/actions/verify-email-change", () => ({
  verifyEmailChange: vi.fn().mockResolvedValue({
    status: "success",
    message: "Email changed successfully.",
  }),
}));

// Mock the mail module to prevent actual email transmission during testing.
vi.mock("@/lib/mail", () => ({
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
}));

/**
 * Integration test suite for `verification` server action.
 */
describe("verification (integration)", () => {
  const validToken = "valid-verification-token";

  /**
   * Resets the database and mock state before each test case.
   */
  beforeEach(async () => {
    // Arrange: Clear mock history and reset the database to a clean state.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Seed the `users` table with an unverified user record.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
      emailVerified: null,
    });
  });

  /**
   * Test suite for verifying the presence and validity of the token parameter.
   */
  describe("token validation", () => {
    /**
     * Verifies that the action returns an error status when the token is null.
     */
    it("returns error when token is null", async () => {
      // Act: Invoke the verification action with a null token value.
      const result = await verification(null, null);

      // Assert: Check for the incomplete link error message.
      expect(result).toEqual({
        status: "error",
        message: "Verification link incomplete. Use the link from your email.",
      });
    });

    /**
     * Verifies that the action returns an error status when the token is undefined.
     */
    it("returns error when token is undefined", async () => {
      // Act: Invoke the verification action with an undefined token value.
      const result = await verification(undefined, null);

      // Assert: Check for the incomplete link error message.
      expect(result).toEqual({
        status: "error",
        message: "Verification link incomplete. Use the link from your email.",
      });
    });
  });

  /**
   * Test suite for verifying logic routing based on the verification type.
   */
  describe("type routing", () => {
    /**
     * Verifies that the action delegates to `verifyEmailChange` when the type is `email-change`.
     */
    it("routes to email-change verification", async () => {
      // Arrange: Mock the email change action response.
      const { verifyEmailChange } = await import("@/features/account/actions/verify-email-change");
      vi.mocked(verifyEmailChange).mockResolvedValue({
        status: "success",
        message: "Email changed successfully.",
      });

      // Act: Call the verification action with the `email-change` type.
      const result = await verification(validToken, "email-change");

      // Assert: Confirm the result matches the sub-action output.
      expect(result).toEqual({
        status: "success",
        message: "Email changed successfully.",
      });
      // Assert: Verify that the `verifyEmailChange` function was called with the correct `token`.
      expect(verifyEmailChange).toHaveBeenCalledWith(validToken);
    });

    /**
     * Verifies that the action defaults to the user registration flow when no type is provided.
     */
    it("routes to new user verification by default", async () => {
      // Act: Call the verification action with a null type.
      const result = await verification(validToken, null);

      // Assert: Check for the invalid link error as no token exists in the database yet.
      expect(result).toEqual({
        status: "error",
        message: "Invalid or used verification link. Please request a new one if needed.",
      });
    });
  });

  /**
   * Test suite for the standard new user email verification process.
   */
  describe("new user verification", () => {
    /**
     * Verifies failure when the token string is not found in the `verificationTokens` table.
     */
    it("returns error when token not found", async () => {
      // Act: Attempt verification with a token that was never generated.
      const result = await verification(validToken, null);

      // Assert: Check for the invalid or used link error.
      expect(result).toEqual({
        status: "error",
        message: "Invalid or used verification link. Please request a new one if needed.",
      });
    });

    /**
     * Verifies failure when the token exists but the expiration date has passed.
     */
    it("returns error when token has expired", async () => {
      // Arrange: Insert an expired token into the `verificationTokens` table.
      await db.insert(verificationTokens).values({
        identifier: mockUsers.primaryUser.email,
        token: validToken,
        expires: new Date(Date.now() - 1000),
      });

      // Act: Attempt to verify with the expired token.
      const result = await verification(validToken, null);

      // Assert: Check for the expiration error message.
      expect(result).toEqual({
        status: "error",
        message: "This verification link has expired.",
      });
    });

    /**
     * Verifies failure when the token is valid but the associated user record is missing.
     */
    it("returns error when user not found", async () => {
      // Arrange: Insert a valid token associated with a non-existent email address.
      await db.insert(verificationTokens).values({
        identifier: "nonexistent@example.com",
        token: validToken,
        expires: new Date(Date.now() + 3600000),
      });

      // Act: Attempt verification.
      const result = await verification(validToken, null);

      // Assert: Check for the user not found error message.
      expect(result).toEqual({
        status: "error",
        message: "User for this verification link not found.",
      });
    });

    /**
     * Verifies that users who are already verified receive a success status.
     */
    it("returns success when user already verified", async () => {
      // Arrange: Reset the database and insert a user who has already verified their email.
      resetMockDb();
      await db.insert(users).values({
        id: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        name: mockUsers.primaryUser.name,
        emailVerified: new Date(),
      });

      // Arrange: Insert a valid token for the verified user.
      await db.insert(verificationTokens).values({
        identifier: mockUsers.primaryUser.email,
        token: validToken,
        expires: new Date(Date.now() + 3600000),
      });

      // Act: Attempt verification.
      const result = await verification(validToken, null);

      // Assert: Check for the already verified success message.
      expect(result).toEqual({
        status: "success",
        message: "Your email is already verified.",
      });
    });

    /**
     * Verifies the successful verification path including the dispatch of a welcome email.
     */
    it("successfully verifies new user", async () => {
      // Arrange: Access the mocked welcome email utility and insert a valid token.
      const { sendWelcomeEmail } = await import("@/lib/mail");

      await db.insert(verificationTokens).values({
        identifier: mockUsers.primaryUser.email,
        token: validToken,
        expires: new Date(Date.now() + 3600000),
      });

      vi.mocked(sendWelcomeEmail).mockResolvedValue(undefined);

      // Act: Perform the verification.
      const result = await verification(validToken, null);

      // Assert: Verify the success response.
      expect(result).toEqual({
        status: "success",
        message: "Email successfully verified.",
      });
      // Assert: Confirm the welcome email was sent with the correct `email` and `name`.
      expect(sendWelcomeEmail).toHaveBeenCalledWith(
        mockUsers.primaryUser.email,
        mockUsers.primaryUser.name
      );
    });

    /**
     * Verifies that failure in the secondary email process does not revert the verification status.
     */
    it("handles welcome email failure gracefully", async () => {
      // Arrange: Suppress console error output and force a failure in the mail service.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { sendWelcomeEmail } = await import("@/lib/mail");

      await db.insert(verificationTokens).values({
        identifier: mockUsers.primaryUser.email,
        token: validToken,
        expires: new Date(Date.now() + 3600000),
      });

      vi.mocked(sendWelcomeEmail).mockRejectedValue(new Error("Email failed"));

      // Act: Attempt verification.
      const result = await verification(validToken, null);

      // Assert: Ensure the verification is still considered successful.
      expect(result).toEqual({
        status: "success",
        message: "Email successfully verified.",
      });
      // Assert: Confirm the error was logged to the console.
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  /**
   * Test suite for handling database errors and unexpected exceptions.
   */
  describe("error handling", () => {
    /**
     * Verifies error handling when the token cleanup fails for an expired link.
     */
    it("handles error when deleting expired token fails", async () => {
      // Arrange: Seed an expired token and spy on the console.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await db.insert(verificationTokens).values({
        identifier: mockUsers.primaryUser.email,
        token: validToken,
        expires: new Date(Date.now() - 1000),
      });

      // Arrange: Force the database delete operation to fail.
      vi.spyOn(db, "delete").mockReturnValue({
        where: vi.fn().mockReturnValue({
          catch: (handler: (e: Error) => void) => {
            handler(new Error("Delete failed"));
            return Promise.resolve({ rowCount: 0 });
          },
        }),
      } as never);

      // Act: Attempt verification.
      const result = await verification(validToken, null);

      // Assert: Check that the expiration message is still returned.
      expect(result).toEqual({
        status: "error",
        message: "This verification link has expired.",
      });
      // Assert: Verify the deletion error was logged.
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    /**
     * Verifies error handling when cleanup fails for a redundant verification attempt.
     */
    it("handles error when deleting token for already verified user fails", async () => {
      // Arrange: Seed a verified user and a corresponding token.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      resetMockDb();
      await db.insert(users).values({
        id: mockUsers.primaryUser.id,
        email: mockUsers.primaryUser.email,
        name: mockUsers.primaryUser.name,
        emailVerified: new Date(),
      });

      await db.insert(verificationTokens).values({
        identifier: mockUsers.primaryUser.email,
        token: validToken,
        expires: new Date(Date.now() + 3600000),
      });

      // Arrange: Force the database delete operation to fail.
      vi.spyOn(db, "delete").mockReturnValue({
        where: vi.fn().mockReturnValue({
          catch: (handler: (e: Error) => void) => {
            handler(new Error("Delete failed"));
            return Promise.resolve({ rowCount: 0 });
          },
        }),
      } as never);

      // Act: Attempt verification.
      const result = await verification(validToken, null);

      // Assert: Ensure the success message is still returned to the user.
      expect(result).toEqual({
        status: "success",
        message: "Your email is already verified.",
      });
      // Assert: Verify the error was logged.
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    /**
     * Verifies that database update failures return a generic error message.
     */
    it("handles database update errors gracefully", async () => {
      // Arrange: Seed a valid token and spy on the console.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await db.insert(verificationTokens).values({
        identifier: mockUsers.primaryUser.email,
        token: validToken,
        expires: new Date(Date.now() + 3600000),
      });

      // Arrange: Force the database update operation to fail.
      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      } as never);

      // Act: Attempt to verify.
      const result = await verification(validToken, null);

      // Assert: Verify the generic failure response.
      expect(result).toEqual({
        status: "error",
        message: "Verification failed due to an unexpected error.",
      });
      // Assert: Confirm the specific error was logged.
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
