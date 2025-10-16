import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { changePassword } from "@/features/account/actions/change-password";
import { inngest } from "@/lib/inngest";
import { privateActionLimiter } from "@/lib/rate-limiter";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the Inngest client to verify event dispatching without external side effects.
vi.mock("@/lib/inngest", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

// Mock the mailing module to verify fallback email notifications.
vi.mock("@/lib/mail", () => ({
  sendPasswordUpdatedEmail: vi.fn(),
}));

// Mock the rate limiter to control request limits during testing.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
}));

/**
 * Integration test suite for the `changePassword` server action.
 */
describe("changePassword (integration)", () => {
  // Define constant password values for consistent testing.
  const mockOldPassword = "OldPassword123!";
  const mockNewPassword = "NewPassword123!";
  // Store the created user object for reference in tests.
  let testUser: typeof users.$inferSelect;

  /**
   * Sets up a fresh test user and default mock configurations before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear all mock history and implementations.
    vi.clearAllMocks();

    // Arrange: Hash the old password and create a unique user in the database.
    const hashedPassword = await bcrypt.hash(mockOldPassword, 10);
    const uniqueId = Math.random().toString(36).substring(7);
    const email = `test-user-${uniqueId}@example.com`;

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

    // Arrange: Configure auth to return the authenticated test user.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: user.id },
      expires: new Date().toISOString(),
    });
  });

  /**
   * Test case to verify that the password is correctly updated and an event is sent.
   */
  it("successfully updates password when verified", async () => {
    // Act: Attempt to update the password with valid credentials.
    const result = await changePassword({
      currentPassword: mockOldPassword,
      newPassword: mockNewPassword,
      repeatPassword: mockNewPassword,
    });

    // Assert: Verify the success message is returned.
    expect(result).toEqual({ success: "Password updated successfully." });

    // Assert: Retrieve the user and verify the password hash has changed to match the new password.
    const [updatedUser] = await db.select().from(users).where(eq(users.id, testUser.id));

    expect(updatedUser).toBeDefined();
    const isNewPasswordMatch = await bcrypt.compare(mockNewPassword, updatedUser.password!);
    expect(isNewPasswordMatch).toBe(true);
    const isOldPasswordMatch = await bcrypt.compare(mockOldPassword, updatedUser.password!);
    expect(isOldPasswordMatch).toBe(false);

    // Assert: Confirm that the `account/password.updated` event was sent to Inngest.
    expect(inngest.send).toHaveBeenCalledWith({
      name: "account/password.updated",
      data: {
        userId: testUser.id,
        userEmail: testUser.email,
        userName: testUser.name,
      },
    });
  });

  /**
   * Test case to verify that validation fails when passwords do not match.
   */
  it("fails if validation fails (password mismatch)", async () => {
    // Act: Attempt to update password with a mismatching confirmation.
    const result = await changePassword({
      currentPassword: mockOldPassword,
      newPassword: mockNewPassword,
      repeatPassword: "MismatchPassword123!",
    });

    // Assert: Check for the validation error response.
    expect(result).toEqual({ error: "Invalid fields provided." });
  });

  /**
   * Test case to verify compatibility with legacy input field names.
   */
  it("supports legacy format (no repeatPassword)", async () => {
    // Act: Attempt to update password using the `confirmNewPassword` key.
    const result = await changePassword({
      currentPassword: mockOldPassword,
      newPassword: mockNewPassword,
      confirmNewPassword: mockNewPassword,
    } as unknown as Parameters<typeof changePassword>[0]);

    // Assert: Verify the success message is returned for legacy input.
    expect(result).toEqual({ success: "Password updated successfully." });
  });

  /**
   * Test case to verify that schema validation catches short passwords in legacy format.
   */
  it("fails if validation fails (legacy format)", async () => {
    // Act: Attempt to update password with values that are too short.
    const result = await changePassword({
      currentPassword: "short",
      newPassword: "short",
    } as unknown as Parameters<typeof changePassword>[0]);

    // Assert: Check for the validation error response.
    expect(result).toEqual({ error: "Invalid fields provided." });
  });

  /**
   * Test case to verify that OAuth users cannot change their password.
   */
  it("fails for OAuth users (no password)", async () => {
    // Arrange: Create a user record without a password to simulate an OAuth account.
    const uniqueId = Math.random().toString(36).substring(7);
    const [oauthUser] = await db
      .insert(users)
      .values({
        email: `oauth-${uniqueId}@example.com`,
        name: `OAuth User ${uniqueId}`,
        emailVerified: new Date(),
      })
      .returning();

    // Arrange: Simulate an authenticated session for the OAuth user.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: oauthUser.id },
      expires: new Date().toISOString(),
    });

    // Act: Attempt to change password for the passwordless user.
    const result = await changePassword({
      currentPassword: mockOldPassword,
      newPassword: mockNewPassword,
      repeatPassword: mockNewPassword,
    });

    // Assert: Verify the specific error for provider-based accounts.
    expect(result).toEqual({
      error: "Password cannot be changed for accounts signed in with a provider.",
    });
  });

  /**
   * Test case to verify that a direct email is sent if the background job system fails.
   */
  it("handles Inngest failure gracefully by falling back to email", async () => {
    // Arrange: Suppress console error output and force Inngest to fail.
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(inngest.send).mockRejectedValueOnce(new Error("Inngest error"));

    const { sendPasswordUpdatedEmail } = await import("@/lib/mail");

    // Act: Attempt to update the password triggering the Inngest failure.
    const result = await changePassword({
      currentPassword: mockOldPassword,
      newPassword: mockNewPassword,
      repeatPassword: mockNewPassword,
    });

    // Assert: Verify success is still returned and the fallback email was triggered.
    expect(result).toEqual({ success: "Password updated successfully." });
    expect(sendPasswordUpdatedEmail).toHaveBeenCalledWith(testUser.email);
  });

  /**
   * Test case to verify that password updates still succeed even if all notification systems fail.
   */
  it("handles both Inngest and email fallback failure gracefully", async () => {
    // Arrange: Suppress console error output and force both notification methods to fail.
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(inngest.send).mockRejectedValueOnce(new Error("Inngest error"));

    const { sendPasswordUpdatedEmail } = await import("@/lib/mail");
    vi.mocked(sendPasswordUpdatedEmail).mockRejectedValueOnce(new Error("Email error"));

    // Act: Attempt to update the password.
    const result = await changePassword({
      currentPassword: mockOldPassword,
      newPassword: mockNewPassword,
      repeatPassword: mockNewPassword,
    });

    // Assert: Verify the password update still returns success.
    expect(result).toEqual({ success: "Password updated successfully." });
  });

  /**
   * Test case to verify that general unexpected errors are caught.
   */
  it("handles unexpected errors", async () => {
    // Arrange: Suppress console error output and force a generic error in the rate limiter.
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(privateActionLimiter.limit).mockRejectedValueOnce(
      new Error("Unexpected Rate Limiter Error")
    );

    // Act: Attempt to update password triggering the mocked error.
    const result = await changePassword({
      currentPassword: mockOldPassword,
      newPassword: mockNewPassword,
      repeatPassword: mockNewPassword,
    });

    // Assert: Check for the generic fallback error message.
    expect(result).toEqual({ error: "An unexpected error occurred. Please try again." });
  });

  /**
   * Test case to verify failure when no authenticated session is present.
   */
  it("fails if unauthorized", async () => {
    // Arrange: Simulate an unauthenticated session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to update password without a session.
    const result = await changePassword({
      currentPassword: mockOldPassword,
      newPassword: mockNewPassword,
      repeatPassword: mockNewPassword,
    });

    // Assert: Check for the unauthorized error response.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that the password is not changed if the current password is wrong.
   */
  it("fails if current password is incorrect", async () => {
    // Act: Attempt to update password with an invalid current password.
    const result = await changePassword({
      currentPassword: "WrongPassword123!",
      newPassword: mockNewPassword,
      repeatPassword: mockNewPassword,
    });

    // Assert: Verify the error message for incorrect credentials.
    expect(result).toEqual({ error: "Incorrect current password." });

    // Assert: Verify the database still contains the original password hash.
    const [currentUser] = await db.select().from(users).where(eq(users.id, testUser.id));

    const isOldPasswordStillMatch = await bcrypt.compare(mockOldPassword, currentUser.password!);
    expect(isOldPasswordStillMatch).toBe(true);
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

    // Act: Attempt to update password when rate limited.
    const result = await changePassword({
      currentPassword: mockOldPassword,
      newPassword: mockNewPassword,
      repeatPassword: mockNewPassword,
    });

    // Assert: Check for the rate limit specific error message.
    expect(result).toEqual({
      error: "You are attempting to change your password too frequently. Please try again shortly.",
    });
  });
});
