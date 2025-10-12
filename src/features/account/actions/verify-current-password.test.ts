import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { getUserById } from "@/data/user";
import { verifyCurrentPassword } from "@/features/account/actions/verify-current-password";
import { privateActionLimiter } from "@/lib/rate-limiter";

type User = NonNullable<Awaited<ReturnType<typeof getUserById>>>;

// Mock the bcrypt library to safely simulate password hashing comparisons without actual computation.
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

// Mock the authentication utility to control user session state in test scenarios.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the user data retrieval utility to simulate fetching user records from the database.
vi.mock("@/data/user", () => ({
  getUserById: vi.fn(),
}));

// Mock the rate limiter to simulate various traffic restriction states.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
}));

/**
 * Test suite for the `verifyCurrentPassword` server action.
 */
describe("verifyCurrentPassword", () => {
  const mockUserId = "user-123";
  const mockPassword = "password123";

  // Reset all mock implementations and establish default successful states before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    // Arrange: Setup a valid authenticated session for the user.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: mockUserId },
    });

    // Arrange: Ensure the rate limiter does not block the verification attempt.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Arrange: Mock a user record found in the database with a valid hashed password.
    vi.mocked(getUserById).mockResolvedValue({
      id: mockUserId,
      password: "hashed_password",
    } as unknown as User);

    // Arrange: Mock bcrypt to return a successful match by default.
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
  });

  /**
   * Test case to verify that unauthenticated requests are rejected.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Simulate a missing session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to verify the password.
    const result = await verifyCurrentPassword({ currentPassword: mockPassword });

    // Assert: Check that the unauthorized error is returned.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that the action enforces rate limits for security.
   */
  it("returns error if rate limit is exceeded", async () => {
    // Arrange: Mock the rate limiter to trigger a restriction.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Act: Attempt to verify the password.
    const result = await verifyCurrentPassword({ currentPassword: mockPassword });

    // Assert: Verify that the frequency error message is returned.
    expect(result).toEqual({
      error: "You are attempting to verify your password too frequently. Please try again shortly.",
    });
  });

  /**
   * Test case to verify behavior when the user record cannot be retrieved from the database.
   */
  it("returns error if user is not found", async () => {
    // Arrange: Force the user lookup utility to return null.
    vi.mocked(getUserById).mockResolvedValue(null);

    // Act: Attempt to verify the password.
    const result = await verifyCurrentPassword({ currentPassword: mockPassword });

    // Assert: Verify the error regarding provider-based account limitations.
    expect(result).toEqual({
      error: "Password verification is not available for accounts signed in with a provider.",
    });
  });

  /**
   * Test case to verify that accounts without a password (OAuth) are rejected for verification.
   */
  it("returns error if user has no password (OAuth)", async () => {
    // Arrange: Mock a user record with a null password field.
    vi.mocked(getUserById).mockResolvedValue({
      id: mockUserId,
      password: null,
    } as unknown as User);

    // Act: Attempt to verify the password.
    const result = await verifyCurrentPassword({ currentPassword: mockPassword });

    // Assert: Verify the error regarding provider-based account limitations.
    expect(result).toEqual({
      error: "Password verification is not available for accounts signed in with a provider.",
    });
  });

  /**
   * Test case to verify behavior when the provided password does not match the hashed version.
   */
  it("returns error if passwords do not match", async () => {
    // Arrange: Force the bcrypt comparison to return false.
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    // Act: Attempt to verify with an incorrect password string.
    const result = await verifyCurrentPassword({ currentPassword: "wrong" });

    // Assert: Verify that the "Incorrect password" error is returned.
    expect(result).toEqual({ error: "Incorrect current password." });
  });

  /**
   * Test case to verify successful password verification.
   */
  it("returns success if password is verified", async () => {
    // Act: Execute the verification with correct credentials.
    const result = await verifyCurrentPassword({ currentPassword: mockPassword });

    // Assert: Confirm bcrypt comparison was executed with the correct arguments and success was returned.
    expect(bcrypt.compare).toHaveBeenCalledWith(mockPassword, "hashed_password");
    expect(result).toEqual({ success: "Password verified successfully." });
  });

  /**
   * Test case to verify that internal errors are logged and a generic error is returned to the client.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Force a database utility to throw an error and setup a console spy.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getUserById).mockRejectedValue(new Error("DB Error"));

    // Act: Attempt to verify the password.
    const result = await verifyCurrentPassword({ currentPassword: mockPassword });

    // Assert: Verify that the error was logged and the user received a generic failure message.
    expect(consoleSpy).toHaveBeenCalledWith(
      "VERIFY_CURRENT_PASSWORD_ACTION_ERROR:",
      expect.any(Error)
    );
    expect(result).toEqual({ error: "An unexpected error occurred. Please try again." });

    consoleSpy.mockRestore();
  });
});
