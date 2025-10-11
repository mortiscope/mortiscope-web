import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import { revokeSession, revokeSessionByToken } from "@/features/account/actions/revoke-session";

// Mock the database client to intercept and simulate query behavior without hitting a real database.
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(),
    })),
  },
}));

// Mock the Redis session utility to prevent external side effects during unit testing.
vi.mock("@/lib/redis-session", () => ({
  revokeSessionsInRedis: vi.fn(),
}));

/**
 * Test suite for the `revokeSession` server action.
 */
describe("revokeSession", () => {
  const mockSessionId = "session-123";
  const mockUserId = "user-abc";
  const mockSessionToken = "token-xyz";
  const mockDate = new Date();

  // Reset all mock states before each test to ensure test isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that the function returns an error if the session lookup yields no results.
   */
  it("returns error if session not found or user mismatch", async () => {
    // Arrange: Configure database mock to return an empty array for the session lookup.
    const mockLimit = vi.fn().mockResolvedValue([]);
    const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
    const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof db.select
    >);

    // Act: Attempt to revoke a session that does not exist.
    const result = await revokeSession(mockSessionId, mockUserId);

    // Assert: Verify that the function returns a failure status and the correct error message.
    expect(result).toEqual({ success: false, error: "Session not found" });
  });

  /**
   * Test case to verify the full revocation flow including database deletion, blacklisting, and Redis cleanup.
   */
  it("revokes session, blacklists token, and cleans up redis when session exists", async () => {
    // Arrange: Mock successful session data retrieval for both user and core session tables.
    const mockUserSessionData = [{ sessionToken: mockSessionToken }];
    const mockCoreSessionData = [{ expires: mockDate }];

    const mockLimitUser = vi.fn().mockResolvedValue(mockUserSessionData);
    const mockWhereUser = vi.fn().mockReturnValue({ limit: mockLimitUser });
    const mockFromUser = vi.fn().mockReturnValue({ where: mockWhereUser });

    const mockLimitCore = vi.fn().mockResolvedValue(mockCoreSessionData);
    const mockWhereCore = vi.fn().mockReturnValue({ limit: mockLimitCore });
    const mockFromCore = vi.fn().mockReturnValue({ where: mockWhereCore });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFromUser } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({ from: mockFromCore } as unknown as ReturnType<typeof db.select>);

    // Act: Execute the session revocation logic.
    const result = await revokeSession(mockSessionId, mockUserId);

    // Assert: Check that blacklist insertion and table deletions were triggered and success was returned.
    expect(db.insert).toHaveBeenCalled();
    expect(db.delete).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true });
  });

  /**
   * Test case to verify that unique constraint violations on the blacklist table do not stop the revocation.
   */
  it("handles duplicate key error during blacklist insertion gracefully", async () => {
    // Arrange: Mock session data and prepare an insertion error that simulates an existing blacklist entry.
    const mockUserSessionData = [{ sessionToken: mockSessionToken }];
    const mockCoreSessionData = [{ expires: mockDate }];

    const mockLimitUser = vi.fn().mockResolvedValue(mockUserSessionData);
    const mockWhereUser = vi.fn().mockReturnValue({ limit: mockLimitUser });
    const mockFromUser = vi.fn().mockReturnValue({ where: mockWhereUser });

    const mockLimitCore = vi.fn().mockResolvedValue(mockCoreSessionData);
    const mockWhereCore = vi.fn().mockReturnValue({ limit: mockLimitCore });
    const mockFromCore = vi.fn().mockReturnValue({ where: mockWhereCore });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFromUser } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({ from: mockFromCore } as unknown as ReturnType<typeof db.select>);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.insert).mockImplementationOnce(() => {
      throw new Error("duplicate key value violates unique constraint");
    });

    // Act: Execute the session revocation logic.
    const result = await revokeSession(mockSessionId, mockUserId);

    // Assert: Ensure the function still returns success and does not log the duplicate key warning.
    expect(result).toEqual({ success: true });
    expect(consoleSpy).not.toHaveBeenCalledWith(
      "Failed to blacklist session token:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify that unexpected database errors during blacklisting are logged but do not fail the overall process.
   */
  it("logs error for non-duplicate blacklist insertion errors", async () => {
    // Arrange: Mock session data and prepare a generic connection error for the insertion.
    const mockUserSessionData = [{ sessionToken: mockSessionToken }];
    const mockCoreSessionData = [{ expires: mockDate }];

    const mockLimitUser = vi.fn().mockResolvedValue(mockUserSessionData);
    const mockWhereUser = vi.fn().mockReturnValue({ limit: mockLimitUser });
    const mockFromUser = vi.fn().mockReturnValue({ where: mockWhereUser });

    const mockLimitCore = vi.fn().mockResolvedValue(mockCoreSessionData);
    const mockWhereCore = vi.fn().mockReturnValue({ limit: mockLimitCore });
    const mockFromCore = vi.fn().mockReturnValue({ where: mockWhereCore });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFromUser } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({ from: mockFromCore } as unknown as ReturnType<typeof db.select>);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const genericError = new Error("Connection lost");

    vi.mocked(db.insert).mockImplementationOnce(() => {
      throw genericError;
    });

    // Act: Execute the session revocation logic.
    const result = await revokeSession(mockSessionId, mockUserId);

    // Assert: Verify that the error was logged to the console while returning success to the caller.
    expect(result).toEqual({ success: true });
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to blacklist session token:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify that failures in Redis do not prevent the database operations from completing.
   */
  it("logs error if Redis revocation fails but still completes DB operations", async () => {
    // Arrange: Setup standard session data and force the Redis mock to reject.
    const mockUserSessionData = [{ sessionToken: mockSessionToken }];
    const mockCoreSessionData = [{ expires: mockDate }];

    const mockLimitUser = vi.fn().mockResolvedValue(mockUserSessionData);
    const mockWhereUser = vi.fn().mockReturnValue({ limit: mockLimitUser });
    const mockFromUser = vi.fn().mockReturnValue({ where: mockWhereUser });

    const mockLimitCore = vi.fn().mockResolvedValue(mockCoreSessionData);
    const mockWhereCore = vi.fn().mockReturnValue({ limit: mockLimitCore });
    const mockFromCore = vi.fn().mockReturnValue({ where: mockWhereCore });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFromUser } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({ from: mockFromCore } as unknown as ReturnType<typeof db.select>);

    const { revokeSessionsInRedis } = await import("@/lib/redis-session");
    vi.mocked(revokeSessionsInRedis).mockRejectedValueOnce(new Error("Redis error"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Execute the session revocation logic.
    const result = await revokeSession(mockSessionId, mockUserId);

    // Assert: Check that the Redis failure was logged but the function reported success.
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to add revoked session to Redis:",
      expect.any(Error)
    );
    expect(result).toEqual({ success: true });

    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify that if a core session is missing, blacklisting is skipped but deletion still proceeds.
   */
  it("skips blacklist if session missing from core table but still deletes user session", async () => {
    // Arrange: Mock a state where the user session exists but the corresponding core session entry is missing.
    const mockUserSessionData = [{ sessionToken: mockSessionToken }];

    const mockLimitUser = vi.fn().mockResolvedValue(mockUserSessionData);
    const mockWhereUser = vi.fn().mockReturnValue({ limit: mockLimitUser });
    const mockFromUser = vi.fn().mockReturnValue({ where: mockWhereUser });

    const mockLimitCore = vi.fn().mockResolvedValue([]);
    const mockWhereCore = vi.fn().mockReturnValue({ limit: mockLimitCore });
    const mockFromCore = vi.fn().mockReturnValue({ where: mockWhereCore });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFromUser } as unknown as ReturnType<typeof db.select>)
      .mockReturnValueOnce({ from: mockFromCore } as unknown as ReturnType<typeof db.select>);

    // Act: Execute the session revocation logic.
    const result = await revokeSession(mockSessionId, mockUserId);

    // Assert: Verify that no insertion occurred but deletions were still attempted for cleanup.
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.delete).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true });
  });

  /**
   * Test case to verify behavior when a primary database lookup fails.
   */
  it("handles generic database error", async () => {
    // Arrange: Setup a console spy and force the database select method to throw an exception.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.select).mockImplementationOnce(() => {
      throw new Error("DB Error");
    });

    // Act: Execute the session revocation logic.
    const result = await revokeSession(mockSessionId, mockUserId);

    // Assert: Verify the failure is logged and the return object indicates failure.
    expect(consoleSpy).toHaveBeenCalledWith("Failed to revoke session:", expect.any(Error));
    expect(result).toEqual({ success: false, error: "Failed to revoke session" });

    consoleSpy.mockRestore();
  });
});

/**
 * Test suite for the `revokeSessionByToken` function.
 * This suite verifies revocation logic when using a session token directly.
 */
describe("revokeSessionByToken", () => {
  const mockToken = "token-123";

  // Reset all mock states before each test.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify successful deletion from multiple tables using the provided token.
   */
  it("successfully deletes session from both tables", async () => {
    // Act: Invoke the revocation logic by token.
    const result = await revokeSessionByToken(mockToken);

    // Assert: Check that the delete operation was called for both tables and success was returned.
    expect(db.delete).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true });
  });

  /**
   * Test case to verify error handling when a database error occurs during token-based revocation.
   */
  it("handles generic database error", async () => {
    // Arrange: Force a database deletion failure and setup a console spy.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(db.delete).mockImplementationOnce(() => {
      throw new Error("DB Error");
    });

    // Act: Attempt to revoke the session by token.
    const result = await revokeSessionByToken(mockToken);

    // Assert: Ensure the error is logged and the function returns the expected error state.
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to revoke session by token:",
      expect.any(Error)
    );
    expect(result).toEqual({ success: false, error: "Failed to revoke session" });

    consoleSpy.mockRestore();
  });
});
