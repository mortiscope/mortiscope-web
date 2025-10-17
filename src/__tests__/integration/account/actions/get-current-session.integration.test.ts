import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { users, userSessions } from "@/db/schema";
import { getCurrentSession } from "@/features/account/actions/get-current-session";

// Mock the crypto module to bypass encryption logic during testing.
vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn((value: string) => value),
}));

// Mock session utility functions to control the formatting of session metadata.
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
 * Integration test suite for the `getCurrentSession` server action.
 */
describe("getCurrentSession (integration)", () => {
  // Store the created user object for reference in database operations.
  let testUser: typeof users.$inferSelect;

  /**
   * Sets up a fresh test user and clears mock history before each test case.
   */
  beforeEach(async () => {
    // Arrange: Reset mock call counts and implementations.
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
   * Test case to verify successful retrieval and formatting of an active session.
   */
  it("returns the current session for a user with an active session", async () => {
    // Arrange: Define and insert a valid session record into the `userSessions` table.
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

    // Act: Invoke the action to retrieve the session for the `testUser`.
    const result = await getCurrentSession(testUser.id);

    // Assert: Verify that the returned object matches the formatted input data.
    expect(result).not.toBeNull();
    expect(result?.browser).toBe("Chrome 120.0");
    expect(result?.operatingSystem).toBe("Windows 11");
    expect(result?.device).toBe("Desktop");
    expect(result?.location).toBe("City 1, Region 1, Country 1");
    expect(result?.ipAddress).toBe("127.0.0.1");
    expect(result?.isCurrentSession).toBe(true);
    expect(result?.sessionToken).toBe("test-session-token-123");
  });

  /**
   * Test case to verify that `null` is returned if the user has no database records.
   */
  it("returns null when user has no sessions", async () => {
    // Act: Attempt to fetch a session for a user with no entries in `userSessions`.
    const result = await getCurrentSession(testUser.id);

    // Assert: Confirm the result is `null`.
    expect(result).toBeNull();
  });

  /**
   * Test case to verify handling of identifiers that do not exist in the system.
   */
  it("returns null for non-existent user ID", async () => {
    // Act: Attempt to fetch a session using an invalid identifier string.
    const result = await getCurrentSession("non-existent-user-id");

    // Assert: Confirm the result is `null`.
    expect(result).toBeNull();
  });

  /**
   * Test case to verify that the formatter handles sessions missing specific metadata.
   */
  it("returns session with unknown values when optional fields are null", async () => {
    // Arrange: Create a session record with `null` values for optional metadata fields.
    const sessionData = {
      userId: testUser.id,
      sessionToken: "test-session-token-456",
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
    };

    await db.insert(userSessions).values(sessionData).returning();

    // Act: Attempt to retrieve the minimal session data.
    const result = await getCurrentSession(testUser.id);

    // Assert: Verify that formatters provide fallback strings for `null` inputs.
    expect(result).not.toBeNull();
    expect(result?.browser).toBe("Unknown Browser");
    expect(result?.operatingSystem).toBe("Unknown OS");
    expect(result?.location).toBe("Unknown");
  });

  /**
   * Test case to verify behavior when an empty string is provided as a user ID.
   */
  it("returns null when user has no sessions (edge case)", async () => {
    // Act: Invoke the action with an empty string.
    const result = await getCurrentSession("");

    // Assert: Confirm the result is `null`.
    expect(result).toBeNull();
  });

  /**
   * Test case to verify that decryption failures result in a safe `null` return.
   */
  it("handles errors gracefully and returns null", async () => {
    // Arrange: Insert a valid session that will trigger an error during processing.
    const sessionData = {
      userId: testUser.id,
      sessionToken: "test-session-token-error",
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

    // Arrange: Force the `decrypt` function to throw an exception.
    const { decrypt } = await import("@/lib/crypto");
    vi.mocked(decrypt).mockImplementationOnce(() => {
      throw new Error("Decryption failed");
    });

    // Act: Attempt to retrieve the session triggering the error.
    const result = await getCurrentSession(testUser.id);

    // Assert: Confirm the catch block handles the error and returns `null`.
    expect(result).toBeNull();
  });
});
