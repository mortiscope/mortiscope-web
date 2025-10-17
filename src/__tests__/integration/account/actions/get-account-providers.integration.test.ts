import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import { getAccountProviders } from "@/features/account/actions/get-account-providers";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

/**
 * Integration test suite for the `getAccountProviders` server action.
 */
describe("getAccountProviders (integration)", () => {
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

    // Arrange: Insert a standard user with a password into the database.
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
   * Test case to verify that a user with only a password shows no social providers.
   */
  it("returns providers for user with password only (no social providers)", async () => {
    // Act: Invoke the server action to fetch providers.
    const result = await getAccountProviders();

    // Assert: Verify that password status is true and the social provider list is empty.
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
    expect(result.data?.hasPassword).toBe(true);
    expect(result.data?.hasSocialProviders).toBe(false);
    expect(result.data?.providers).toEqual([]);
  });

  /**
   * Test case to verify that a linked Google account is correctly identified.
   */
  it("returns providers for user with Google account linked", async () => {
    // Arrange: Link a Google OAuth account to the current test user in the `accounts` table.
    await db
      .insert(accounts)
      .values({
        userId: testUser.id,
        type: "oauth",
        provider: "google",
        providerAccountId: "google-123",
      })
      .returning();

    // Act: Invoke the server action to fetch providers.
    const result = await getAccountProviders();

    // Assert: Verify that both password and Google provider are reported.
    expect(result.success).toBe(true);
    expect(result.error).toBeNull();
    expect(result.data).toBeDefined();
    expect(result.data?.hasPassword).toBe(true);
    expect(result.data?.hasSocialProviders).toBe(true);
    expect(result.data?.providers).toContain("google");
  });

  /**
   * Test case to verify that multiple social provider links are correctly aggregated.
   */
  it("returns providers for user with multiple social accounts", async () => {
    // Arrange: Link both Google and Microsoft accounts to the test user.
    await db
      .insert(accounts)
      .values({
        userId: testUser.id,
        type: "oauth",
        provider: "google",
        providerAccountId: "google-123",
      })
      .returning();

    await db
      .insert(accounts)
      .values({
        userId: testUser.id,
        type: "oauth",
        provider: "microsoft-entra-id",
        providerAccountId: "ms-456",
      })
      .returning();

    // Act: Invoke the server action to fetch providers.
    const result = await getAccountProviders();

    // Assert: Verify that the `providers` array contains both linked accounts.
    expect(result.success).toBe(true);
    expect(result.data?.hasSocialProviders).toBe(true);
    expect(result.data?.providers).toContain("google");
    expect(result.data?.providers).toContain("microsoft-entra-id");
    expect(result.data?.providers).toHaveLength(2);
  });

  /**
   * Test case to verify that accounts without a local password report the correct flags.
   */
  it("returns hasPassword false for OAuth-only user", async () => {
    // Arrange: Create a user without a password to simulate an account created via OAuth.
    const uniqueId = Math.random().toString(36).substring(7);
    const [oauthUser] = await db
      .insert(users)
      .values({
        email: `oauth-${uniqueId}@example.com`,
        name: `OAuth User ${uniqueId}`,
        password: null,
        emailVerified: new Date(),
      })
      .returning();

    // Arrange: Insert the corresponding entry into the `accounts` table.
    await db
      .insert(accounts)
      .values({
        userId: oauthUser.id,
        type: "oauth",
        provider: "google",
        providerAccountId: "google-oauth-123",
      })
      .returning();

    // Arrange: Simulate the session for the passwordless user.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: oauthUser.id },
      expires: new Date().toISOString(),
    });

    // Act: Invoke the server action to fetch providers.
    const result = await getAccountProviders();

    // Assert: Verify that `hasPassword` is false and social provider data is correct.
    expect(result.success).toBe(true);
    expect(result.data?.hasPassword).toBe(false);
    expect(result.data?.hasSocialProviders).toBe(true);
    expect(result.data?.providers).toContain("google");
  });

  /**
   * Test case to verify that the action fails when no session is present.
   */
  it("fails if not authenticated", async () => {
    // Arrange: Simulate a missing authentication session.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue(null);

    // Act: Attempt to fetch providers without a session.
    const result = await getAccountProviders();

    // Assert: Check for the authentication error response.
    expect(result).toEqual({
      success: false,
      error: "User not authenticated",
      data: null,
    });
  });

  /**
   * Test case to verify that a session missing a user ID is rejected.
   */
  it("fails if session has no user ID", async () => {
    // Arrange: Simulate a session object that lacks the `id` property.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: {},
      expires: new Date().toISOString(),
    });

    // Act: Attempt to fetch providers with an invalid session.
    const result = await getAccountProviders();

    // Assert: Check for the authentication error response.
    expect(result).toEqual({
      success: false,
      error: "User not authenticated",
      data: null,
    });
  });

  /**
   * Test case to verify that the action handles sessions referencing non-existent users.
   */
  it("fails if user not found in database", async () => {
    // Arrange: Mock a valid session for an ID that does not exist in the `users` table.
    (vi.mocked(auth) as unknown as Mock).mockResolvedValue({
      user: { id: "non-existent-user-id" },
      expires: new Date().toISOString(),
    });

    // Act: Attempt to fetch providers for a non-existent user.
    const result = await getAccountProviders();

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
    // Arrange: Suppress console error logging and force the auth service to throw an error.
    vi.spyOn(console, "error").mockImplementation(() => {});
    (vi.mocked(auth) as unknown as Mock).mockRejectedValueOnce(new Error("Auth service error"));

    // Act: Attempt to fetch providers during a service failure.
    const result = await getAccountProviders();

    // Assert: Verify the generic failure response.
    expect(result).toEqual({
      success: false,
      error: "Failed to fetch account providers",
      data: null,
    });
  });
});
