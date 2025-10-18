import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { sessions, users, userSessions } from "@/db/schema";
import {
  revokeAllSessions,
  revokeAllUserSessions,
} from "@/features/account/actions/revoke-all-sessions";
import { revokeSessionsInRedis } from "@/lib/redis-session";

// Mock the Redis session module to prevent actual cache operations during integration tests.
vi.mock("@/lib/redis-session", () => ({
  revokeSessionsInRedis: vi.fn(),
}));

/**
 * Integration test suite for `revokeAllSessions` server action.
 */
describe("revokeAllSessions (integration)", () => {
  // Store the created user object for reference in database operations.
  let testUser: typeof users.$inferSelect;

  /**
   * Sets up a fresh test user and default mock configurations before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear all mock history and implementations.
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

    // Arrange: Configure the Redis revocation mock to resolve successfully by default.
    vi.mocked(revokeSessionsInRedis).mockResolvedValue(true);
  });

  /**
   * Test case to verify behavior when attempting to revoke sessions for a user with no activity.
   */
  it("returns success with 0 revoked sessions when user has no sessions", async () => {
    // Act: Invoke the revocation action for a user without session records.
    const result = await revokeAllSessions(testUser.id);

    // Assert: Verify that the success flag is true and the count is zero.
    expect(result).toEqual({ success: true, revokedCount: 0 });
  });

  /**
   * Test case to verify that all session records across different tables are removed.
   */
  it("revokes all sessions for a user", async () => {
    // Arrange: Insert a record into the `userSessions` table.
    await db
      .insert(userSessions)
      .values({
        userId: testUser.id,
        sessionToken: "session-token-1",
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

    // Arrange: Insert the corresponding Auth.js record into the `sessions` table.
    await db
      .insert(sessions)
      .values({
        sessionToken: "session-token-1",
        userId: testUser.id,
        expires: new Date(Date.now() + 86400000),
      })
      .returning();

    // Act: Execute the revocation action for the user.
    const result = await revokeAllSessions(testUser.id);

    // Assert: Confirm the action reported success and revoked one session.
    expect(result.success).toBe(true);
    expect(result.revokedCount).toBe(1);
  });

  /**
   * Test case to verify that the active session is excluded from revocation when specified.
   */
  it("preserves current session when currentSessionToken is provided", async () => {
    // Arrange: Seed two distinct session records for the user.
    await db
      .insert(userSessions)
      .values({
        userId: testUser.id,
        sessionToken: "current-session",
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

    await db
      .insert(userSessions)
      .values({
        userId: testUser.id,
        sessionToken: "other-session",
        browserName: "Firefox",
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
        ipAddress: "127.0.0.2",
        isCurrentSession: false,
        lastActiveAt: new Date(),
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
      })
      .returning();

    // Act: Revoke all sessions except the one identified as `current-session`.
    const result = await revokeAllSessions(testUser.id, "current-session");

    // Assert: Confirm success and that only the non-current session was revoked.
    expect(result.success).toBe(true);
    expect(result.revokedCount).toBe(1);
  });

  /**
   * Test case to verify counts when the only existing session is the one being preserved.
   */
  it("returns 0 when only current session exists and is preserved", async () => {
    // Arrange: Insert a single session record.
    await db
      .insert(userSessions)
      .values({
        userId: testUser.id,
        sessionToken: "only-session",
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

    // Act: Attempt to revoke all sessions while preserving the only active one.
    const result = await revokeAllSessions(testUser.id, "only-session");

    // Assert: Verify that no sessions were revoked.
    expect(result).toEqual({ success: true, revokedCount: 0 });
  });

  /**
   * Test case to verify the functionality of the public wrapper function.
   */
  it("revokeAllUserSessions wrapper works correctly", async () => {
    // Act: Invoke the wrapper function.
    const result = await revokeAllUserSessions(testUser.id);

    // Assert: Confirm the wrapper returns the expected success structure.
    expect(result).toEqual({ success: true, revokedCount: 0 });
  });

  /**
   * Test case to verify that internal database errors are caught and masked.
   */
  it("handles errors gracefully", async () => {
    // Arrange: Suppress console error output and force a selection error in the database.
    vi.spyOn(console, "error").mockImplementation(() => {});

    const dbModule = await import("@/db");
    vi.spyOn(dbModule.db, "select").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    // Act: Attempt to revoke sessions during a database failure.
    const result = await revokeAllSessions(testUser.id);

    // Assert: Verify the standardized error response.
    expect(result).toEqual({ success: false, error: "Failed to revoke sessions" });
  });

  /**
   * Test case to verify that JWT blacklist failures are logged but do not stop the process.
   */
  it("logs error when JWT blacklist insert fails with non-duplicate error", async () => {
    // Arrange: Setup a spy on the console and insert test session records.
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await db
      .insert(userSessions)
      .values({
        userId: testUser.id,
        sessionToken: "jwt-error-session",
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

    await db
      .insert(sessions)
      .values({
        sessionToken: "jwt-error-session",
        userId: testUser.id,
        expires: new Date(Date.now() + 86400000),
      })
      .returning();

    // Arrange: Force a connection timeout error during the token blacklisting insert.
    const dbModule = await import("@/db");
    const originalInsert = dbModule.db.insert;
    let insertCallCount = 0;
    vi.spyOn(dbModule.db, "insert").mockImplementation((table) => {
      insertCallCount++;
      if (insertCallCount === 1) {
        return {
          values: () => {
            throw new Error("Connection timeout error");
          },
        } as unknown as ReturnType<typeof originalInsert>;
      }
      return originalInsert(table);
    });

    // Act: Attempt to revoke the sessions.
    const result = await revokeAllSessions(testUser.id);

    // Assert: Verify that revocation succeeded despite the non-critical logging error.
    expect(result.success).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to blacklist individual JWT token:",
      expect.any(Error)
    );
  });

  /**
   * Test case to verify that Redis communication errors are logged without failing the action.
   */
  it("logs error when Redis revocation fails", async () => {
    // Arrange: Setup session records and mock a Redis connection failure.
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await db
      .insert(userSessions)
      .values({
        userId: testUser.id,
        sessionToken: "redis-error-session",
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

    await db
      .insert(sessions)
      .values({
        sessionToken: "redis-error-session",
        userId: testUser.id,
        expires: new Date(Date.now() + 86400000),
      })
      .returning();

    vi.mocked(revokeSessionsInRedis).mockRejectedValueOnce(new Error("Redis connection error"));

    // Act: Attempt to revoke the sessions.
    const result = await revokeAllSessions(testUser.id);

    // Assert: Verify that the main database revocation completed successfully.
    expect(result.success).toBe(true);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to add revoked sessions to Redis:",
      expect.any(Error)
    );
  });

  /**
   * Test case to verify that unexpected non-Error objects thrown during inserts are handled.
   */
  it("handles non-Error exceptions during blacklist insert gracefully", async () => {
    // Arrange: Setup sessions and force an unexpected string-based exception.
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await db
      .insert(userSessions)
      .values({
        userId: testUser.id,
        sessionToken: "iterator-error-session",
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

    await db
      .insert(sessions)
      .values({
        sessionToken: "iterator-error-session",
        userId: testUser.id,
        expires: new Date(Date.now() + 86400000),
      })
      .returning();

    const dbModule = await import("@/db");
    const originalInsert = dbModule.db.insert;
    let insertCallCount = 0;

    vi.spyOn(dbModule.db, "insert").mockImplementation((table) => {
      insertCallCount++;
      if (insertCallCount === 1) {
        throw "Unexpected non-Error exception";
      }
      return originalInsert(table);
    });

    // Act: Execute the revocation.
    const result = await revokeAllSessions(testUser.id);

    // Clean up the manual mock.
    dbModule.db.insert = originalInsert;

    // Assert: Confirm that the process did not log a specific JWT error for non-Error types.
    expect(result.success).toBe(true);
    expect(consoleErrorSpy).not.toHaveBeenCalledWith(
      "Failed to blacklist individual JWT token:",
      expect.anything()
    );
  });

  /**
   * Test case to verify that duplicate key violations in the blacklist are ignored.
   */
  it("ignores duplicate key errors during JWT blacklist insert", async () => {
    // Arrange: Create session records and force a duplicate key constraint violation.
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await db
      .insert(userSessions)
      .values({
        userId: testUser.id,
        sessionToken: "duplicate-token",
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

    await db
      .insert(sessions)
      .values({
        sessionToken: "duplicate-token",
        userId: testUser.id,
        expires: new Date(Date.now() + 86400000),
      })
      .returning();

    const dbModule = await import("@/db");
    const originalInsert = dbModule.db.insert;

    vi.spyOn(dbModule.db, "insert").mockImplementation(() => {
      return {
        values: () => {
          throw new Error("duplicate key value violates unique constraint");
        },
      } as unknown as ReturnType<typeof dbModule.db.insert>;
    });

    // Act: Attempt revocation.
    const result = await revokeAllSessions(testUser.id);

    // Clean up the manual mock.
    dbModule.db.insert = originalInsert;

    // Assert: Confirm that duplicate errors do not trigger console logs or failures.
    expect(result.success).toBe(true);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that general unique constraint violations are ignored in the blacklist.
   */
  it("ignores unique key errors during JWT blacklist insert", async () => {
    // Arrange: Setup sessions and force a unique constraint error without the 'duplicate' keyword.
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await db
      .insert(userSessions)
      .values({
        userId: testUser.id,
        sessionToken: "unique-error-token",
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

    await db
      .insert(sessions)
      .values({
        sessionToken: "unique-error-token",
        userId: testUser.id,
        expires: new Date(Date.now() + 86400000),
      })
      .returning();

    const dbModule = await import("@/db");
    const originalInsert = dbModule.db.insert;

    vi.spyOn(dbModule.db, "insert").mockImplementation(() => {
      return {
        values: () => {
          throw new Error("violates unique constraint but not duplicate keyword");
        },
      } as unknown as ReturnType<typeof dbModule.db.insert>;
    });

    // Act: Attempt revocation.
    const result = await revokeAllSessions(testUser.id);

    // Clean up the manual mock.
    dbModule.db.insert = originalInsert;

    // Assert: Confirm that unique constraint errors are silently ignored.
    expect(result.success).toBe(true);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that orphan metadata sessions are correctly cleaned up.
   */
  it("handles case where userSessions exist but actual sessions (Auth.js) are missing", async () => {
    // Arrange: Insert a record into `userSessions` without a matching entry in `sessions`.
    await db
      .insert(userSessions)
      .values({
        userId: testUser.id,
        sessionToken: "orphan-session",
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

    // Act: Revoke all sessions for the user.
    const result = await revokeAllSessions(testUser.id);

    // Assert: Verify that the orphan session was included in the revocation count.
    expect(result.success).toBe(true);
    expect(result.revokedCount).toBe(1);
  });
});
