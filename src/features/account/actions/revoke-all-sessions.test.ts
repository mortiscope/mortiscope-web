import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/db";
import {
  revokeAllSessions,
  revokeAllUserSessions,
} from "@/features/account/actions/revoke-all-sessions";

// Mock the Redis session utility to prevent actual network calls during testing.
vi.mock("@/lib/redis-session", () => ({
  revokeSessionsInRedis: vi.fn(),
}));

// Mock the database client to simulate query responses and tracking of deletions or insertions.
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

/**
 * Test suite for the `revokeAllSessions` server action.
 */
describe("revokeAllSessions", () => {
  const mockUserId = "user-123";
  const mockDate = new Date();

  // Mock data representing user-specific session metadata.
  const mockUserSessions = [
    { id: "us-1", sessionToken: "token-1", userId: mockUserId },
    { id: "us-2", sessionToken: "token-2", userId: mockUserId },
  ];

  // Mock data representing core authentication sessions with expiration dates.
  const mockCoreSessions = [
    { sessionToken: "token-1", expires: mockDate },
    { sessionToken: "token-2", expires: mockDate },
  ];

  // Reset all mock states before each test to maintain execution isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify behavior when a user has no active sessions in the database.
   */
  it("returns success with 0 count if user has no sessions", async () => {
    // Arrange: Configure the database mock to return an empty array for session lookups.
    const mockFrom = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof db.select
    >);

    // Act: Execute the revocation logic for the given `mockUserId`.
    const result = await revokeAllSessions(mockUserId);

    // Assert: Verify the result reports zero revoked items and no deletion occurs.
    expect(result).toEqual({ success: true, revokedCount: 0 });
    expect(db.delete).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that all found sessions are revoked when no exclusion token is provided.
   */
  it("revokes all sessions when no current token is provided", async () => {
    // Arrange: Setup database mocks to return multiple user and core sessions.
    const mockFromUserSessions = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(mockUserSessions) });

    const mockFromCoreSessions = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(mockCoreSessions) });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFromUserSessions } as unknown as ReturnType<
        typeof db.select
      >)
      .mockReturnValueOnce({ from: mockFromCoreSessions } as unknown as ReturnType<
        typeof db.select
      >);

    // Act: Invoke the revocation logic without an active session token.
    const result = await revokeAllSessions(mockUserId);

    // Assert: Check that the count matches and database operations were triggered for all tokens.
    expect(result).toEqual({ success: true, revokedCount: 2 });
    expect(db.insert).toHaveBeenCalledTimes(2);
    expect(db.delete).toHaveBeenCalledTimes(2);
  });

  /**
   * Test case to verify that the active session is excluded from the revocation process.
   */
  it("preserves the current session when token is provided", async () => {
    // Arrange: Define `currentToken` to be excluded from deletion and blacklist insertion.
    const currentToken = "token-1";

    const mockFromUserSessions = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(mockUserSessions) });

    const mockRevokedCoreSession = [mockCoreSessions[1]];
    const mockFromCoreSessions = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(mockRevokedCoreSession) });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFromUserSessions } as unknown as ReturnType<
        typeof db.select
      >)
      .mockReturnValueOnce({ from: mockFromCoreSessions } as unknown as ReturnType<
        typeof db.select
      >);

    // Act: Execute revocation while passing the `currentToken` to keep.
    const result = await revokeAllSessions(mockUserId, currentToken);

    // Assert: Ensure only the non-active session was revoked.
    expect(result).toEqual({ success: true, revokedCount: 1 });
    expect(db.insert).toHaveBeenCalledTimes(1);
  });

  /**
   * Test case to verify that no revocation occurs if the only session is the current one.
   */
  it("returns success with 0 count if current session is the only session", async () => {
    // Arrange: Prepare a scenario where the database only contains the `currentToken`.
    const singleSession = [mockUserSessions[0]];
    const currentToken = "token-1";

    const mockFrom = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(singleSession) });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof db.select
    >);

    // Act: Attempt to revoke all other sessions.
    const result = await revokeAllSessions(mockUserId, currentToken);

    // Assert: Verify that no deletions were performed as the active session is preserved.
    expect(result).toEqual({ success: true, revokedCount: 0 });
    expect(db.delete).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that unique constraint violations during blacklisting are handled without failing the operation.
   */
  it("handles duplicate key errors in blacklist insertion gracefully", async () => {
    // Arrange: Mock the database to return sessions and prepare a duplicate key error simulation.
    const mockFromUserSessions = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(mockUserSessions) });
    const mockFromCoreSessions = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(mockCoreSessions) });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFromUserSessions } as unknown as ReturnType<
        typeof db.select
      >)
      .mockReturnValueOnce({ from: mockFromCoreSessions } as unknown as ReturnType<
        typeof db.select
      >);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const duplicateError = new Error("duplicate key value violates unique constraint");

    vi.mocked(db.insert).mockImplementationOnce(() => {
      throw duplicateError;
    });

    // Act: Execute the revocation logic.
    const result = await revokeAllSessions(mockUserId);

    // Assert: Confirm the function succeeded despite the insertion error and did not log the specific error.
    expect(result).toEqual({ success: true, revokedCount: 2 });
    expect(consoleSpy).not.toHaveBeenCalledWith(
      "Failed to blacklist individual JWT token:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify that database connection failures result in a failure response.
   */
  it("logs error when generic error occurs during revocation", async () => {
    // Arrange: Force the database select call to throw a generic error.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    vi.mocked(db.select).mockImplementation(() => {
      throw new Error("DB Connection Failed");
    });

    // Act: Run the revocation action.
    const result = await revokeAllSessions(mockUserId);

    // Assert: Verify the error response and that the failure was logged to the console.
    expect(result).toEqual({ success: false, error: "Failed to revoke sessions" });
    expect(consoleSpy).toHaveBeenCalledWith("Failed to revoke all sessions:", expect.any(Error));

    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify that failures in the Redis layer do not block the primary database revocation.
   */
  it("handles Redis revocation errors gracefully", async () => {
    // Arrange: Setup mock sessions and force the Redis mock to reject.
    const mockFromUserSessions = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(mockUserSessions) });
    const mockFromCoreSessions = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(mockCoreSessions) });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFromUserSessions } as unknown as ReturnType<
        typeof db.select
      >)
      .mockReturnValueOnce({ from: mockFromCoreSessions } as unknown as ReturnType<
        typeof db.select
      >);

    const { revokeSessionsInRedis } = await import("@/lib/redis-session");
    vi.mocked(revokeSessionsInRedis).mockRejectedValueOnce(new Error("Redis down"));

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Act: Execute the revocation logic.
    await revokeAllSessions(mockUserId);

    // Assert: Verify that the Redis-specific error was caught and logged.
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to add revoked sessions to Redis:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify that non-duplicate insertion errors are logged appropriately.
   */
  it("logs error for non-duplicate blacklist insertion errors", async () => {
    // Arrange: Mock session data and a generic insertion failure.
    const mockFromUserSessions = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(mockUserSessions) });
    const mockFromCoreSessions = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(mockCoreSessions) });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFromUserSessions } as unknown as ReturnType<
        typeof db.select
      >)
      .mockReturnValueOnce({ from: mockFromCoreSessions } as unknown as ReturnType<
        typeof db.select
      >);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const genericError = new Error("Connection lost");

    vi.mocked(db.insert).mockImplementationOnce(() => {
      throw genericError;
    });

    // Act: Invoke the revocation logic.
    const result = await revokeAllSessions(mockUserId);

    // Assert: Check that the error was logged while the main function still returned success.
    expect(result).toEqual({ success: true, revokedCount: 2 });
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to blacklist individual JWT token:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify that the higher-level loop catch block handles unexpected failures during processing.
   */
  it("catches unexpected errors in the blacklist loop", async () => {
    // Arrange: Trigger a cascading error scenario where a log failure inside a catch block occurs.
    const mockFromUserSessions = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(mockUserSessions) });
    const mockFromCoreSessions = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(mockCoreSessions) });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFromUserSessions } as unknown as ReturnType<
        typeof db.select
      >)
      .mockReturnValueOnce({ from: mockFromCoreSessions } as unknown as ReturnType<
        typeof db.select
      >);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation((msg) => {
      if (msg === "Failed to blacklist individual JWT token:") {
        throw new Error("Console Spy Error");
      }
    });

    vi.mocked(db.insert).mockImplementationOnce(() => {
      throw new Error("Trigger Console Error");
    });

    // Act: Execute the revocation action.
    const result = await revokeAllSessions(mockUserId);

    // Assert: Confirm the top-level loop error was logged.
    expect(result).toEqual({ success: true, revokedCount: 2 });
    expect(consoleSpy).toHaveBeenCalledWith("Failed to blacklist JWT tokens:", expect.any(Error));

    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify logic consistency when meta-records exist but core records do not.
   */
  it("handles case where sessions exist in userSessions but not in core sessions (inconsistent state)", async () => {
    // Arrange: Simulate a state where `userSessions` has records but `coreSessions` is empty.
    const mockFromUserSessions = vi
      .fn()
      .mockReturnValue({ where: vi.fn().mockResolvedValue(mockUserSessions) });

    const mockFromCoreSessions = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });

    vi.mocked(db.select)
      .mockReturnValueOnce({ from: mockFromUserSessions } as unknown as ReturnType<
        typeof db.select
      >)
      .mockReturnValueOnce({ from: mockFromCoreSessions } as unknown as ReturnType<
        typeof db.select
      >);

    // Act: Perform the revocation logic.
    const result = await revokeAllSessions(mockUserId);

    // Assert: Ensure the count reflects the user-session count and no core-session insertion occurred.
    expect(result).toEqual({ success: true, revokedCount: 2 });
    expect(db.insert).not.toHaveBeenCalled();
    expect(db.delete).toHaveBeenCalledTimes(2);
  });
});

/**
 * Test suite for the `revokeAllUserSessions` wrapper function.
 */
describe("revokeAllUserSessions", () => {
  /**
   * Test case to ensure the wrapper correctly calls the underlying revocation logic.
   */
  it("wraps revokeAllSessions correctly", async () => {
    // Arrange: Define the user identifier and mock an empty database response.
    const mockUserId = "user-123";

    const mockFrom = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as unknown as ReturnType<
      typeof db.select
    >);

    // Act: Invoke the wrapper function.
    const result = await revokeAllUserSessions(mockUserId);

    // Assert: Check that the logic correctly bubbled up from the primary revocation function.
    expect(result).toEqual({ success: true, revokedCount: 0 });
  });
});
