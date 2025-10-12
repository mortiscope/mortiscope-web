import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getUserByEmail, getUserById } from "@/data/user";
import { db } from "@/db";
import { verifyEmailChange } from "@/features/account/actions/verify-email-change";
import {
  deleteEmailChangeToken,
  getEmailChangeTokenByToken,
} from "@/features/account/tokens/email-change-token";
import { sendEmailChangeNotification } from "@/lib/mail";

type User = NonNullable<Awaited<ReturnType<typeof getUserById>>>;
type Token = NonNullable<Awaited<ReturnType<typeof getEmailChangeTokenByToken>>>;

// Mock the user data access layer to simulate email and ID lookups.
vi.mock("@/data/user", () => ({
  getUserByEmail: vi.fn(),
  getUserById: vi.fn(),
}));

// Mock the database client to intercept update and delete operations during the verification flow.
vi.mock("@/db", () => ({
  db: {
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}));

// Mock the token management functions to control verification token retrieval and cleanup.
vi.mock("@/features/account/tokens/email-change-token", () => ({
  getEmailChangeTokenByToken: vi.fn(),
  deleteEmailChangeToken: vi.fn(),
}));

// Mock the mail utility to verify that notification emails are triggered upon successful change.
vi.mock("@/lib/mail", () => ({
  sendEmailChangeNotification: vi.fn(),
}));

/**
 * Test suite for the `verifyEmailChange` server action.
 */
describe("verifyEmailChange", () => {
  const mockTokenString = "valid-token-123";
  const mockUserId = "user-123";
  const mockNewEmail = "new@example.com";
  const mockTokenId = "token-id-1";

  // Initialize fake timers and set a fixed system time before each test for expiration logic verification.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 1));
  });

  // Cleanup fake timers to restore real-time behavior for subsequent test suites.
  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * Test case to verify that the action rejects empty or missing token strings.
   */
  it("returns error if token is missing", async () => {
    // Act: Invoke verification with an empty string.
    const result = await verifyEmailChange("");

    // Assert: Check for the specific missing token error message.
    expect(result).toEqual({ status: "error", message: "Missing verification token." });
  });

  /**
   * Test case to verify that the action handles tokens that do not exist in the database.
   */
  it("returns error if token is invalid (not found in DB)", async () => {
    // Arrange: Mock the token lookup to return null.
    vi.mocked(getEmailChangeTokenByToken).mockResolvedValue(null);

    // Act: Attempt verification with a non-existent token.
    const result = await verifyEmailChange(mockTokenString);

    // Assert: Verify that an invalid link error is returned.
    expect(result).toEqual({ status: "error", message: "Invalid verification link." });
  });

  /**
   * Test case to verify that expired tokens are deleted and the process is aborted.
   */
  it("returns error and deletes token if expired", async () => {
    // Arrange: Provide a token with an expiration date in the past.
    vi.mocked(getEmailChangeTokenByToken).mockResolvedValue({
      id: mockTokenId,
      expires: new Date(2024, 11, 31),
      userId: mockUserId,
      newEmail: mockNewEmail,
    } as unknown as Token);

    // Act: Attempt verification with the expired token.
    const result = await verifyEmailChange(mockTokenString);

    // Assert: Confirm the token was deleted and the expiration error was returned.
    expect(deleteEmailChangeToken).toHaveBeenCalledWith(mockTokenId);
    expect(result).toEqual({ status: "error", message: "Verification link has expired." });
  });

  /**
   * Test case to verify that tokens belonging to non-existent users are cleaned up.
   */
  it("returns error and deletes token if user not found", async () => {
    // Arrange: Mock a valid token but a missing user record.
    vi.mocked(getEmailChangeTokenByToken).mockResolvedValue({
      id: mockTokenId,
      expires: new Date(2025, 0, 2),
      userId: mockUserId,
      newEmail: mockNewEmail,
    } as unknown as Token);

    vi.mocked(getUserById).mockResolvedValue(null);

    // Act: Attempt verification.
    const result = await verifyEmailChange(mockTokenString);

    // Assert: Verify the token cleanup and "User not found" error.
    expect(deleteEmailChangeToken).toHaveBeenCalledWith(mockTokenId);
    expect(result).toEqual({ status: "error", message: "User not found." });
  });

  /**
   * Test case to verify that the email update fails if the new address has been claimed by another user in the interim.
   */
  it("returns error if new email is already taken by another user", async () => {
    // Arrange: Setup token and user, but mock `getUserByEmail` to return a different existing user.
    vi.mocked(getEmailChangeTokenByToken).mockResolvedValue({
      id: mockTokenId,
      expires: new Date(2025, 0, 2),
      userId: mockUserId,
      newEmail: mockNewEmail,
    } as unknown as Token);

    vi.mocked(getUserById).mockResolvedValue({ id: mockUserId } as unknown as User);

    vi.mocked(getUserByEmail).mockResolvedValue({ id: "other-user-id" } as unknown as User);

    // Act: Attempt verification.
    const result = await verifyEmailChange(mockTokenString);

    // Assert: Verify the conflict error message.
    expect(result).toEqual({
      status: "error",
      message: "Email address has been taken. Please restart the process.",
    });
  });

  /**
   * Test case to verify the complete successful flow of updating the user email and cleaning up resources.
   */
  it("successfully updates email, invalidates sessions, and sends notification", async () => {
    // Arrange: Mock all conditions for success—valid token, valid user, and available email address.
    vi.mocked(getEmailChangeTokenByToken).mockResolvedValue({
      id: mockTokenId,
      expires: new Date(2025, 0, 2),
      userId: mockUserId,
      newEmail: mockNewEmail,
    } as unknown as Token);

    vi.mocked(getUserById).mockResolvedValue({ id: mockUserId } as unknown as User);
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    // Act: Execute verification.
    const result = await verifyEmailChange(mockTokenString);

    // Assert: Check that the database was updated, tokens and sessions were deleted, and notification was sent.
    expect(db.update).toHaveBeenCalled();
    expect(db.delete).toHaveBeenCalledTimes(2);

    expect(sendEmailChangeNotification).toHaveBeenCalledWith(mockNewEmail, "new");
    expect(result).toEqual({
      status: "success",
      message: "Your email address has been successfully updated!",
    });
  });

  /**
   * Test case to verify that database exceptions are caught, logged, and return a user-friendly error.
   */
  it("handles unexpected database errors gracefully", async () => {
    // Arrange: Setup a console spy and force a database update failure.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(getEmailChangeTokenByToken).mockResolvedValue({
      id: mockTokenId,
      expires: new Date(2025, 0, 2),
      userId: mockUserId,
      newEmail: mockNewEmail,
    } as unknown as Token);
    vi.mocked(getUserById).mockResolvedValue({ id: mockUserId } as unknown as User);

    vi.mocked(db.update).mockImplementation(() => {
      throw new Error("DB Error");
    });

    // Act: Attempt verification.
    const result = await verifyEmailChange(mockTokenString);

    // Assert: Verify diagnostic logging and generic error response.
    expect(consoleSpy).toHaveBeenCalledWith("VERIFY_EMAIL_CHANGE_ACTION_ERROR:", expect.any(Error));
    expect(result).toEqual({
      status: "error",
      message: "An unexpected error occurred while updating your email.",
    });

    consoleSpy.mockRestore();
  });
});
