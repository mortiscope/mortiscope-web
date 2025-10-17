import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { accountDeletionTokens, users } from "@/db/schema";
import { requestAccountDeletion } from "@/features/account/actions/request-account-deletion";
import { sendAccountDeletionRequest } from "@/lib/mail";
import { privateActionLimiter } from "@/lib/rate-limiter";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the rate limiter to control request limits during testing.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
}));

// Mock the mailing module to verify account deletion request emails.
vi.mock("@/lib/mail", () => ({
  sendAccountDeletionRequest: vi.fn(),
}));

/**
 * Integration test suite for `requestAccountDeletion` server action.
 */
describe("requestAccountDeletion (integration)", () => {
  // Store the created user object for reference in tests.
  let testUser: typeof users.$inferSelect;

  /**
   * Sets up a fresh test user and default mock configurations before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear all mock history and reset the database state.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Hash a password and create a unique user in the database.
    const uniqueId = Math.random().toString(36).substring(7);
    const email = `test-user-${uniqueId}@example.com`;
    const hashedPassword = await bcrypt.hash("Password123!", 10);

    const [user] = await db
      .insert(users)
      .values({
        email,
        name: `Test User ${uniqueId}`,
        password: hashedPassword,
        emailVerified: new Date(),
      })
      .returning();

    testUser = user;

    // Arrange: Configure the rate limiter to allow requests by default.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Arrange: Configure auth to return the authenticated test user email.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { email: user.email },
      expires: new Date().toISOString(),
    });

    // Arrange: Set a default successful resolution for the email service.
    vi.mocked(sendAccountDeletionRequest).mockResolvedValue(undefined);
  });

  /**
   * Test case to verify that a token is created and an email is sent for a valid request.
   */
  it("successfully sends account deletion confirmation email and creates token", async () => {
    // Act: Invoke the account deletion request with the correct password.
    const result = await requestAccountDeletion({ password: "Password123!" });

    // Assert: Verify the success response message.
    expect(result.success).toBe(
      "Confirmation required. Deletion link has been sent to your email."
    );

    // Assert: Confirm that a token was generated in the `accountDeletionTokens` table for the `user`.
    const tokenInDb = await db.query.accountDeletionTokens.findFirst({
      where: eq(accountDeletionTokens.identifier, testUser.email),
    });

    expect(tokenInDb).toBeDefined();
    expect(tokenInDb?.identifier).toBe(testUser.email);
    expect(tokenInDb?.token).toBeDefined();

    // Assert: Verify that the mailing service was called with the correct email and token.
    expect(sendAccountDeletionRequest).toHaveBeenCalledWith(testUser.email, tokenInDb!.token);
  });

  /**
   * Test case to verify that the action fails when no session is present.
   */
  it("fails if unauthorized", async () => {
    // Arrange: Simulate an unauthenticated session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to request deletion without an active session.
    const result = await requestAccountDeletion({ password: "Password123!" });

    // Assert: Check for the unauthorized error response.
    expect(result).toEqual({
      error: "Unauthorized: You must be logged in to delete your account.",
    });
  });

  /**
   * Test case to verify that sessions missing an email identifier are rejected.
   */
  it("fails if session has no email", async () => {
    // Arrange: Simulate a session object that lacks the `email` property.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: {},
      expires: new Date().toISOString(),
    });

    // Act: Attempt to request deletion with an incomplete session.
    const result = await requestAccountDeletion({ password: "Password123!" });

    // Assert: Check for the unauthorized error response.
    expect(result).toEqual({
      error: "Unauthorized: You must be logged in to delete your account.",
    });
  });

  /**
   * Test case to verify that the action fails when the rate limit is exceeded.
   */
  it("fails if rate limit exceeded", async () => {
    // Arrange: Mock the rate limiter to deny the request.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Act: Attempt to request deletion when rate limited.
    const result = await requestAccountDeletion({ password: "Password123!" });

    // Assert: Check for the rate limit error response.
    expect(result).toEqual({
      error: "You have made too many deletion requests. Please wait a while.",
    });
  });

  /**
   * Test case to verify behavior when the session email does not exist in the database.
   */
  it("fails if user not found in database", async () => {
    // Arrange: Mock a session with an email address not present in the `users` table.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { email: "nonexistent@example.com" },
      expires: new Date().toISOString(),
    });

    // Act: Attempt to request deletion for the non-existent user.
    const result = await requestAccountDeletion({ password: "Password123!" });

    // Assert: Verify the user not found error response.
    expect(result).toEqual({ error: "User not found. Cannot proceed with deletion." });
  });

  /**
   * Test case to verify that redundant requests are blocked if deletion is already scheduled.
   */
  it("fails if account is already scheduled for deletion", async () => {
    // Arrange: Update the `testUser` record to have a `deletionScheduledAt` timestamp.
    await db
      .update(users)
      .set({ deletionScheduledAt: new Date() })
      .where(eq(users.id, testUser.id));

    // Act: Attempt to request deletion again.
    const result = await requestAccountDeletion({ password: "Password123!" });

    // Assert: Verify the specific error message for accounts already marked for deletion.
    expect(result).toEqual({ error: "This account is already scheduled for deletion." });
  });

  /**
   * Test case to verify that validation catches missing passwords for credential-based accounts.
   */
  it("fails if password is required but not provided", async () => {
    // Act: Attempt to request deletion without providing a password.
    const result = await requestAccountDeletion({});

    // Assert: Check for the password requirement error response.
    expect(result).toEqual({ error: "Password is required to delete this account." });
  });

  /**
   * Test case to verify that incorrect passwords prevent deletion requests.
   */
  it("fails if password is incorrect", async () => {
    // Act: Attempt to request deletion using a mismatching password.
    const result = await requestAccountDeletion({ password: "WrongPassword!" });

    // Assert: Check for the incorrect password error response.
    expect(result).toEqual({ error: "Incorrect password." });
  });

  /**
   * Test case to verify that OAuth users (without passwords) can request deletion.
   */
  it("succeeds for OAuth user without password", async () => {
    // Arrange: Create a user record with no password to simulate an OAuth-based account.
    const uniqueId = Math.random().toString(36).substring(7);
    const email = `oauth-user-${uniqueId}@example.com`;

    const [oauthUser] = await db
      .insert(users)
      .values({
        email,
        name: `OAuth User ${uniqueId}`,
        password: null,
        emailVerified: new Date(),
      })
      .returning();

    // Arrange: Simulate an authenticated session for the OAuth user.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { email: oauthUser.email },
      expires: new Date().toISOString(),
    });

    // Act: Attempt to request deletion without providing a password.
    const result = await requestAccountDeletion({});

    // Assert: Verify the success response message.
    expect(result.success).toBe(
      "Confirmation required. Deletion link has been sent to your email."
    );

    // Assert: Verify that the token was created and the email service was called.
    const tokenInDb = await db.query.accountDeletionTokens.findFirst({
      where: eq(accountDeletionTokens.identifier, oauthUser.email),
    });
    expect(tokenInDb).toBeDefined();
    expect(sendAccountDeletionRequest).toHaveBeenCalledWith(oauthUser.email, tokenInDb!.token);
  });

  /**
   * Test case to verify that mailing service errors are caught and reported.
   */
  it("handles email sending failure gracefully", async () => {
    // Arrange: Suppress console error output and force the email service to fail.
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(sendAccountDeletionRequest).mockRejectedValueOnce(new Error("Email service error"));

    // Act: Attempt to request deletion triggering the email failure.
    const result = await requestAccountDeletion({ password: "Password123!" });

    // Assert: Verify the generic email failure error message.
    expect(result).toEqual({ error: "Something went wrong. Deletion email could not be sent." });
  });
});
