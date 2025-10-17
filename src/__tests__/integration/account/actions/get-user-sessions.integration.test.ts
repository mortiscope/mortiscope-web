import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { users, userSessions } from "@/db/schema";
import { getUserSessions } from "@/features/account/actions/get-user-sessions";

// Mock the crypto module to simulate decryption of session tokens.
vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn((value: string) => value),
}));

// Mock the session formatting utilities to provide consistent string outputs for tests.
vi.mock("@/features/account/utils/format-session", () => ({
  formatBrowser: vi.fn((name: string, version: string) => `${name} ${version}`.trim()),
  formatOperatingSystem: vi.fn((name: string, version: string) => `${name} ${version}`.trim()),
  formatDevice: vi.fn(() => "Desktop"),
  formatLocation: vi.fn(
    (city: string | null, region: string | null, country: string | null) =>
      [city, region, country].filter(Boolean).join(", ") || "Unknown"
  ),
  isSessionActive: vi.fn(() => true),
}));

/**
 * Integration test suite for `getUserSessions` server action.
 */
describe("getUserSessions (integration)", () => {
  // Store the created user object for reference in database operations.
  let testUser: typeof users.$inferSelect;

  /**
   * Sets up a fresh test user and clears mock state before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear mock history to ensure isolation between tests.
    vi.clearAllMocks();

    // Arrange: Create a unique test user in the `users` table.
    const uniqueId = Math.random().toString(36).substring(7);
    const email = `test-user-${uniqueId}@example.com`;

    const [user] = await db
      .insert(users)
      .values({
        email,
        name: `Test User ${uniqueId}`,
        emailVerified: new Date(),
      })
      .returning();

    testUser = user;
  });

  /**
   * Test case to verify that an empty list is returned when no sessions exist.
   */
  it("returns empty array for user with no sessions", async () => {
    // Act: Attempt to retrieve sessions for a user with no active session records.
    const result = await getUserSessions(testUser.id);

    // Assert: Confirm the result is an empty array.
    expect(result).toEqual([]);
  });

  /**
   * Test case to verify the correct retrieval and formatting of a single session.
   */
  it("returns single session for user with one active session", async () => {
    // Arrange: Define and insert a session record for the `testUser`.
    const sessionData = {
      userId: testUser.id,
      sessionToken: "test-session-token-123",
      browserName: "Chrome",
      browserVersion: "120.0",
      osName: "Windows",
      osVersion: "11",
      deviceType: "desktop",
      deviceVendor: null,
      deviceModel: null,
      userAgent: "Mozilla/5.0",
      city: "City 1",
      region: "Region 1",
      country: "Country 1",
      ipAddress: "127.0.0.1",
      isCurrentSession: true,
      lastActiveAt: new Date(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
    };

    await db.insert(userSessions).values(sessionData).returning();

    // Act: Invoke the action to retrieve all sessions for the user.
    const result = await getUserSessions(testUser.id);

    // Assert: Verify the session properties match the formatted input data.
    expect(result).toHaveLength(1);
    expect(result[0].browser).toBe("Chrome 120.0");
    expect(result[0].operatingSystem).toBe("Windows 11");
    expect(result[0].device).toBe("Desktop");
    expect(result[0].location).toBe("City 1, Region 1, Country 1");
    expect(result[0].ipAddress).toBe("127.0.0.1");
    expect(result[0].isCurrentSession).toBe(true);
    expect(result[0].sessionToken).toBe("test-session-token-123");
  });

  /**
   * Test case to verify that all session records are returned for a user with multiple sessions.
   */
  it("returns multiple sessions for user with multiple active sessions", async () => {
    // Arrange: Insert two distinct session records into the `userSessions` table.
    for (let i = 0; i < 2; i++) {
      await db
        .insert(userSessions)
        .values({
          userId: testUser.id,
          sessionToken: `session-token-${i}`,
          browserName: i === 0 ? "Chrome" : "Firefox",
          browserVersion: "120.0",
          osName: "Windows",
          osVersion: "11",
          deviceType: "desktop",
          deviceVendor: null,
          deviceModel: null,
          userAgent: "Mozilla/5.0",
          city: "City 1",
          region: "Region 1",
          country: "Country 1",
          ipAddress: `192.168.1.${i}`,
          isCurrentSession: i === 0,
          lastActiveAt: new Date(),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        })
        .returning();
    }

    // Act: Retrieve sessions for the user.
    const result = await getUserSessions(testUser.id);

    // Assert: Confirm both sessions are present and correctly identified.
    expect(result).toHaveLength(2);
    expect(result.some((s) => s.browser === "Chrome 120.0")).toBe(true);
    expect(result.some((s) => s.browser === "Firefox 120.0")).toBe(true);
  });

  /**
   * Test case to verify behavior when an unknown user identifier is provided.
   */
  it("returns empty array for non-existent user ID", async () => {
    // Act: Attempt to fetch sessions for a non-existent database identifier.
    const result = await getUserSessions("non-existent-user-id");

    // Assert: Confirm the result is an empty array.
    expect(result).toEqual([]);
  });

  /**
   * Test case to verify formatting fallbacks when optional session metadata is missing.
   */
  it("handles sessions with null optional fields", async () => {
    // Arrange: Insert a session record with `null` metadata fields.
    await db
      .insert(userSessions)
      .values({
        userId: testUser.id,
        sessionToken: "test-session-token-null",
        browserName: null,
        browserVersion: null,
        osName: null,
        osVersion: null,
        deviceType: null,
        deviceVendor: null,
        deviceModel: null,
        userAgent: "",
        city: null,
        region: null,
        country: null,
        ipAddress: "192.168.1.1",
        isCurrentSession: false,
        lastActiveAt: new Date(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      })
      .returning();

    // Act: Retrieve the session.
    const result = await getUserSessions(testUser.id);

    // Assert: Verify that formatters provide "Unknown" fallbacks for `null` values.
    expect(result).toHaveLength(1);
    expect(result[0].browser).toBe("Unknown Browser");
    expect(result[0].operatingSystem).toBe("Unknown OS");
    expect(result[0].location).toBe("Unknown");
  });

  /**
   * Test case to verify that system errors during processing throw a specific action error.
   */
  it("throws error when database query fails", async () => {
    // Arrange: Suppress console error output and force a failure in the decryption utility.
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { decrypt } = await import("@/lib/crypto");
    vi.mocked(decrypt).mockImplementationOnce(() => {
      throw new Error("Decryption failed");
    });

    // Arrange: Insert a record that will trigger the mocked failure.
    await db
      .insert(userSessions)
      .values({
        userId: testUser.id,
        sessionToken: "error-session",
        browserName: "Chrome",
        browserVersion: "120.0",
        osName: "Windows",
        osVersion: "11",
        deviceType: "desktop",
        deviceVendor: null,
        deviceModel: null,
        userAgent: "Mozilla/5.0",
        city: "City 1",
        region: "Region 1",
        country: "Country 1",
        ipAddress: "127.0.0.1",
        isCurrentSession: true,
        lastActiveAt: new Date(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      })
      .returning();

    // Act & Assert: Verify the action rejects with the standardized error message.
    await expect(getUserSessions(testUser.id)).rejects.toThrow("Failed to retrieve user sessions.");
  });

  /**
   * Test case to verify that non-Error throwables are correctly handled.
   */
  it("handles non-Error thrown values gracefully", async () => {
    // Arrange: Suppress console error output and force a string to be thrown.
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { decrypt } = await import("@/lib/crypto");
    vi.mocked(decrypt).mockImplementationOnce(() => {
      throw "String error instead of Error object";
    });

    // Arrange: Insert a session record.
    await db
      .insert(userSessions)
      .values({
        userId: testUser.id,
        sessionToken: "non-error-session",
        browserName: "Chrome",
        browserVersion: "120.0",
        osName: "Windows",
        osVersion: "11",
        deviceType: "desktop",
        deviceVendor: null,
        deviceModel: null,
        userAgent: "Mozilla/5.0",
        city: "City 1",
        region: "Region 1",
        country: "Country 1",
        ipAddress: "127.0.0.1",
        isCurrentSession: true,
        lastActiveAt: new Date(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      })
      .returning();

    // Act & Assert: Verify the action still rejects with the standardized error message.
    await expect(getUserSessions(testUser.id)).rejects.toThrow("Failed to retrieve user sessions.");
  });
});
