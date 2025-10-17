import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { users, userTwoFactor } from "@/db/schema";
import { getTwoFactorStatus } from "@/features/account/actions/get-two-factor-status";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

/**
 * Integration test suite for `getTwoFactorStatus` server action.
 */
describe("getTwoFactorStatus (integration)", () => {
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

    // Arrange: Configure the authentication mock to return the active test user session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: user.id },
      expires: new Date().toISOString(),
    });
  });

  /**
   * Test case to verify the default status when no 2FA record exists in the database.
   */
  it("returns 2FA disabled status for user without 2FA setup", async () => {
    // Act: Invoke the server action to fetch 2FA status.
    const result = await getTwoFactorStatus();

    // Assert: Verify that the response indicates 2FA is not enabled.
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.enabled).toBe(false);
    expect(result.data?.backupCodesGenerated).toBe(false);
    expect(result.data?.enabledAt).toBeNull();
  });

  /**
   * Test case to verify status retrieval when 2FA is fully configured and enabled.
   */
  it("returns 2FA enabled status for user with 2FA enabled", async () => {
    // Arrange: Define a timestamp and insert an active 2FA record into the `userTwoFactor` table.
    const createdAt = new Date();

    await db
      .insert(userTwoFactor)
      .values({
        userId: testUser.id,
        secret: "test-secret",
        enabled: true,
        backupCodesGenerated: true,
        createdAt,
      })
      .returning();

    // Act: Invoke the server action to fetch the updated status.
    const result = await getTwoFactorStatus();

    // Assert: Verify that the response data matches the inserted 2FA configuration.
    expect(result.success).toBe(true);
    expect(result.data?.enabled).toBe(true);
    expect(result.data?.backupCodesGenerated).toBe(true);
    expect(result.data?.enabledAt).toEqual(createdAt);
  });

  /**
   * Test case to verify that an existing but disabled 2FA record returns a disabled status.
   */
  it("returns 2FA disabled status when 2FA record exists but is disabled", async () => {
    // Arrange: Insert a record into the `userTwoFactor` table where the `enabled` flag is false.
    await db
      .insert(userTwoFactor)
      .values({
        userId: testUser.id,
        secret: "test-secret",
        enabled: false,
        backupCodesGenerated: false,
      })
      .returning();

    // Act: Invoke the server action to fetch the status.
    const result = await getTwoFactorStatus();

    // Assert: Confirm that the reported status is disabled despite the existence of a row.
    expect(result.success).toBe(true);
    expect(result.data?.enabled).toBe(false);
    expect(result.data?.backupCodesGenerated).toBe(false);
  });

  /**
   * Test case to verify that the action fails when the request is unauthenticated.
   */
  it("fails if unauthorized", async () => {
    // Arrange: Simulate a missing session by returning null from the auth mock.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to fetch status without an active session.
    const result = await getTwoFactorStatus();

    // Assert: Check for the unauthorized error response.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that sessions without a valid user identifier are rejected.
   */
  it("fails if session has no user ID", async () => {
    // Arrange: Simulate an invalid session that lacks a user `id`.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: {},
      expires: new Date().toISOString(),
    });

    // Act: Attempt to fetch status with an incomplete session.
    const result = await getTwoFactorStatus();

    // Assert: Check for the unauthorized error response.
    expect(result).toEqual({ error: "Unauthorized." });
  });

  /**
   * Test case to verify that unexpected database errors are handled without crashing.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Suppress console error logging for the duration of this test.
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Arrange: Force a failure when querying the `userTwoFactor` table.
    const dbModule = await import("@/db");
    vi.spyOn(dbModule.db.query.userTwoFactor, "findFirst").mockRejectedValueOnce(
      new Error("Database error")
    );

    // Act: Attempt to fetch status triggering the mocked error.
    const result = await getTwoFactorStatus();

    // Assert: Verify the generic failure error message is returned.
    expect(result).toEqual({ error: "Failed to get two-factor authentication status." });
  });
});
