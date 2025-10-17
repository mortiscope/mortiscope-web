import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { twoFactorRecoveryCodes, users } from "@/db/schema";
import { regenerateRecoveryCodes } from "@/features/account/actions/regenerate-recovery-codes";
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

// Mock the two-factor utility functions to provide predictable recovery code generation.
vi.mock("@/lib/two-factor", () => ({
  generateRecoveryCodes: vi.fn(() =>
    Array.from({ length: 16 }, (_, i) => `CODE-${i.toString().padStart(2, "0")}`)
  ),
  hashRecoveryCode: vi.fn(async (code: string) => `hashed-${code}`),
  formatRecoveryCodesForDisplay: vi.fn((codes: string[]) =>
    codes.map((code) => ({ code, isUsed: false }))
  ),
}));

/**
 * Integration test suite for `regenerateRecoveryCodes` server action.
 */
describe("regenerateRecoveryCodes (integration)", () => {
  // Store the created user object for reference in database operations.
  let testUser: typeof users.$inferSelect;

  /**
   * Sets up a fresh test user and default mock configurations before each test case.
   */
  beforeEach(async () => {
    // Arrange: Clear all mock history and implementations.
    vi.clearAllMocks();

    // Arrange: Generate unique credentials and hash the password for a new user.
    const uniqueId = Math.random().toString(36).substring(7);
    const email = `test-user-${uniqueId}@example.com`;
    const hashedPassword = await bcrypt.hash("Password123!", 10);

    // Arrange: Insert the test user into the `users` table.
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

    // Arrange: Configure the authentication mock to return the active test user session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: user.id },
      expires: new Date().toISOString(),
    });
  });

  /**
   * Test case to verify that existing codes are replaced with a fresh set of recovery codes.
   */
  it("successfully regenerates recovery codes", async () => {
    // Arrange: Seed the `twoFactorRecoveryCodes` table with an existing code for the user.
    await db
      .insert(twoFactorRecoveryCodes)
      .values({
        userId: testUser.id,
        code: "old-code-1",
        used: false,
      })
      .returning();

    // Act: Invoke the server action to regenerate the codes.
    const result = await regenerateRecoveryCodes();

    // Assert: Verify the success message and that exactly 16 new codes are returned.
    expect(result.success).toBe("Recovery codes have been regenerated successfully.");
    expect(result.data).toBeDefined();
    expect(result.data?.recoveryCodes).toHaveLength(16);
  });

  /**
   * Test case to verify that the action works correctly even if the user has no existing codes.
   */
  it("regenerates codes for user with no existing codes", async () => {
    // Act: Attempt to regenerate codes when the `twoFactorRecoveryCodes` table is empty for the user.
    const result = await regenerateRecoveryCodes();

    // Assert: Verify that the process completes successfully and returns a new set of codes.
    expect(result.success).toBe("Recovery codes have been regenerated successfully.");
    expect(result.data).toBeDefined();
    expect(result.data?.recoveryCodes).toHaveLength(16);
  });

  /**
   * Test case to verify that the action fails when the user is not authenticated.
   */
  it("fails if unauthorized", async () => {
    // Arrange: Simulate an unauthenticated user session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to regenerate codes without an active session.
    const result = await regenerateRecoveryCodes();

    // Assert: Check for the unauthorized error response.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that sessions lacking a valid user identifier are rejected.
   */
  it("fails if session has no user ID", async () => {
    // Arrange: Simulate an invalid session object that lacks the `id` property.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: {},
      expires: new Date().toISOString(),
    });

    // Act: Attempt to regenerate codes with an incomplete session.
    const result = await regenerateRecoveryCodes();

    // Assert: Check for the unauthorized error response.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that the action fails when the rate limit for regeneration is hit.
   */
  it("fails if rate limit exceeded", async () => {
    // Arrange: Mock the rate limiter to report that the limit has been reached.
    vi.mocked(privateActionLimiter.limit).mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset: Date.now(),
      pending: Promise.resolve(),
    });

    // Act: Attempt to regenerate codes while rate limited.
    const result = await regenerateRecoveryCodes();

    // Assert: Verify the specific rate limit error message is returned.
    expect(result).toEqual({
      error: "You are regenerating recovery codes too frequently. Please try again later.",
    });
  });

  /**
   * Test case to verify that internal server errors are caught and masked.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Suppress console error output for this test case.
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Arrange: Force a database error when attempting to delete existing recovery codes.
    const dbModule = await import("@/db");
    vi.spyOn(dbModule.db, "delete").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    // Act: Attempt to regenerate codes triggering the database failure.
    const result = await regenerateRecoveryCodes();

    // Assert: Verify the standardized failure error message is returned.
    expect(result).toEqual({ error: "Failed to regenerate recovery codes." });
  });
});
