import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { emailChangeTokens, users } from "@/db/schema";
import { requestEmailChange, updateEmail } from "@/features/account/actions/request-email-change";
import { inngest } from "@/lib/inngest";
import { sendEmailChangeNotification, sendEmailChangeVerificationLink } from "@/lib/mail";
import { emailActionLimiter, privateActionLimiter } from "@/lib/rate-limiter";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the rate limiters to control request volume during testing.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
  emailActionLimiter: {
    limit: vi.fn(),
  },
}));

// Mock the mailing module to verify notification and verification emails.
vi.mock("@/lib/mail", () => ({
  sendEmailChangeNotification: vi.fn(),
  sendEmailChangeVerificationLink: vi.fn(),
}));

// Mock the Inngest client to verify event dispatching.
vi.mock("@/lib/inngest", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

/**
 * Integration test suite for `requestEmailChange` server action.
 */
describe("requestEmailChange (integration)", () => {
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

    // Arrange: Configure the private action limiter to allow requests by default.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Arrange: Configure the email action limiter to allow requests by default.
    vi.mocked(emailActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Arrange: Configure auth to return the authenticated test user.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: user.id, email: user.email },
      expires: new Date().toISOString(),
    });

    // Arrange: Set default successful resolutions for mail and event services.
    vi.mocked(sendEmailChangeVerificationLink).mockResolvedValue(undefined);
    vi.mocked(sendEmailChangeNotification).mockResolvedValue(undefined);
    vi.mocked(inngest.send).mockResolvedValue({ ids: ["mock-event-id"] });
  });

  /**
   * Test case to verify that a verification token is created and sent to the new email address.
   */
  it("successfully sends verification email for email change request and creates token", async () => {
    // Arrange: Generate a unique destination email for the request.
    const uniqueEmail = `verify-${Math.random().toString(36).substring(7)}@example.com`;

    // Act: Invoke the request email change action with the correct password.
    const result = await requestEmailChange({
      newEmail: uniqueEmail,
      currentPassword: "Password123!",
    });

    // Assert: Verify the success response message.
    expect(result.success).toBe("Verification link sent to your new email address.");

    // Assert: Confirm that a token was generated in the `emailChangeTokens` table for the `user`.
    const tokenInDb = await db.query.emailChangeTokens.findFirst({
      where: eq(emailChangeTokens.userId, testUser.id),
    });

    expect(tokenInDb).toBeDefined();
    expect(tokenInDb?.newEmail).toBe(uniqueEmail);
    expect(tokenInDb?.userId).toBe(testUser.id);
    expect(tokenInDb?.token).toBeDefined();

    // Assert: Verify that the verification link and the notification were sent.
    expect(sendEmailChangeVerificationLink).toHaveBeenCalledWith(uniqueEmail, tokenInDb!.token);
    expect(sendEmailChangeNotification).toHaveBeenCalledWith(testUser.email, "old");
  });

  /**
   * Test case to verify that the user email is updated immediately when requested.
   */
  it("successfully updates email immediately when immediate option is true", async () => {
    // Arrange: Generate a unique email for immediate update.
    const uniqueEmail = `immediate-${Math.random().toString(36).substring(7)}@example.com`;

    // Act: Invoke the update email action with the correct password.
    const result = await updateEmail({
      email: uniqueEmail,
      currentPassword: "Password123!",
    });

    // Assert: Verify the success response and that an Inngest event was triggered.
    expect(result.success).toBe(
      "Email updated successfully. Please verify your new email address."
    );
    expect(inngest.send).toHaveBeenCalled();

    // Assert: Confirm the `email` field in the `users` table was updated.
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, testUser.id),
    });
    expect(updatedUser?.email).toBe(uniqueEmail);
  });

  /**
   * Test case to verify that a direct email notification is sent if the event system fails.
   */
  it("falls back to direct email when inngest fails", async () => {
    // Arrange: Force Inngest to fail and generate a unique email.
    const uniqueEmail = `fallback-${Math.random().toString(36).substring(7)}@example.com`;
    vi.mocked(inngest.send).mockRejectedValueOnce(new Error("Inngest error"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Attempt to update the email triggering the Inngest failure.
    const result = await updateEmail({
      email: uniqueEmail,
      currentPassword: "Password123!",
    });

    // Assert: Verify the update still succeeds and the fallback email was triggered.
    expect(result.success).toBe(
      "Email updated successfully. Please verify your new email address."
    );
    expect(sendEmailChangeNotification).toHaveBeenCalledWith(uniqueEmail, "new");
  });

  /**
   * Test case to verify that the action fails when the user is not authenticated.
   */
  it("fails if unauthorized", async () => {
    // Arrange: Simulate an unauthenticated session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to request an email change without an active session.
    const result = await requestEmailChange({
      newEmail: "new-email@example.com",
      currentPassword: "Password123!",
    });

    // Assert: Check for the unauthorized error response.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that sessions missing a user ID are rejected.
   */
  it("fails if session has no user ID", async () => {
    // Arrange: Simulate a session object that lacks the `id` property.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { email: testUser.email },
      expires: new Date().toISOString(),
    });

    // Act: Attempt to request an email change with an incomplete session.
    const result = await requestEmailChange({
      newEmail: "new-email@example.com",
      currentPassword: "Password123!",
    });

    // Assert: Check for the unauthorized error response.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that the general private rate limit is enforced.
   */
  it("fails if private rate limit exceeded", async () => {
    // Arrange: Mock the private action limiter to deny the request.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Act: Attempt to request an email change when rate limited.
    const result = await requestEmailChange({
      newEmail: "new-email@example.com",
      currentPassword: "Password123!",
    });

    // Assert: Check for the rate limit error response.
    expect(result).toEqual({
      error: "You are making too many requests. Please try again shortly.",
    });
  });

  /**
   * Test case to verify that the specific email action rate limit is enforced.
   */
  it("fails if email rate limit exceeded", async () => {
    // Arrange: Mock the email action limiter to deny the request.
    vi.mocked(emailActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Act: Attempt to request an email change when specific email limits are hit.
    const result = await requestEmailChange({
      newEmail: "new-email@example.com",
      currentPassword: "Password123!",
    });

    // Assert: Check for the email-specific rate limit error message.
    expect(result).toEqual({
      error: "A verification link for this email was requested recently. Please wait.",
    });
  });

  /**
   * Test case to verify that an incorrect password prevents email change requests.
   */
  it("fails if password is incorrect", async () => {
    // Act: Attempt to request an email change using a mismatching password.
    const result = await requestEmailChange({
      newEmail: "new-email@example.com",
      currentPassword: "WrongPassword!",
    });

    // Assert: Check for the incorrect password error response.
    expect(result).toEqual({ error: "Incorrect password. Please try again." });
  });

  /**
   * Test case to verify that the new email must be different from the current email.
   */
  it("fails if new email is same as current", async () => {
    // Act: Attempt to request an email change using the existing email address.
    const result = await requestEmailChange({
      newEmail: testUser.email,
      currentPassword: "Password123!",
    });

    // Assert: Verify the identical email error response.
    expect(result).toEqual({ error: "New email must be different from the current one." });
  });

  /**
   * Test case to verify that the new email address must be unique across the system.
   */
  it("fails if new email is already in use", async () => {
    // Arrange: Create another user in the database with the target email address.
    const newEmail = `existing-${Math.random().toString(36).substring(7)}@example.com`;
    await db
      .insert(users)
      .values({
        email: newEmail,
        name: "Existing User",
        emailVerified: new Date(),
      })
      .returning();

    // Act: Attempt to request an email change to the taken address.
    const result = await requestEmailChange({
      newEmail,
      currentPassword: "Password123!",
    });

    // Assert: Check for the email in use error response.
    expect(result).toEqual({ error: "This email address is already in use." });
  });

  /**
   * Test case to verify that OAuth users (without local passwords) cannot change their email.
   */
  it("fails for OAuth user without password", async () => {
    // Arrange: Create a user without a password to simulate an OAuth account.
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
      user: { id: oauthUser.id, email: oauthUser.email },
      expires: new Date().toISOString(),
    });

    // Act: Attempt to request an email change for the passwordless user.
    const result = await requestEmailChange({
      newEmail: "new-email@example.com",
      currentPassword: "Password123!",
    });

    // Assert: Verify the specific error message for accounts without passwords.
    expect(result).toEqual({
      error: "Email cannot be changed for accounts without a password.",
    });
  });

  /**
   * Test case to verify that unexpected system errors are caught and masked.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Suppress console error logging and force the mailing service to throw an error.
    vi.spyOn(console, "error").mockImplementation(() => {});
    const uniqueEmail = `error-test-${Math.random().toString(36).substring(7)}@example.com`;
    vi.mocked(sendEmailChangeVerificationLink).mockRejectedValueOnce(
      new Error("Email service error")
    );

    // Act: Attempt to request an email change triggering the service failure.
    const result = await requestEmailChange({
      newEmail: uniqueEmail,
      currentPassword: "Password123!",
    });

    // Assert: Check for the generic fallback error message.
    expect(result).toEqual({
      error: "An unexpected error occurred while processing your request.",
    });
  });

  /**
   * Test case to verify that invalid email formats are rejected by validation.
   */
  it("fails with invalid email in new format", async () => {
    // Act: Attempt to update the email with a malformed string.
    const result = await updateEmail({
      email: "invalid-email-format",
      currentPassword: "Password123!",
    });

    // Assert: Check for the email validation error response.
    expect(result).toEqual({ error: "Invalid email provided." });
  });

  /**
   * Test case to verify that empty fields are rejected by validation.
   */
  it("fails with invalid fields in legacy format", async () => {
    // Act: Attempt to request an email change with empty strings.
    const result = await requestEmailChange({
      newEmail: "",
      currentPassword: "",
    });

    // Assert: Check for the field validation error response.
    expect(result).toEqual({ error: "Invalid fields provided." });
  });

  /**
   * Test case to verify that email updates still succeed even if all notification systems fail.
   */
  it("continues successfully even when both inngest and fallback email fail", async () => {
    // Arrange: Suppress console error output and force both notification methods to fail.
    const uniqueEmail = `double-fail-${Math.random().toString(36).substring(7)}@example.com`;
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(inngest.send).mockRejectedValueOnce(new Error("Inngest error"));
    vi.mocked(sendEmailChangeNotification).mockRejectedValueOnce(new Error("Email service error"));

    // Act: Attempt to update the email.
    const result = await updateEmail({
      email: uniqueEmail,
      currentPassword: "Password123!",
    });

    // Assert: Verify the email update still returns success.
    expect(result.success).toBe(
      "Email updated successfully. Please verify your new email address."
    );
  });
});
