import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { getUserById } from "@/data/user";
import { db } from "@/db";
import { users } from "@/db/schema";
import { changePassword } from "@/features/account/actions/change-password";
import { type ChangePasswordFormValues } from "@/features/auth/schemas/auth";
import { inngest } from "@/lib/inngest";
import { sendPasswordUpdatedEmail } from "@/lib/mail";
import { privateActionLimiter } from "@/lib/rate-limiter";

// Mock the bcryptjs library to simulate password hashing and comparison.
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

// Mock the authentication module to control session state.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock user data retrieval functions.
vi.mock("@/data/user", () => ({
  getUserById: vi.fn(),
}));

// Mock the database client and its chainable update methods.
vi.mock("@/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));

// Mock the Inngest client for background job dispatching.
vi.mock("@/lib/inngest", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

// Mock the email utility for sending password update notifications.
vi.mock("@/lib/mail", () => ({
  sendPasswordUpdatedEmail: vi.fn(),
}));

// Mock the rate limiter to simulate request throttling.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
}));

/**
 * Test suite for the `changePassword` server action.
 */
describe("changePassword", () => {
  const mockUserId = "user-123";
  const mockUserEmail = "mortiscope@example.com";
  const mockUserName = "Mortiscope Account";
  const currentPassword = "OldPassword123!";
  const newPassword = "NewPassword123!";
  const hashedPassword = "hashed_new_password";

  // Initialize mocks and default successful return values before each test case.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
      expires: new Date().toISOString(),
    } as unknown as Awaited<ReturnType<typeof auth>>);

    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    vi.mocked(getUserById).mockResolvedValue({
      id: mockUserId,
      email: mockUserEmail,
      name: mockUserName,
      password: "hashed_old_password",
    } as unknown as typeof users.$inferSelect);

    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never);
  });

  /**
   * Test case to verify that unauthenticated requests are rejected.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Mock the session to return null.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to change the password without a session.
    const result = await changePassword({
      currentPassword,
      newPassword,
      repeatPassword: newPassword,
    });

    // Assert: Check for the unauthorized error message.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that the rate limiter stops excessive requests.
   */
  it("returns error if rate limit is exceeded", async () => {
    // Arrange: Mock the rate limiter to return a failed success state.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Act: Attempt to change the password while rate limited.
    const result = await changePassword({
      currentPassword,
      newPassword,
      repeatPassword: newPassword,
    });

    // Assert: Verify that the rate limit error message is returned.
    expect(result).toEqual({
      error: "You are attempting to change your password too frequently. Please try again shortly.",
    });
  });

  /**
   * Test case to verify validation of input fields with a repeat password.
   */
  it("validates fields using AccountSecuritySchema (with repeatPassword)", async () => {
    // Act: Pass invalid data that fails schema validation.
    const result = await changePassword({
      currentPassword: "short",
      newPassword: "short",
      repeatPassword: "mismatch",
    });

    // Assert: Ensure the validation error is caught and returned.
    expect(result).toEqual({ error: "Invalid fields provided." });
  });

  /**
   * Test case to verify validation using the legacy form schema.
   */
  it("validates fields using ChangePasswordSchema (legacy format)", async () => {
    // Act: Pass invalid data using the older schema format.
    const result = await changePassword({
      currentPassword: "short",
      newPassword: "short",
    } as unknown as ChangePasswordFormValues);

    // Assert: Ensure the validation error is caught for the legacy schema.
    expect(result).toEqual({ error: "Invalid fields provided." });
  });

  /**
   * Test case to verify successful updates when using legacy property names.
   */
  it("successfully updates password using legacy format", async () => {
    // Act: Perform a password change with `confirmNewPassword` instead of `repeatPassword`.
    const result = await changePassword({
      currentPassword,
      newPassword,
      confirmNewPassword: newPassword,
    } as unknown as ChangePasswordFormValues);

    // Assert: Verify that hashing occurred and the database update was triggered.
    expect(bcrypt.compare).toHaveBeenCalledWith(currentPassword, "hashed_old_password");
    expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
    expect(db.update).toHaveBeenCalled();
    expect(result).toEqual({ success: "Password updated successfully." });
  });

  /**
   * Test case to verify that missing user records return a specific error.
   */
  it("returns error if user does not exist", async () => {
    // Arrange: Mock the database to return no user.
    vi.mocked(getUserById).mockResolvedValue(null);

    // Act: Attempt to change the password for a non-existent user.
    const result = await changePassword({
      currentPassword,
      newPassword,
      repeatPassword: newPassword,
    });

    // Assert: Verify the error regarding provider accounts is returned as a fallback.
    expect(result).toEqual({
      error: "Password cannot be changed for accounts signed in with a provider.",
    });
  });

  /**
   * Test case to verify that OAuth users cannot change passwords.
   */
  it("returns error if user has no password (OAuth provider)", async () => {
    // Arrange: Mock a user record that has a null password field.
    vi.mocked(getUserById).mockResolvedValue({
      id: mockUserId,
      email: mockUserEmail,
      password: null,
    } as unknown as typeof users.$inferSelect);

    // Act: Attempt to change the password for an OAuth user.
    const result = await changePassword({
      currentPassword,
      newPassword,
      repeatPassword: newPassword,
    });

    // Assert: Ensure the provider-specific error message is returned.
    expect(result).toEqual({
      error: "Password cannot be changed for accounts signed in with a provider.",
    });
  });

  /**
   * Test case to verify that the current password must match the database.
   */
  it("returns error if current password is incorrect", async () => {
    // Arrange: Mock the bcrypt comparison to fail.
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    // Act: Attempt a password change with the wrong current password.
    const result = await changePassword({
      currentPassword,
      newPassword,
      repeatPassword: newPassword,
    });

    // Assert: Check that the incorrect password error is returned.
    expect(result).toEqual({ error: "Incorrect current password." });
  });

  /**
   * Test case to verify the full success path including event dispatching.
   */
  it("successfully updates password and sends inngest event", async () => {
    // Act: Execute a valid password change.
    const result = await changePassword({
      currentPassword,
      newPassword,
      repeatPassword: newPassword,
    });

    // Assert: Verify hashing, database updates, and Inngest event dispatching occurred.
    expect(bcrypt.compare).toHaveBeenCalledWith(currentPassword, "hashed_old_password");
    expect(bcrypt.hash).toHaveBeenCalledWith(newPassword, 10);
    expect(db.update).toHaveBeenCalled();
    expect(inngest.send).toHaveBeenCalledWith({
      name: "account/password.updated",
      data: {
        userId: mockUserId,
        userEmail: mockUserEmail,
        userName: mockUserName,
      },
    });
    expect(result).toEqual({ success: "Password updated successfully." });
  });

  /**
   * Test case to verify that a fallback email is sent if the event bus fails.
   */
  it("uses fallback email sender if inngest fails", async () => {
    // Arrange: Force Inngest to throw an error and spy on console output.
    vi.mocked(inngest.send).mockRejectedValue(new Error("Inngest error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Execute the password change.
    const result = await changePassword({
      currentPassword,
      newPassword,
      repeatPassword: newPassword,
    });

    // Assert: Ensure the fallback email utility was called and the error was logged.
    expect(inngest.send).toHaveBeenCalled();
    expect(sendPasswordUpdatedEmail).toHaveBeenCalledWith(mockUserEmail);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to trigger password update email event:",
      expect.any(Error)
    );
    expect(result).toEqual({ success: "Password updated successfully." });

    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify handling of unexpected database or system exceptions.
   */
  it("logs error and returns generic error message on unexpected exception", async () => {
    // Arrange: Mock a database failure during user lookup.
    vi.mocked(getUserById).mockRejectedValue(new Error("Database error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Trigger the action with the failing database mock.
    const result = await changePassword({
      currentPassword,
      newPassword,
      repeatPassword: newPassword,
    });

    // Assert: Verify that the error was caught, logged, and a generic message was returned.
    expect(consoleSpy).toHaveBeenCalledWith("CHANGE_PASSWORD_ACTION_ERROR:", expect.any(Error));
    expect(result).toEqual({ error: "An unexpected error occurred. Please try again." });

    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify logging when both the primary and fallback notification methods fail.
   */
  it("logs error when fallback email sender also fails", async () => {
    // Arrange: Force both Inngest and the email utility to fail.
    vi.mocked(inngest.send).mockRejectedValue(new Error("Inngest error"));
    vi.mocked(sendPasswordUpdatedEmail).mockRejectedValue(new Error("Email error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Execute the password change.
    const result = await changePassword({
      currentPassword,
      newPassword,
      repeatPassword: newPassword,
    });

    // Assert: Verify that both failure states were logged while still returning success for the password change itself.
    expect(inngest.send).toHaveBeenCalled();
    expect(sendPasswordUpdatedEmail).toHaveBeenCalledWith(mockUserEmail);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to trigger password update email event:",
      expect.any(Error)
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to send password updated email after change:",
      expect.any(Error)
    );
    expect(result).toEqual({ success: "Password updated successfully." });

    consoleSpy.mockRestore();
  });
});
