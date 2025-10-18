import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { sessions, users, userSessions } from "@/db/schema";
import { revokeSession, revokeSessionByToken } from "@/features/account/actions/revoke-session";
import { revokeSessionsInRedis } from "@/lib/redis-session";

// Mock the Redis session module to prevent actual cache operations during integration tests.
vi.mock("@/lib/redis-session", () => ({
  revokeSessionsInRedis: vi.fn(),
}));

/**
 * Integration test suite for `revokeSession` server action.
 */
describe("revokeSession (integration)", () => {
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
   * Test suite for the primary session revocation action using internal record IDs.
   */
  describe("revokeSession", () => {
    /**
     * Test case to verify successful revocation of an existing session record.
     */
    it("successfully revokes a valid session belonging to the user", async () => {
      // Arrange: Insert a record into `userSessions` and a matching record in `sessions`.
      const sessionToken = "valid-session-token";

      const [userSession] = await db
        .insert(userSessions)
        .values({
          userId: testUser.id,
          sessionToken,
          browserName: "Chrome",
          browserVersion: "120.0",
          osName: "Windows",
          osVersion: "11",
          deviceType: "desktop",
          userAgent: "Mozilla/5.0",
          ipAddress: "127.0.0.1",
          isCurrentSession: false,
          lastActiveAt: new Date(),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        })
        .returning();

      await db
        .insert(sessions)
        .values({
          sessionToken,
          userId: testUser.id,
          expires: new Date(Date.now() + 86400000),
        })
        .returning();

      // Act: Revoke the session using the record ID.
      const result = await revokeSession(userSession.id, testUser.id);

      // Assert: Verify success and that the token was added to the Redis blacklist.
      expect(result).toEqual({ success: true });
      expect(revokeSessionsInRedis).toHaveBeenCalledWith([sessionToken]);
    });

    /**
     * Test case to verify behavior when providing a non-existent session identifier.
     */
    it("returns error if session does not exist", async () => {
      // Act: Attempt to revoke a session with a random ID.
      const result = await revokeSession("non-existent-id", testUser.id);

      // Assert: Confirm the specific session not found error response.
      expect(result).toEqual({ success: false, error: "Session not found" });
    });

    /**
     * Test case to verify that users cannot revoke sessions belonging to other individuals.
     */
    it("returns error if session belongs to another user", async () => {
      // Arrange: Create a session record associated with a different user ID.
      const otherUserId = "other-user-id";

      const [otherUserSession] = await db
        .insert(userSessions)
        .values({
          userId: otherUserId,
          sessionToken: "other-session",
          browserName: "Chrome",
          browserVersion: "120.0",
          osName: "Windows",
          osVersion: "11",
          deviceType: "desktop",
          userAgent: "Mozilla/5.0",
          ipAddress: "127.0.0.1",
          isCurrentSession: false,
          lastActiveAt: new Date(),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        })
        .returning();

      // Act: Attempt to revoke the other user's session using the current test user ID.
      const result = await revokeSession(otherUserSession.id, testUser.id);

      // Assert: Verify the unauthorized access is treated as session not found.
      expect(result).toEqual({ success: false, error: "Session not found" });
    });

    /**
     * Test case to verify that orphan metadata sessions are cleaned up even if the core session is missing.
     */
    it("handles orphan sessions (missing in core sessions table) gracefully", async () => {
      // Arrange: Insert metadata into `userSessions` without a corresponding `sessions` row.
      const sessionToken = "orphan-token";

      const [userSession] = await db
        .insert(userSessions)
        .values({
          userId: testUser.id,
          sessionToken,
          browserName: "Chrome",
          browserVersion: "120.0",
          osName: "Windows",
          osVersion: "11",
          deviceType: "desktop",
          userAgent: "Mozilla/5.0",
          ipAddress: "127.0.0.1",
          isCurrentSession: false,
          lastActiveAt: new Date(),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        })
        .returning();

      // Act: Revoke the orphan session.
      const result = await revokeSession(userSession.id, testUser.id);

      // Assert: Verify success and that Redis was not contacted as there was no token to blacklist.
      expect(result).toEqual({ success: true });
      expect(revokeSessionsInRedis).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that JWT blacklist failures are logged but do not crash the request.
     */
    it("logs error when JWT blacklist insert fails (non-duplicate)", async () => {
      // Arrange: Setup session records and mock a console error spy.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const sessionToken = "jwt-error-token";

      const [userSession] = await db
        .insert(userSessions)
        .values({
          userId: testUser.id,
          sessionToken,
          browserName: "Chrome",
          browserVersion: "120.0",
          osName: "Windows",
          osVersion: "11",
          deviceType: "desktop",
          userAgent: "Mozilla/5.0",
          ipAddress: "127.0.0.1",
          isCurrentSession: false,
          lastActiveAt: new Date(),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        })
        .returning();

      await db
        .insert(sessions)
        .values({
          sessionToken,
          userId: testUser.id,
          expires: new Date(Date.now() + 86400000),
        })
        .returning();

      // Arrange: Force a connection failure during the database insert operation.
      const dbModule = await import("@/db");
      const originalInsert = dbModule.db.insert;

      vi.spyOn(dbModule.db, "insert").mockImplementation(() => {
        return {
          values: () => {
            throw new Error("Connection failed");
          },
        } as unknown as ReturnType<typeof dbModule.db.insert>;
      });

      // Act: Execute the revocation.
      await revokeSession(userSession.id, testUser.id);

      // Clean up the manual mock.
      dbModule.db.insert = originalInsert;

      // Assert: Confirm the failure was logged to the console.
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to blacklist session token:",
        expect.any(Error)
      );
    });

    /**
     * Test case to verify that duplicate token entries in the blacklist are ignored.
     */
    it("ignores duplicate key errors during JWT blacklist insert", async () => {
      // Arrange: Setup session records and mock a duplicate key constraint violation.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const sessionToken = "duplicate-token";

      const [userSession] = await db
        .insert(userSessions)
        .values({
          userId: testUser.id,
          sessionToken,
          browserName: "Chrome",
          browserVersion: "120.0",
          osName: "Windows",
          osVersion: "11",
          deviceType: "desktop",
          userAgent: "Mozilla/5.0",
          ipAddress: "127.0.0.1",
          isCurrentSession: false,
          lastActiveAt: new Date(),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        })
        .returning();

      await db
        .insert(sessions)
        .values({
          sessionToken,
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

      // Act: Attempt to revoke the session.
      await revokeSession(userSession.id, testUser.id);

      // Clean up the manual mock.
      dbModule.db.insert = originalInsert;

      // Assert: Verify that no error was logged for the duplicate entry.
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify that Redis errors are logged but the main revocation succeeds.
     */
    it("logs error when Redis revocation fails", async () => {
      // Arrange: Setup session records and force a Redis specific error.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const sessionToken = "redis-error-token";

      const [userSession] = await db
        .insert(userSessions)
        .values({
          userId: testUser.id,
          sessionToken,
          browserName: "Chrome",
          browserVersion: "120.0",
          osName: "Windows",
          osVersion: "11",
          deviceType: "desktop",
          userAgent: "Mozilla/5.0",
          ipAddress: "127.0.0.1",
          isCurrentSession: false,
          lastActiveAt: new Date(),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        })
        .returning();

      await db
        .insert(sessions)
        .values({
          sessionToken,
          userId: testUser.id,
          expires: new Date(Date.now() + 86400000),
        })
        .returning();

      vi.mocked(revokeSessionsInRedis).mockRejectedValueOnce(new Error("Redis error"));

      // Act: Attempt to revoke the session.
      await revokeSession(userSession.id, testUser.id);

      // Assert: Confirm the Redis error was captured in the logs.
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to add revoked session to Redis:",
        expect.any(Error)
      );
    });

    /**
     * Test case to verify that fatal database errors result in a failure response.
     */
    it("handles general unexpected errors", async () => {
      // Arrange: Suppress console error output and mock a database selection failure.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db, "select").mockImplementationOnce(() => {
        throw new Error("Database fatal error");
      });

      // Act: Attempt to revoke a session during a critical database failure.
      const result = await revokeSession("any-id", testUser.id);

      // Assert: Verify the standardized error response and logging.
      expect(result).toEqual({ success: false, error: "Failed to revoke session" });
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to revoke session:", expect.any(Error));
    });
  });

  /**
   * Test suite for the alternative revocation action using raw session tokens.
   */
  describe("revokeSessionByToken", () => {
    /**
     * Test case to verify that a session is correctly removed when using its token value.
     */
    it("successfully revokes session by token", async () => {
      // Arrange: Define and insert a session record for the user.
      const sessionToken = "token-to-revoke";

      await db
        .insert(userSessions)
        .values({
          userId: testUser.id,
          sessionToken,
          browserName: "Chrome",
          browserVersion: "120.0",
          osName: "Windows",
          osVersion: "11",
          deviceType: "desktop",
          userAgent: "Mozilla/5.0",
          ipAddress: "127.0.0.1",
          isCurrentSession: false,
          lastActiveAt: new Date(),
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        })
        .returning();

      await db
        .insert(sessions)
        .values({
          sessionToken,
          userId: testUser.id,
          expires: new Date(Date.now() + 86400000),
        })
        .returning();

      // Act: Invoke the revocation by token.
      const result = await revokeSessionByToken(sessionToken);

      // Assert: Confirm the action returned success.
      expect(result).toEqual({ success: true });
    });

    /**
     * Test case to verify that errors during token-based revocation are handled.
     */
    it("handles unexpected errors gracefully", async () => {
      // Arrange: Suppress console error logging and force the delete operation to fail.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const dbModule = await import("@/db");
      const originalDelete = dbModule.db.delete;
      vi.spyOn(dbModule.db, "delete").mockImplementation(() => {
        throw new Error("Delete failed");
      });

      // Act: Attempt to revoke by token.
      const result = await revokeSessionByToken("any-token");

      // Clean up the manual mock.
      dbModule.db.delete = originalDelete;

      // Assert: Verify the failure response and the error log.
      expect(result).toEqual({ success: false, error: "Failed to revoke session" });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to revoke session by token:",
        expect.any(Error)
      );
    });
  });
});
