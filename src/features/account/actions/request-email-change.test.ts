import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { getUserByEmail, getUserById } from "@/data/user";
import { db } from "@/db";
import { requestEmailChange, updateEmail } from "@/features/account/actions/request-email-change";
import { inngest } from "@/lib/inngest";
import { sendEmailChangeNotification, sendEmailChangeVerificationLink } from "@/lib/mail";
import { emailActionLimiter, privateActionLimiter } from "@/lib/rate-limiter";
import { generateEmailChangeToken } from "@/lib/tokens";

type Token = Awaited<ReturnType<typeof generateEmailChangeToken>>;
type User = NonNullable<Awaited<ReturnType<typeof getUserById>>>;

// Mock the bcryptjs library to simulate password comparison during email change requests.
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

// Mock the authentication module to control session state for test scenarios.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock user data access functions for fetching records by ID or email.
vi.mock("@/data/user", () => ({
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
}));

// Mock the database client to intercept update operations on the user table.
vi.mock("@/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  },
}));

// Mock Inngest to simulate event-driven background tasks for account updates.
vi.mock("@/lib/inngest", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

// Mock the mail utility to verify that notification and verification emails are dispatched correctly.
vi.mock("@/lib/mail", () => ({
  sendEmailChangeNotification: vi.fn(),
  sendEmailChangeVerificationLink: vi.fn(),
}));

// Mock rate limiting utilities to test both general private actions and email-specific throttles.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
  emailActionLimiter: {
    limit: vi.fn(),
  },
}));

// Mock token generation for the email change verification process.
vi.mock("@/lib/tokens", () => ({
  generateEmailChangeToken: vi.fn(),
}));

/**
 * Test suite for the email change request logic, covering validation, rate limiting, and execution flows.
 */
describe("requestEmailChange", () => {
  const mockUserId = "user-123";
  const mockUserEmail = "old@example.com";
  const mockNewEmail = "new@example.com";
  const mockPassword = "password123";
  const mockUserName = "Dr. Test";

  // Reset all mocks and establish a successful default state for authenticated sessions and rate limits.
  beforeEach(() => {
    vi.clearAllMocks();

    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: mockUserId, email: mockUserEmail },
    });

    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    vi.mocked(emailActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    vi.mocked(getUserById).mockResolvedValue({
      id: mockUserId,
      email: mockUserEmail,
      name: mockUserName,
      password: "hashed_password",
    } as unknown as User);

    vi.mocked(getUserByEmail).mockResolvedValue(null);

    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    vi.mocked(generateEmailChangeToken).mockResolvedValue({
      token: "verification-token",
      newEmail: mockNewEmail,
    } as unknown as Token);
  });

  /**
   * Test case to verify that unauthenticated requests are rejected.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Simulate an empty session state.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Invoke the email change request.
    const result = await requestEmailChange({
      email: mockNewEmail,
      currentPassword: mockPassword,
    });

    // Assert: Verify that the unauthorized error is returned.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that the general private action rate limiter blocks excessive attempts.
   */
  it("returns error if private rate limit is exceeded", async () => {
    // Arrange: Force the rate limiter to return a failure response.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Act: Invoke the email change request while throttled.
    const result = await requestEmailChange({
      email: mockNewEmail,
      currentPassword: mockPassword,
    });

    // Assert: Verify that the rate limit error message is returned.
    expect(result).toEqual({
      error: "You are making too many requests. Please try again shortly.",
    });
  });

  /**
   * Test case to verify schema validation for the `email` field.
   */
  it("validates new format inputs (email/currentPassword)", async () => {
    // Act: Provide a malformed email address to the action.
    const result = await requestEmailChange({
      email: "invalid-email",
      currentPassword: mockPassword,
    });

    // Assert: Check that the validation logic returns an invalid email error.
    expect(result).toEqual({ error: "Invalid email provided." });
  });

  /**
   * Test case to verify schema validation for the legacy `newEmail` field.
   */
  it("validates legacy format inputs (newEmail/currentPassword)", async () => {
    // Act: Provide a malformed email using the legacy property name.
    const result = await requestEmailChange({
      newEmail: "invalid-email",
      currentPassword: mockPassword,
    } as unknown as { email: string; currentPassword: string });

    // Assert: Check that the validation logic rejects the fields.
    expect(result).toEqual({ error: "Invalid fields provided." });
  });

  /**
   * Test case to verify that the action correctly supports the legacy `newEmail` property.
   */
  it("processes valid legacy format inputs successfully", async () => {
    // Act: Provide valid data using the legacy parameter format.
    const result = await requestEmailChange({
      newEmail: mockNewEmail,
      currentPassword: mockPassword,
    });

    // Assert: Ensure the request processes successfully and returns a verification success message.
    expect(result).toEqual({
      success: "Verification link sent to your new email address.",
    });
  });

  /**
   * Test case to verify that the email-specific rate limiter blocks repeated verification requests.
   */
  it("returns error if email action rate limit is exceeded", async () => {
    // Arrange: Mock the email action rate limiter to return a failure status.
    vi.mocked(emailActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Act: Attempt to request an email change multiple times.
    const result = await requestEmailChange({
      email: mockNewEmail,
      currentPassword: mockPassword,
    });

    // Assert: Verify that the specific email throttling error is returned.
    expect(result).toEqual({
      error: "A verification link for this email was requested recently. Please wait.",
    });
  });

  /**
   * Test case to verify that OAuth-only accounts without passwords cannot change their emails.
   */
  it("returns error if user has no password (OAuth account)", async () => {
    // Arrange: Mock a user record that does not have a hashed password.
    vi.mocked(getUserById).mockResolvedValue({
      id: mockUserId,
      email: mockUserEmail,
      password: null,
    } as unknown as Awaited<ReturnType<typeof getUserById>>);

    // Act: Invoke the email change request.
    const result = await requestEmailChange({
      email: mockNewEmail,
      currentPassword: mockPassword,
    });

    // Assert: Verify that the specific error for accounts without passwords is returned.
    expect(result).toEqual({
      error: "Email cannot be changed for accounts without a password.",
    });
  });

  /**
   * Test case to verify that the current password must be valid to proceed.
   */
  it("returns error if password is incorrect", async () => {
    // Arrange: Mock the password comparison to return false.
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    // Act: Provide an incorrect password to the action.
    const result = await requestEmailChange({
      email: mockNewEmail,
      currentPassword: mockPassword,
    });

    // Assert: Verify that the incorrect password error message is returned.
    expect(result).toEqual({ error: "Incorrect password. Please try again." });
  });

  /**
   * Test case to verify that the new email address must differ from the current one.
   */
  it("returns error if new email is same as current", async () => {
    // Act: Request a change to the email that the user already has.
    const result = await requestEmailChange({
      email: mockUserEmail,
      currentPassword: mockPassword,
    });

    // Assert: Check that the duplication error is returned.
    expect(result).toEqual({ error: "New email must be different from the current one." });
  });

  /**
   * Test case to verify that the new email must not already be associated with another account.
   */
  it("returns error if new email is already taken", async () => {
    // Arrange: Mock the database to find an existing user with the new email.
    vi.mocked(getUserByEmail).mockResolvedValue({ id: "other-user" } as unknown as Awaited<
      ReturnType<typeof getUserByEmail>
    >);

    // Act: Attempt to change the email to an occupied address.
    const result = await requestEmailChange({
      email: mockNewEmail,
      currentPassword: mockPassword,
    });

    // Assert: Verify the email in-use error message.
    expect(result).toEqual({ error: "This email address is already in use." });
  });

  /**
   * Nested test suite for the immediate email update flow.
   */
  describe("Immediate Flow (options.immediate = true)", () => {
    /**
     * Test case to verify database updates and event dispatching in immediate mode.
     */
    it("updates database and triggers inngest event", async () => {
      // Act: Trigger an immediate email change.
      const result = await requestEmailChange(
        { email: mockNewEmail, currentPassword: mockPassword },
        { immediate: true }
      );

      // Assert: Verify that the database was updated and the Inngest event was sent.
      expect(db.update).toHaveBeenCalled();
      expect(inngest.send).toHaveBeenCalledWith({
        name: "account/email.updated",
        data: {
          userId: mockUserId,
          oldEmail: mockUserEmail,
          newEmail: mockNewEmail,
          userName: mockUserName,
        },
      });
      expect(result).toEqual({
        success: "Email updated successfully. Please verify your new email address.",
      });
    });

    /**
     * Test case to verify fallback to direct mail when Inngest fails in immediate mode.
     */
    it("falls back to direct email if inngest fails", async () => {
      // Arrange: Force Inngest to throw an error and spy on the console.
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(inngest.send).mockRejectedValue(new Error("Inngest fail"));

      // Act: Trigger the immediate email change.
      const result = await requestEmailChange(
        { email: mockNewEmail, currentPassword: mockPassword },
        { immediate: true }
      );

      // Assert: Verify that the fallback notification utility was invoked.
      expect(inngest.send).toHaveBeenCalled();
      expect(sendEmailChangeNotification).toHaveBeenCalledWith(mockNewEmail, "new");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to trigger email update event:",
        expect.any(Error)
      );
      expect(result).toEqual({
        success: "Email updated successfully. Please verify your new email address.",
      });
      consoleSpy.mockRestore();
    });

    /**
     * Test case to verify logging behavior when both primary and fallback notifications fail.
     */
    it("logs error if both inngest and fallback email fail", async () => {
      // Arrange: Mock failures for both Inngest and the fallback email notification.
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(inngest.send).mockRejectedValue(new Error("Inngest fail"));
      vi.mocked(sendEmailChangeNotification).mockRejectedValue(new Error("Email fail"));

      // Act: Execute the immediate email change request.
      const result = await requestEmailChange(
        { email: mockNewEmail, currentPassword: mockPassword },
        { immediate: true }
      );

      // Assert: Verify that both notification failures were logged.
      expect(inngest.send).toHaveBeenCalled();
      expect(sendEmailChangeNotification).toHaveBeenCalledWith(mockNewEmail, "new");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to send email change notification:",
        expect.any(Error)
      );

      expect(result).toEqual({
        success: "Email updated successfully. Please verify your new email address.",
      });
      consoleSpy.mockRestore();
    });
  });

  /**
   * Nested test suite for the standard verification-based email change flow.
   */
  describe("Verification Flow (default)", () => {
    /**
     * Test case to verify token generation and dispatch of verification links.
     */
    it("generates token and sends verification emails", async () => {
      // Act: Execute the standard email change flow.
      const result = await requestEmailChange({
        email: mockNewEmail,
        currentPassword: mockPassword,
      });

      // Assert: Verify that the token was created and emails were sent to both old and new addresses.
      expect(generateEmailChangeToken).toHaveBeenCalledWith(mockUserId, mockNewEmail);
      expect(sendEmailChangeVerificationLink).toHaveBeenCalledWith(
        mockNewEmail,
        "verification-token"
      );
      expect(sendEmailChangeNotification).toHaveBeenCalledWith(mockUserEmail, "old");

      expect(result).toEqual({
        success: "Verification link sent to your new email address.",
      });
    });
  });

  /**
   * Test case to verify that unexpected system errors are caught and logged.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Force a database failure during user lookup.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getUserById).mockRejectedValue(new Error("DB Error"));

    // Act: Trigger the email change request.
    const result = await requestEmailChange({
      email: mockNewEmail,
      currentPassword: mockPassword,
    });

    // Assert: Verify the error was logged and a generic error response was returned.
    expect(consoleSpy).toHaveBeenCalledWith(
      "REQUEST_EMAIL_CHANGE_ACTION_ERROR:",
      expect.any(Error)
    );
    expect(result).toEqual({
      error: "An unexpected error occurred while processing your request.",
    });

    consoleSpy.mockRestore();
  });

  /**
   * Nested test suite for the `updateEmail` convenience wrapper.
   */
  describe("updateEmail (Wrapper)", () => {
    /**
     * Test case to verify that `updateEmail` correctly triggers an immediate database update.
     */
    it("calls requestEmailChange with immediate: true", async () => {
      // Act: Invoke the update wrapper.
      const result = await updateEmail({
        email: mockNewEmail,
        currentPassword: mockPassword,
      });

      // Assert: Verify that the database update occurred and token generation was bypassed.
      expect(db.update).toHaveBeenCalled();
      expect(generateEmailChangeToken).not.toHaveBeenCalled();

      expect(result).toEqual({
        success: "Email updated successfully. Please verify your new email address.",
      });
    });
  });
});
