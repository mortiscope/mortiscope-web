import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { getUserById } from "@/data/user";
import { db } from "@/db";
import { users, userTwoFactor } from "@/db/schema";
import { disableTwoFactor } from "@/features/account/actions/disable-two-factor";
import { privateActionLimiter } from "@/lib/rate-limiter";

// Mock the bcryptjs library for password verification logic.
vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

// Mock the authentication module to provide session data.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock user retrieval utility to simulate database lookups.
vi.mock("@/data/user", () => ({
  getUserById: vi.fn(),
}));

// Mock the database client including query and deletion operations.
vi.mock("@/db", () => ({
  db: {
    query: {
      userTwoFactor: {
        findFirst: vi.fn(),
      },
    },
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}));

// Mock the rate limiter to prevent excessive action attempts.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn(),
  },
}));

/**
 * Test suite for the `disableTwoFactor` server action.
 */
describe("disableTwoFactor", () => {
  const mockUserId = "user-123";
  const mockPassword = "password123";

  // Configure standard mock return values before each test to establish a success baseline.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(auth).mockResolvedValue({
      user: { id: mockUserId },
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
      password: "hashed_password",
    } as unknown as typeof users.$inferSelect);

    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    vi.mocked(db.query.userTwoFactor.findFirst).mockResolvedValue({
      enabled: true,
    } as unknown as typeof userTwoFactor.$inferSelect);
  });

  /**
   * Test case to verify that an error is returned when no active session exists.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Set the session to null to simulate an unauthenticated user.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Invoke the action with a valid password.
    const result = await disableTwoFactor({ currentPassword: mockPassword });

    // Assert: Verify that the unauthorized error is returned.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that the rate limiter blocks requests when the threshold is reached.
   */
  it("returns error if rate limit is exceeded", async () => {
    // Arrange: Configure the rate limiter to return a failed success state.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Act: Invoke the action while rate limited.
    const result = await disableTwoFactor({ currentPassword: mockPassword });

    // Assert: Verify that the rate limit error message is returned.
    expect(result).toEqual({ error: "You are making too many requests." });
  });

  /**
   * Test case to verify that a blank password input triggers a validation error.
   */
  it("returns error if current password is missing or empty", async () => {
    // Act: Invoke the action with an empty string for the `currentPassword` parameter.
    const result = await disableTwoFactor({ currentPassword: "" });

    // Assert: Verify that a password requirement error is returned.
    expect(result).toEqual({ error: "Current password is required." });
  });

  /**
   * Test case to verify error handling for non-existent users or OAuth-only accounts.
   */
  it("returns error if user is not found or has no password", async () => {
    // Arrange: Simulate a database miss for the user ID.
    vi.mocked(getUserById).mockResolvedValue(null);

    // Act: Attempt to disable two-factor authentication.
    const result = await disableTwoFactor({ currentPassword: mockPassword });

    // Assert: Verify the error regarding user existence or missing password.
    expect(result).toEqual({ error: "User not found or password not set." });
  });

  /**
   * Test case to verify that an incorrect password prevents disabling two-factor authentication.
   */
  it("returns error if current password is invalid", async () => {
    // Arrange: Force the bcrypt comparison to return false.
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    // Act: Attempt to disable two-factor authentication with an invalid password.
    const result = await disableTwoFactor({ currentPassword: mockPassword });

    // Assert: Check for the invalid password error message.
    expect(result).toEqual({ error: "Invalid password." });
  });

  /**
   * Test case to verify error handling when no two-factor record exists in the database.
   */
  it("returns error if 2FA record does not exist", async () => {
    // Arrange: Simulate a missing record for the `userTwoFactor` table.
    vi.mocked(db.query.userTwoFactor.findFirst).mockResolvedValue(undefined);

    // Act: Attempt to disable two-factor authentication.
    const result = await disableTwoFactor({ currentPassword: mockPassword });

    // Assert: Verify the error stating two-factor authentication is not enabled.
    expect(result).toEqual({ error: "Two-factor authentication is not enabled for this account." });
  });

  /**
   * Test case to verify error handling when the record exists but is marked as disabled.
   */
  it("returns error if 2FA is not enabled", async () => {
    // Arrange: Mock a record that has the `enabled` flag set to false.
    vi.mocked(db.query.userTwoFactor.findFirst).mockResolvedValue({
      enabled: false,
    } as unknown as typeof userTwoFactor.$inferSelect);

    // Act: Attempt to disable two-factor authentication.
    const result = await disableTwoFactor({ currentPassword: mockPassword });

    // Assert: Verify the error stating two-factor authentication is not enabled.
    expect(result).toEqual({ error: "Two-factor authentication is not enabled for this account." });
  });

  /**
   * Test case to verify the successful removal of two-factor settings and recovery codes.
   */
  it("successfully disables 2FA and deletes recovery codes", async () => {
    // Act: Invoke the action with valid credentials and state.
    const result = await disableTwoFactor({ currentPassword: mockPassword });

    // Assert: Ensure the database delete operation was called twice for the record and recovery codes.
    expect(db.delete).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      success: "Two-factor authentication has been disabled successfully.",
    });
  });

  /**
   * Test case to verify that unexpected system failures are caught and logged.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Mock a database failure and suppress console output during the test.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getUserById).mockRejectedValue(new Error("Database failure"));

    // Act: Trigger the action with a failing internal dependency.
    const result = await disableTwoFactor({ currentPassword: mockPassword });

    // Assert: Verify that the error was logged and a generic failure message was returned.
    expect(consoleSpy).toHaveBeenCalledWith("DISABLE_TWO_FACTOR_ACTION_ERROR:", expect.any(Error));
    expect(result).toEqual({ error: "Failed to disable two-factor authentication." });

    consoleSpy.mockRestore();
  });
});
