import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { users, userTwoFactor } from "@/db/schema";
import { getAccountSecurity } from "@/features/account/actions/get-account-security";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

/**
 * Integration test suite for the `getAccountSecurity` server action.
 */
describe("getAccountSecurity (integration)", () => {
  // Store the created user object for reference in tests.
  let testUser: typeof users.$inferSelect;

  /**
   * Sets up a fresh test user and default mock configurations before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear all mock history and implementations.
    vi.clearAllMocks();

    // Arrange: Generate unique credentials and hash the password.
    const uniqueId = Math.random().toString(36).substring(7);
    const email = `test-user-${uniqueId}@example.com`;
    const hashedPassword = await bcrypt.hash("Password123!", 10);

    // Arrange: Insert a standard user into the database to act as the test subject.
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

    // Arrange: Configure auth to return the authenticated test user session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: user.id },
      expires: new Date().toISOString(),
    });
  });

  /**
   * Test case to verify security data retrieval when no two-factor authentication is configured.
   */
  it("returns security data for user without 2FA", async () => {
    // Act: Invoke the server action to fetch security status.
    const result = await getAccountSecurity();

    // Assert: Verify that the success response correctly indicates that 2FA is not enabled.
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe(testUser.id);
    expect(result.data?.email).toBe(testUser.email);
    expect(result.data?.twoFactorEnabled).toBe(false);
  });

  /**
   * Test case to verify security data retrieval when two-factor authentication is active.
   */
  it("returns security data for user with 2FA enabled", async () => {
    // Arrange: Insert an enabled 2FA record for the user in the `userTwoFactor` table.
    await db
      .insert(userTwoFactor)
      .values({
        userId: testUser.id,
        secret: "test-secret",
        enabled: true,
      })
      .returning();

    // Act: Invoke the server action to fetch security status.
    const result = await getAccountSecurity();

    // Assert: Verify that the success response correctly indicates that 2FA is enabled.
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe(testUser.id);
    expect(result.data?.email).toBe(testUser.email);
    expect(result.data?.twoFactorEnabled).toBe(true);
  });

  /**
   * Test case to verify that an inactive 2FA record results in a disabled status.
   */
  it("returns twoFactorEnabled false when 2FA record exists but is disabled", async () => {
    // Arrange: Insert a 2FA record where the `enabled` flag is set to false.
    await db
      .insert(userTwoFactor)
      .values({
        userId: testUser.id,
        secret: "test-secret",
        enabled: false,
      })
      .returning();

    // Act: Invoke the server action to fetch security status.
    const result = await getAccountSecurity();

    // Assert: Verify that the `twoFactorEnabled` property is returned as false.
    expect(result.success).toBe(true);
    expect(result.data?.twoFactorEnabled).toBe(false);
  });

  /**
   * Test case to verify that the action fails when no session is present.
   */
  it("fails if not authenticated", async () => {
    // Arrange: Simulate an unauthenticated user session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to fetch security data without a session.
    const result = await getAccountSecurity();

    // Assert: Check for the authentication error response.
    expect(result).toEqual({
      success: false,
      error: "Not authenticated",
      data: null,
    });
  });

  /**
   * Test case to verify that a session lacking a user identifier is rejected.
   */
  it("fails if session has no user ID", async () => {
    // Arrange: Simulate a session object that does not contain a user `id`.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: {},
      expires: new Date().toISOString(),
    });

    // Act: Attempt to fetch security data with an invalid session.
    const result = await getAccountSecurity();

    // Assert: Check for the authentication error response.
    expect(result).toEqual({
      success: false,
      error: "Not authenticated",
      data: null,
    });
  });

  /**
   * Test case to verify that the action handles valid sessions for missing database records.
   */
  it("fails if user not found in database", async () => {
    // Arrange: Mock a session for a user ID that does not exist in the `users` table.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: "non-existent-user-id" },
      expires: new Date().toISOString(),
    });

    // Act: Attempt to fetch security data for a non-existent user.
    const result = await getAccountSecurity();

    // Assert: Verify the user not found error response.
    expect(result).toEqual({
      success: false,
      error: "User not found",
      data: null,
    });
  });

  /**
   * Test case to verify that unexpected system errors are caught and masked.
   */
  it("handles unexpected errors gracefully", async () => {
    // Arrange: Suppress console error output and force the auth service to throw an error.
    vi.spyOn(console, "error").mockImplementation(() => {});
    (vi.mocked(auth) as unknown as Mock).mockRejectedValueOnce(new Error("Auth service error"));

    // Act: Attempt to fetch security data during a service failure.
    const result = await getAccountSecurity();

    // Assert: Verify the generic failure response.
    expect(result).toEqual({
      success: false,
      error: "Failed to fetch security data",
      data: null,
    });
  });
});
