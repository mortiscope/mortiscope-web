import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { users, userSessions } from "@/db/schema";
import { markCurrentSession } from "@/features/account/actions/mark-current-session";

/**
 * Integration test suite for `markCurrentSession` server action.
 */
describe("markCurrentSession (integration)", () => {
  // Store the created user object for reference in database operations.
  let testUser: typeof users.$inferSelect;

  /**
   * Sets up a fresh test user and clears mock history before each test case.
   */
  beforeEach(async () => {
    // Arrange: Reset all mock states to ensure test isolation.
    vi.clearAllMocks();

    // Arrange: Generate a unique test user in the `users` table.
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
   * Test case to verify that a session can be successfully updated to be the current session.
   */
  it("successfully marks a session as current", async () => {
    // Arrange: Seed the `userSessions` table with two distinct sessions for the user.
    const [session1] = await db
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

    await db
      .insert(userSessions)
      .values({
        userId: testUser.id,
        sessionToken: "session-token-2",
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

    // Act: Attempt to mark the first session as the current session.
    const result = await markCurrentSession(session1.sessionToken, testUser.id);

    // Assert: Verify that the action reports a successful update.
    expect(result).toEqual({ success: true });
  });

  /**
   * Test case to verify that the action returns success even if the token does not exist.
   */
  it("returns success even when marking non-existent session", async () => {
    // Act: Invoke the action with a random token that is not in the `userSessions` table.
    const result = await markCurrentSession("non-existent-token", testUser.id);

    // Assert: Confirm that the action returns success as no database rows were impacted.
    expect(result).toEqual({ success: true });
  });

  /**
   * Test case to verify behavior when the user has no sessions recorded.
   */
  it("returns success for user with no sessions", async () => {
    // Act: Attempt to mark a session for a user who has no entries in the `userSessions` table.
    const result = await markCurrentSession("any-token", testUser.id);

    // Assert: Confirm that the action returns success.
    expect(result).toEqual({ success: true });
  });

  /**
   * Test case to verify that database exceptions are caught and reported as failures.
   */
  it("handles errors gracefully", async () => {
    // Arrange: Suppress console error logging for this test case.
    vi.spyOn(console, "error").mockImplementation(() => {});

    // Arrange: Force a database error when the update method is called.
    const dbModule = await import("@/db");
    vi.spyOn(dbModule.db, "update").mockImplementationOnce(() => {
      throw new Error("Database error");
    });

    // Act: Invoke the action while the database is mocked to fail.
    const result = await markCurrentSession("session-token", testUser.id);

    // Assert: Confirm that the error is handled and a failure result is returned.
    expect(result).toEqual({ success: false });
  });

  /**
   * Test case to verify that non-Error throwables do not crash the action.
   */
  it("handles non-Error thrown values gracefully", async () => {
    // Arrange: Suppress console error logging and force a string to be thrown.
    vi.spyOn(console, "error").mockImplementation(() => {});

    const dbModule = await import("@/db");
    vi.spyOn(dbModule.db, "update").mockImplementationOnce(() => {
      throw "String error instead of Error object";
    });

    // Act: Attempt to mark a session triggering the string exception.
    const result = await markCurrentSession("session-token", testUser.id);

    // Assert: Confirm that the action catches the value and returns failure.
    expect(result).toEqual({ success: false });
  });
});
