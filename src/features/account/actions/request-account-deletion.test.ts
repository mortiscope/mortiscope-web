import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { getUserByEmail } from "@/data/user";
import { requestAccountDeletion } from "@/features/account/actions/request-account-deletion";
import { sendAccountDeletionRequest } from "@/lib/mail";
import { privateActionLimiter } from "@/lib/rate-limiter";
import { generateAccountDeletionToken } from "@/lib/tokens";

type User = NonNullable<Awaited<ReturnType<typeof getUserByEmail>>>;
type Token = Awaited<ReturnType<typeof generateAccountDeletionToken>>;

// Mock the bcryptjs library for password comparison logic.
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

// Mock the authentication module to provide user session context.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock user data retrieval utilities.
vi.mock("@/data/user", () => ({
  getUserByEmail: vi.fn(),
}));

// Mock the mail utility to prevent sending actual emails during tests.
vi.mock("@/lib/mail", () => ({
  sendAccountDeletionRequest: vi.fn(),
}));

// Mock the rate limiter to control request throttling during testing.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
}));

// Mock the token generation utility for account deletion.
vi.mock("@/lib/tokens", () => ({
  generateAccountDeletionToken: vi.fn(),
}));

/**
 * Test suite for the `requestAccountDeletion` server action.
 */
describe("requestAccountDeletion", () => {
  const mockUserEmail = "mortiscope@example.com";
  const mockPassword = "password123";

  // Initialize mocks with successful baseline values before each test case.
  beforeEach(() => {
    vi.clearAllMocks();

    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { email: mockUserEmail },
    });

    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    const mockUser = {
      email: mockUserEmail,
      password: "hashed_password",
      deletionScheduledAt: null,
      id: "user-123",
      name: "Test User",
      emailVerified: new Date(),
      image: null,
    };
    vi.mocked(getUserByEmail).mockResolvedValue(mockUser as unknown as User);

    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(generateAccountDeletionToken).mockResolvedValue({
      identifier: mockUserEmail,
      token: "token-123",
      expires: new Date(Date.now() + 3600 * 1000),
    } as unknown as Token);
  });

  /**
   * Test case to verify that unauthenticated users are barred from requesting deletion.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Set the session state to null.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to request account deletion.
    const result = await requestAccountDeletion({ password: mockPassword });

    // Assert: Check that the unauthorized error message is returned.
    expect(result).toEqual({
      error: "Unauthorized: You must be logged in to delete your account.",
    });
  });

  /**
   * Test case to verify that the rate limiter stops excessive deletion requests.
   */
  it("returns error if rate limit is exceeded", async () => {
    // Arrange: Configure the rate limiter mock to return a failure status.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Act: Attempt to request deletion while rate limited.
    const result = await requestAccountDeletion({ password: mockPassword });

    // Assert: Verify that the rate limit error message is returned.
    expect(result).toEqual({
      error: "You have made too many deletion requests. Please wait a while.",
    });
  });

  /**
   * Test case to verify error handling when the user record is missing.
   */
  it("returns error if user is not found", async () => {
    // Arrange: Mock the database to return no user for the given email.
    vi.mocked(getUserByEmail).mockResolvedValue(null);

    // Act: Attempt to request deletion for a non-existent user.
    const result = await requestAccountDeletion({ password: mockPassword });

    // Assert: Check that the user not found error is returned.
    expect(result).toEqual({ error: "User not found. Cannot proceed with deletion." });
  });

  /**
   * Test case to verify that duplicate deletion schedules are prevented.
   */
  it("returns error if deletion is already scheduled", async () => {
    // Arrange: Mock a user record that already has a `deletionScheduledAt` timestamp.
    vi.mocked(getUserByEmail).mockResolvedValue({
      email: mockUserEmail,
      deletionScheduledAt: new Date(),
    } as unknown as User);

    // Act: Attempt to request deletion again.
    const result = await requestAccountDeletion({ password: mockPassword });

    // Assert: Verify the error regarding the existing deletion schedule.
    expect(result).toEqual({ error: "This account is already scheduled for deletion." });
  });

  /**
   * Test case to verify that a password is required for credential-based accounts.
   */
  it("validates password for credential users (missing password)", async () => {
    // Act: Submit a deletion request with an empty password string.
    const result = await requestAccountDeletion({ password: "" });

    // Assert: Check for the required password error message.
    expect(result).toEqual({ error: "Password is required to delete this account." });
  });

  /**
   * Test case to verify that incorrect passwords result in a validation failure.
   */
  it("validates password for credential users (incorrect password)", async () => {
    // Arrange: Mock the bcrypt comparison to fail.
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    // Act: Submit a deletion request with an invalid password.
    const result = await requestAccountDeletion({ password: "wrong-password" });

    // Assert: Check for the incorrect password error message.
    expect(result).toEqual({ error: "Incorrect password." });
  });

  /**
   * Test case to verify the full success path for accounts using passwords.
   */
  it("succeeds for credential users with correct password", async () => {
    // Act: Submit a valid deletion request.
    const result = await requestAccountDeletion({ password: mockPassword });

    // Assert: Verify password check, token generation, and email dispatch were performed.
    expect(bcrypt.compare).toHaveBeenCalledWith(mockPassword, "hashed_password");
    expect(generateAccountDeletionToken).toHaveBeenCalledWith(mockUserEmail);
    expect(sendAccountDeletionRequest).toHaveBeenCalledWith(mockUserEmail, "token-123");
    expect(result).toEqual({
      success: "Confirmation required. Deletion link has been sent to your email.",
    });
  });

  /**
   * Test case to verify that OAuth users can request deletion without providing a password.
   */
  it("succeeds for OAuth users (no password required)", async () => {
    // Arrange: Mock a user record with a null password field typical of OAuth accounts.
    vi.mocked(getUserByEmail).mockResolvedValue({
      email: mockUserEmail,
      password: null,
      deletionScheduledAt: null,
    } as unknown as User);

    // Act: Submit a deletion request with an empty password.
    const result = await requestAccountDeletion({ password: "" });

    // Assert: Verify that bcrypt was bypassed but tokens and emails were still processed.
    expect(bcrypt.compare).not.toHaveBeenCalled();
    expect(generateAccountDeletionToken).toHaveBeenCalledWith(mockUserEmail);
    expect(sendAccountDeletionRequest).toHaveBeenCalledWith(mockUserEmail, "token-123");
    expect(result).toEqual({
      success: "Confirmation required. Deletion link has been sent to your email.",
    });
  });

  /**
   * Test case to verify that internal logic or external utility failures are caught.
   */
  it("handles errors during email sending", async () => {
    // Arrange: Mock token generation to throw an error and spy on console output.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(generateAccountDeletionToken).mockRejectedValue(new Error("Token gen failed"));

    // Act: Trigger the deletion request.
    const result = await requestAccountDeletion({ password: mockPassword });

    // Assert: Verify that the error was logged and a generic failure message was returned.
    expect(consoleSpy).toHaveBeenCalledWith("DELETION REQUEST FAILED:", expect.any(Error));
    expect(result).toEqual({ error: "Something went wrong. Deletion email could not be sent." });

    // Cleanup: Restore console error functionality.
    consoleSpy.mockRestore();
  });
});
