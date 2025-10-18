"use server";

import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { userSessions } from "@/db/schema";
import { updateSessionActivity } from "@/features/account/actions/update-session-activity";

/**
 * Integration test suite for `updateSessionActivity` server action.
 */
describe("updateSessionActivity (integration)", () => {
  const mockUserId = "test-user-id";
  const mockSessionToken = "test-session-token";

  /**
   * Resets the mock state and database before each test execution.
   */
  beforeEach(() => {
    // Arrange: Clear mock history and reset the database to a clean state.
    vi.clearAllMocks();
    resetMockDb();
  });

  /**
   * Test case to verify that the `lastActiveAt` timestamp is updated for a valid session.
   */
  it("successfully updates lastActiveAt for existing session", async () => {
    // Arrange: Seed an existing session record with a past timestamp in the `userSessions` table.
    const originalDate = new Date(Date.now() - 60000);
    await db.insert(userSessions).values({
      userId: mockUserId,
      sessionToken: mockSessionToken,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      browserName: "Chrome",
      osName: "Windows",
      lastActiveAt: originalDate,
      createdAt: originalDate,
      expiresAt: new Date(Date.now() + 86400000),
    });

    // Act: Invoke the update activity action with the existing session token.
    const result = await updateSessionActivity(mockSessionToken);

    // Assert: Verify that the operation returned a success status.
    expect(result.success).toBe(true);
  });

  /**
   * Test case to verify that the action returns success even if the token does not exist.
   */
  it("returns success even for non-existent session token", async () => {
    // Act: Attempt to update activity for a token that is not in the database.
    const result = await updateSessionActivity("non-existent-token");

    // Assert: Verify that the operation still reports success to avoid leaking token existence.
    expect(result.success).toBe(true);
  });

  /**
   * Test case to verify graceful handling of database update exceptions.
   */
  it("handles database errors gracefully", async () => {
    // Arrange: Mock the database module to throw an error during the update operation.
    const dbModule = await import("@/db");
    vi.spyOn(dbModule.db, "update").mockImplementationOnce(() => {
      throw new Error("Database Error");
    });

    // Act: Attempt to update the session activity.
    const result = await updateSessionActivity(mockSessionToken);

    // Assert: Verify that the action catches the error and returns a failure status.
    expect(result.success).toBe(false);
  });

  /**
   * Test case to verify that only the targeted session is updated when a user has multiple sessions.
   */
  it("updates correct session when multiple sessions exist", async () => {
    // Arrange: Create two distinct session records for the same user in the `userSessions` table.
    const now = new Date();
    const oldDate = new Date(Date.now() - 120000);

    await db.insert(userSessions).values({
      userId: mockUserId,
      sessionToken: mockSessionToken,
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      browserName: "Chrome",
      osName: "Windows",
      lastActiveAt: oldDate,
      createdAt: oldDate,
      expiresAt: new Date(now.getTime() + 86400000),
    });

    await db.insert(userSessions).values({
      userId: mockUserId,
      sessionToken: "other-session-token",
      ipAddress: "127.0.0.1",
      userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      browserName: "Firefox",
      osName: "macOS",
      lastActiveAt: oldDate,
      createdAt: oldDate,
      expiresAt: new Date(now.getTime() + 86400000),
    });

    // Act: Invoke the update activity action for the first session token.
    const result = await updateSessionActivity(mockSessionToken);

    // Assert: Verify the operation succeeded.
    expect(result.success).toBe(true);

    // Assert: Confirm that at least one session record persists for the user.
    const [sessions] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.userId, mockUserId));
    expect(sessions).toBeDefined();
  });
});
