"use server";

import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { emailChangeTokens, users } from "@/db/schema";
import { verifyEmailChange } from "@/features/account/actions/verify-email-change";
import { sendEmailChangeNotification } from "@/lib/mail";

// Mock the mail utility to verify notification delivery without sending actual emails.
vi.mock("@/lib/mail", () => ({
  sendEmailChangeNotification: vi.fn(),
}));

/**
 * Integration test suite for `verifyEmailChange` server action.
 */
describe("verifyEmailChange (integration)", () => {
  const mockTokenString = "valid-token-123";
  const mockUserId = "test-user-id";
  const mockNewEmail = "new@example.com";
  const mockOldEmail = "old@example.com";

  /**
   * Sets up the test environment, database, and system time before each test.
   */
  beforeEach(async () => {
    // Arrange: Reset mock history and clear the database.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Freeze system time to ensure consistent token expiration checks.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 1));

    // Arrange: Seed a default user record in the `users` table.
    await db.insert(users).values({
      id: mockUserId,
      email: mockOldEmail,
      name: "MortiScope Account",
    });
  });

  /**
   * Restores real timers after each test to prevent side effects in other suites.
   */
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Utility function to insert a verification token into the database.
   * @param {Date} expires - The expiration timestamp for the token.
   * @param {string} token - The unique token string.
   * @param {string} userId - The identifier of the associated user.
   * @param {string} newEmail - The pending email address to be verified.
   */
  async function createToken(
    expires: Date = new Date(2025, 0, 2),
    token: string = mockTokenString,
    userId: string = mockUserId,
    newEmail: string = mockNewEmail
  ) {
    // Arrange: Insert the token record into the `emailChangeTokens` table.
    await db.insert(emailChangeTokens).values({
      id: "token-" + Math.random().toString(36).substring(7),
      token,
      expires,
      userId,
      newEmail,
    });
  }

  /**
   * Test suite for validating the integrity and lifecycle of verification tokens.
   */
  describe("token validation", () => {
    /**
     * Test case to verify failure when an empty token string is provided.
     */
    it("returns error when token is missing", async () => {
      // Act: Invoke verification with an empty string.
      const result = await verifyEmailChange("");

      // Assert: Verify the missing token error response.
      expect(result.status).toBe("error");
      expect(result.message).toBe("Missing verification token.");
    });

    /**
     * Test case to verify failure when a token does not exist in the database.
     */
    it("returns error when token is not found", async () => {
      // Act: Attempt to verify a non-existent token string.
      const result = await verifyEmailChange("non-existent-token");

      // Assert: Verify the invalid verification link error response.
      expect(result.status).toBe("error");
      expect(result.message).toBe("Invalid verification link.");
    });

    /**
     * Test case to verify that expired tokens return an error and are purged from the database.
     */
    it("returns error and deletes token when expired", async () => {
      // Arrange: Seed a token with a past expiration date.
      await createToken(new Date(2024, 11, 31));

      // Act: Attempt to verify the expired token.
      const result = await verifyEmailChange(mockTokenString);

      // Assert: Verify the expiration error message.
      expect(result.status).toBe("error");
      expect(result.message).toBe("Verification link has expired.");

      // Assert: Confirm the expired token record was deleted from the database.
      const tokenInDb = await db.query.emailChangeTokens.findFirst({
        where: eq(emailChangeTokens.token, mockTokenString),
      });
      expect(tokenInDb).toBeUndefined();
    });
  });

  /**
   * Test suite for user-related constraints during email verification.
   */
  describe("user validation", () => {
    /**
     * Test case to verify that tokens belonging to deleted users are invalidated.
     */
    it("returns error and deletes token when user not found", async () => {
      // Arrange: Create a token mapped to an ID that does not exist in the `users` table.
      await createToken(undefined, mockTokenString, "non-existent-user");

      // Act: Attempt verification for the orphaned token.
      const result = await verifyEmailChange(mockTokenString);

      // Assert: Verify the user not found error response.
      expect(result.status).toBe("error");
      expect(result.message).toBe("User not found.");

      // Assert: Confirm the orphaned token record was removed.
      const tokenInDb = await db.query.emailChangeTokens.findFirst({
        where: eq(emailChangeTokens.token, mockTokenString),
      });
      expect(tokenInDb).toBeUndefined();
    });

    /**
     * Test case to verify that email updates fail if the new email is claimed by another account.
     */
    it("returns error when email is already taken by another user", async () => {
      // Arrange: Seed a valid token for the test user and a second user with the same target email.
      await createToken();

      await db.insert(users).values({
        id: "other-user-id",
        email: mockNewEmail,
        name: "Other User",
      });

      // Act: Attempt to verify the email change.
      const result = await verifyEmailChange(mockTokenString);

      // Assert: Verify the conflict error message.
      expect(result.status).toBe("error");
      expect(result.message).toBe("Email address has been taken. Please restart the process.");

      // Assert: Confirm the user's original email was not changed in the database.
      const user = await db.query.users.findFirst({
        where: eq(users.id, mockUserId),
      });
      expect(user?.email).toBe(mockOldEmail);
    });
  });

  /**
   * Test suite for the successful completion of the email change flow.
   */
  describe("successful email change", () => {
    /**
     * Test case to verify database updates and side effects upon successful verification.
     */
    it("updates email, invalidates sessions, and sends notification", async () => {
      // Arrange: Seed a valid verification token.
      await createToken();

      // Act: Invoke the verification logic.
      const result = await verifyEmailChange(mockTokenString);

      // Assert: Verify the success response.
      expect(result.status).toBe("success");
      expect(result.message).toBe("Your email address has been successfully updated!");

      // Assert: Confirm the `email` column was updated and `emailVerified` was set in the `users` table.
      const user = await db.query.users.findFirst({
        where: eq(users.id, mockUserId),
      });
      expect(user?.email).toBe(mockNewEmail);
      expect(user?.emailVerified).toBeDefined();

      // Assert: Confirm the used token was deleted.
      const tokenInDb = await db.query.emailChangeTokens.findFirst({
        where: eq(emailChangeTokens.token, mockTokenString),
      });
      expect(tokenInDb).toBeUndefined();

      // Assert: Verify that the notification email was triggered.
      expect(sendEmailChangeNotification).toHaveBeenCalledWith(mockNewEmail, "new");
    });

    /**
     * Test case to verify that users can verify an email they have already manually updated.
     */
    it("allows same user to change to their own pending email", async () => {
      // Arrange: Seed a token and manually update the user record to the new email.
      await createToken();

      await db.update(users).set({ email: mockNewEmail }).where(eq(users.id, mockUserId));

      // Act: Invoke verification.
      const result = await verifyEmailChange(mockTokenString);

      // Assert: Verify that the operation still reports success.
      expect(result.status).toBe("success");
    });
  });

  /**
   * Test suite for handling infrastructure or external service failures.
   */
  describe("error handling", () => {
    /**
     * Test case to verify that mailing service failures trigger a generic error response.
     */
    it("handles database errors gracefully", async () => {
      // Arrange: Suppress console error logs and seed a token.
      vi.spyOn(console, "error").mockImplementation(() => {});
      await createToken();

      // Arrange: Force the mailing service to throw an exception.
      vi.mocked(sendEmailChangeNotification).mockRejectedValueOnce(new Error("Notification Error"));

      // Act: Attempt to verify the email change.
      const result = await verifyEmailChange(mockTokenString);

      // Assert: Verify the unexpected error message returned to the user.
      expect(result.status).toBe("error");
      expect(result.message).toBe("An unexpected error occurred while updating your email.");
    });
  });
});
