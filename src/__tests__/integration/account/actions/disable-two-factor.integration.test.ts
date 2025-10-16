import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { twoFactorRecoveryCodes, users, userTwoFactor } from "@/db/schema";
import { disableTwoFactor } from "@/features/account/actions/disable-two-factor";
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
 * Integration test suite for the `disableTwoFactor` server action.
 */
describe("disableTwoFactor (integration)", () => {
  // Define a constant password for hashing and verification.
  const mockPassword = "SecurePassword123!";
  // Store the created user object for reference in tests.
  let testUser: typeof users.$inferSelect;

  /**
   * Sets up a fresh test user and default mock configurations before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear all mock history and implementations.
    vi.clearAllMocks();

    // Arrange: Hash the password and create a unique user in the database.
    const hashedPassword = await bcrypt.hash(mockPassword, 10);
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
   * Test case to verify that 2FA and recovery codes are removed upon successful disablement.
   */
  it("successfully disables two-factor authentication", async () => {
    // Arrange: Insert active 2FA record and recovery codes for the user.
    await db
      .insert(userTwoFactor)
      .values({
        userId: testUser.id,
        secret: "test-secret",
        enabled: true,
      })
      .returning();

    await db
      .insert(twoFactorRecoveryCodes)
      .values({
        userId: testUser.id,
        code: "RECOVERY1",
        used: false,
      })
      .returning();

    // Act: Attempt to disable 2FA using the correct password.
    const result = await disableTwoFactor({
      currentPassword: mockPassword,
    });

    // Assert: Verify the success message is returned.
    expect(result).toEqual({
      success: "Two-factor authentication has been disabled successfully.",
    });

    // Assert: Confirm the 2FA record has been removed from the `userTwoFactor` table.
    const [remainingTwoFactor] = await db
      .select()
      .from(userTwoFactor)
      .where(eq(userTwoFactor.userId, testUser.id));
    expect(remainingTwoFactor).toBeUndefined();

    // Assert: Confirm the recovery codes have been removed from the `twoFactorRecoveryCodes` table.
    const [remainingRecoveryCode] = await db
      .select()
      .from(twoFactorRecoveryCodes)
      .where(eq(twoFactorRecoveryCodes.userId, testUser.id));
    expect(remainingRecoveryCode).toBeUndefined();
  });

  /**
   * Test case to verify that the action fails when the user is not authenticated.
   */
  it("fails if unauthorized", async () => {
    // Arrange: Simulate an unauthenticated session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to disable 2FA without an active session.
    const result = await disableTwoFactor({
      currentPassword: mockPassword,
    });

    // Assert: Check for the unauthorized error response.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that the action fails when the rate limit is exceeded.
   */
  it("fails if rate limit exceeded", async () => {
    // Arrange: Mock the rate limiter to reject the request.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Act: Attempt to disable 2FA when the rate limit is hit.
    const result = await disableTwoFactor({
      currentPassword: mockPassword,
    });

    // Assert: Check for the rate limit error response.
    expect(result).toEqual({ error: "You are making too many requests." });
  });

  /**
   * Test case to verify validation fails when the password field is empty.
   */
  it("fails if password is empty", async () => {
    // Act: Attempt to disable 2FA with an empty password string.
    const result = await disableTwoFactor({
      currentPassword: "",
    });

    // Assert: Check for the validation error message.
    expect(result).toEqual({ error: "Current password is required." });
  });

  /**
   * Test case to verify validation fails when the password consists only of whitespace.
   */
  it("fails if password is whitespace only", async () => {
    // Act: Attempt to disable 2FA with a whitespace-only password string.
    const result = await disableTwoFactor({
      currentPassword: "   ",
    });

    // Assert: Check for the validation error message.
    expect(result).toEqual({ error: "Current password is required." });
  });

  /**
   * Test case to verify failure for OAuth users who do not have a local password set.
   */
  it("fails for OAuth users (no password)", async () => {
    // Arrange: Create a user without a password to simulate OAuth registration.
    const uniqueId = Math.random().toString(36).substring(7);
    const [oauthUser] = await db
      .insert(users)
      .values({
        email: `oauth-${uniqueId}@example.com`,
        name: `OAuth User ${uniqueId}`,
        emailVerified: new Date(),
      })
      .returning();

    // Arrange: Simulate the OAuth user session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: oauthUser.id },
      expires: new Date().toISOString(),
    });

    // Act: Attempt to disable 2FA for the OAuth user.
    const result = await disableTwoFactor({
      currentPassword: mockPassword,
    });

    // Assert: Check that the user is treated as having no password set.
    expect(result).toEqual({ error: "User not found or password not set." });
  });

  /**
   * Test case to verify failure when an incorrect password is provided.
   */
  it("fails if password is incorrect", async () => {
    // Act: Attempt to disable 2FA using a mismatching password.
    const result = await disableTwoFactor({
      currentPassword: "WrongPassword123!",
    });

    // Assert: Check for the invalid password error response.
    expect(result).toEqual({ error: "Invalid password." });
  });

  /**
   * Test case to verify failure when 2FA is not currently enabled for the user.
   */
  it("fails if 2FA is not enabled", async () => {
    // Act: Attempt to disable 2FA when no record exists in the `userTwoFactor` table.
    const result = await disableTwoFactor({
      currentPassword: mockPassword,
    });

    // Assert: Check for the error indicating 2FA is not enabled.
    expect(result).toEqual({
      error: "Two-factor authentication is not enabled for this account.",
    });
  });

  /**
   * Test case to verify failure when a 2FA record exists but is marked as disabled.
   */
  it("fails if 2FA exists but is disabled", async () => {
    // Arrange: Insert a 2FA record for the user where the `enabled` flag is false.
    await db
      .insert(userTwoFactor)
      .values({
        userId: testUser.id,
        secret: "test-secret",
        enabled: false,
      })
      .returning();

    // Act: Attempt to disable 2FA for the user.
    const result = await disableTwoFactor({
      currentPassword: mockPassword,
    });

    // Assert: Check for the error indicating 2FA is not active.
    expect(result).toEqual({
      error: "Two-factor authentication is not enabled for this account.",
    });
  });

  /**
   * Test case to verify that unexpected errors are caught and handled gracefully.
   */
  it("handles unexpected errors", async () => {
    // Arrange: Suppress console error output for this test case.
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Arrange: Force a database error during user retrieval by mocking the data layer.
    const userModule = await import("@/data/user");
    vi.spyOn(userModule, "getUserById").mockRejectedValueOnce(new Error("Unexpected DB Error"));

    // Act: Attempt to disable 2FA triggering the mocked error.
    const result = await disableTwoFactor({
      currentPassword: mockPassword,
    });

    // Assert: Check for the generic fallback error message.
    expect(result).toEqual({ error: "Failed to disable two-factor authentication." });
  });
});
