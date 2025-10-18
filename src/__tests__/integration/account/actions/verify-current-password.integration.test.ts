"use server";

import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyCurrentPassword } from "@/features/account/actions/verify-current-password";
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

/**
 * Integration test suite for `verifyCurrentPassword` server action.
 */
describe("verifyCurrentPassword (integration)", () => {
  const mockUserId = "test-user-id";
  const mockPassword = "correct-password";

  /**
   * Resets the mock state and database before each test execution.
   */
  beforeEach(async () => {
    // Arrange: Clear mock history and reset the database to a clean state.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Configure auth to return an authenticated test user session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: mockUserId },
    });

    // Arrange: Configure the rate limiter to allow requests by default.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      reset: Date.now(),
      pending: Promise.resolve(),
    });
  });

  /**
   * Utility function to seed a test user with a hashed password in the database.
   * @param {string | null} password - The plain text password to hash and store.
   */
  async function setupUser(password: string | null = mockPassword) {
    // Arrange: Hash the provided password and insert a user record into the `users` table.
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    await db.insert(users).values({
      id: mockUserId,
      email: "mortiscope@example.com",
      name: "MortiScope Account",
      password: hashedPassword,
    });
  }

  /**
   * Test suite for session validation and rate limit enforcement.
   */
  describe("authentication and rate limiting", () => {
    /**
     * Test case to verify that the action fails when no session is present.
     */
    it("returns unauthorized error when session is missing", async () => {
      // Arrange: Simulate an unauthenticated request.
      (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

      // Act: Attempt to verify password without an active session.
      const result = await verifyCurrentPassword({ currentPassword: mockPassword });

      // Assert: Verify the unauthorized error response.
      expect(result.error).toBe("Unauthorized.");
    });

    /**
     * Test case to verify that the action fails when the session object is malformed.
     */
    it("returns unauthorized when session has no user id", async () => {
      // Arrange: Simulate a session lacking user identification properties.
      (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
        user: {},
      });

      // Act: Attempt to verify password with an invalid session.
      const result = await verifyCurrentPassword({ currentPassword: mockPassword });

      // Assert: Verify the unauthorized error response.
      expect(result.error).toBe("Unauthorized.");
    });

    /**
     * Test case to verify that the rate limiter blocks excessive verification attempts.
     */
    it("returns rate limit error when limit exceeded", async () => {
      // Arrange: Configure the rate limiter to reject the request.
      vi.mocked(privateActionLimiter.limit).mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now(),
        pending: Promise.resolve(),
      });

      // Act: Attempt to verify password when the rate limit is hit.
      const result = await verifyCurrentPassword({ currentPassword: mockPassword });

      // Assert: Verify the specific rate limit error message.
      expect(result.error).toBe(
        "You are attempting to verify your password too frequently. Please try again shortly."
      );
    });
  });

  /**
   * Test suite for account type and existence validation.
   */
  describe("user validation", () => {
    /**
     * Test case to verify failure when the user record does not exist in the database.
     */
    it("returns error when user not found", async () => {
      // Act: Attempt verification when the `users` table is empty.
      const result = await verifyCurrentPassword({ currentPassword: mockPassword });

      // Assert: Verify the error regarding provider accounts or missing users.
      expect(result.error).toBe(
        "Password verification is not available for accounts signed in with a provider."
      );
    });

    /**
     * Test case to verify that OAuth users (without passwords) cannot use this action.
     */
    it("returns error for OAuth user without password", async () => {
      // Arrange: Seed a user record with a `null` password column.
      await setupUser(null);

      // Act: Attempt to verify a password for the passwordless account.
      const result = await verifyCurrentPassword({ currentPassword: mockPassword });

      // Assert: Verify the error message indicating provider-based sign-in.
      expect(result.error).toBe(
        "Password verification is not available for accounts signed in with a provider."
      );
    });
  });

  /**
   * Test suite for the core password comparison logic.
   */
  describe("password verification", () => {
    /**
     * Test case to verify success when the correct password is provided.
     */
    it("returns success when password matches", async () => {
      // Arrange: Create a standard user with the mock password.
      await setupUser();

      // Act: Invoke verification with the valid password string.
      const result = await verifyCurrentPassword({ currentPassword: mockPassword });

      // Assert: Verify the success response message.
      expect(result.success).toBe("Password verified successfully.");
    });

    /**
     * Test case to verify failure when an incorrect password is provided.
     */
    it("returns error when password does not match", async () => {
      // Arrange: Create a standard user.
      await setupUser();

      // Act: Invoke verification with a mismatched password string.
      const result = await verifyCurrentPassword({ currentPassword: "wrong-password" });

      // Assert: Verify the incorrect password error message.
      expect(result.error).toBe("Incorrect current password.");
    });
  });

  /**
   * Test suite for handling execution failures and exceptions.
   */
  describe("error handling", () => {
    /**
     * Test case to verify that unexpected errors during hashing or comparison are caught.
     */
    it("handles unexpected errors gracefully", async () => {
      // Arrange: Suppress console error logs for the test duration.
      vi.spyOn(console, "error").mockImplementation(() => {});

      // Arrange: Seed the user and force the bcrypt compare method to throw an exception.
      await setupUser();
      vi.spyOn(bcrypt, "compare").mockImplementationOnce(() => {
        throw new Error("Bcrypt Error");
      });

      // Act: Attempt verification to trigger the mocked exception.
      const result = await verifyCurrentPassword({ currentPassword: mockPassword });

      // Assert: Verify the generic fallback error message.
      expect(result.error).toBe("An unexpected error occurred. Please try again.");
    });
  });
});
