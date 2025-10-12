import { createId } from "@paralleldrive/cuid2";
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from "vitest";

import { db } from "@/db";
import { trackSession } from "@/features/account/actions/track-session";
import { parseSessionInfo } from "@/features/account/utils/parse-session";
import { encrypt } from "@/lib/crypto";
import { inngest } from "@/lib/inngest";

// Mock the cuid2 library to provide predictable identifiers for session records.
vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn(),
}));

// Mock the database client to intercept queries and mutations related to sessions.
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock the database schema constants used for table and column references.
vi.mock("@/db/schema", () => ({
  sessions: {
    sessionToken: "sessionToken",
    userId: "userId",
    expires: "expires",
  },
  userSessions: {
    id: "id",
    userId: "userId",
    browserName: "browserName",
    osName: "osName",
    lastActiveAt: "lastActiveAt",
    sessionToken: "sessionToken",
  },
}));

// Mock the utility that extracts device and browser information from user agent strings.
vi.mock("@/features/account/utils/parse-session", () => ({
  parseSessionInfo: vi.fn(),
}));

// Mock the encryption utility to handle sensitive data like IP addresses.
vi.mock("@/lib/crypto", () => ({
  encrypt: vi.fn(),
}));

// Mock the Inngest client to verify background task scheduling for session checks.
vi.mock("@/lib/inngest", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

/**
 * Test suite for the `trackSession` server action.
 */
describe("trackSession", () => {
  const mockUserId = "user-123";
  const mockSessionToken = "token-abc";
  const mockUserAgent = "Mozilla/5.0...";
  const mockIp = "127.0.0.1";
  const mockEncryptedIp = "encrypted-127.0.0.1";
  const mockSessionId = "generated-session-id";

  const mockParsedSession = {
    deviceType: "desktop",
    deviceVendor: "Apple",
    deviceModel: "Mac",
    browserName: "Chrome",
    browserVersion: "120.0",
    osName: "macOS",
    osVersion: "14.0",
    country: "Country 1",
    region: "Region 1",
    city: "City 1",
    timezone: "UTC",
  };

  type MockDbChain = {
    from: Mock;
    where: Mock;
    orderBy: Mock;
    limit: Mock;
    values: Mock;
    set: Mock;
  };

  let mockDbChain: MockDbChain;

  // Initialize common mocks and fake timers before each test to ensure environmental consistency.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));

    mockDbChain = {
      from: vi.fn(),
      where: vi.fn(),
      orderBy: vi.fn(),
      limit: vi.fn(),
      values: vi.fn(),
      set: vi.fn(),
    };

    mockDbChain.from.mockReturnValue(mockDbChain);
    mockDbChain.where.mockReturnValue(mockDbChain);
    mockDbChain.orderBy.mockReturnValue(mockDbChain);
    mockDbChain.set.mockReturnValue(mockDbChain);

    vi.mocked(parseSessionInfo).mockResolvedValue(mockParsedSession);
    vi.mocked(encrypt).mockReturnValue(mockEncryptedIp);
    vi.mocked(createId).mockReturnValue(mockSessionId);

    vi.mocked(db.select).mockReturnValue(mockDbChain as unknown as ReturnType<typeof db.select>);
    vi.mocked(db.insert).mockReturnValue(mockDbChain as unknown as ReturnType<typeof db.insert>);
    vi.mocked(db.update).mockReturnValue(mockDbChain as unknown as ReturnType<typeof db.update>);
  });

  // Restore real timers and environment variables after each test case.
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  /**
   * Test case to verify that missing core session records are automatically re-created.
   */
  it("re-creates core session record if missing", async () => {
    // Arrange: Simulate a database state where no session records exist for the given token.
    mockDbChain.limit.mockResolvedValueOnce([]);
    mockDbChain.limit.mockResolvedValueOnce([]);
    mockDbChain.limit.mockResolvedValueOnce([]);

    // Act: Attempt to track the session.
    await trackSession({
      userId: mockUserId,
      sessionToken: mockSessionToken,
      userAgent: mockUserAgent,
      ipAddress: mockIp,
    });

    // Assert: Check that insertion was called twice—once for the session and once for user metadata.
    expect(db.insert).toHaveBeenCalledTimes(2);

    const firstInsertCall = vi.mocked(db.insert).mock.calls[0][0];
    expect(firstInsertCall).toBeDefined();
  });

  /**
   * Test case to verify that an existing session is updated when an exact token match is found.
   */
  it("updates existing session if exact token match found (Case A)", async () => {
    // Arrange: Mock the database to find an existing record matching the specific `sessionToken`.
    mockDbChain.limit.mockResolvedValueOnce(["exists"]);
    mockDbChain.limit.mockResolvedValueOnce([]);
    mockDbChain.limit.mockResolvedValueOnce([{ id: "existing-id" }]);

    // Act: Track the activity for the existing session.
    const result = await trackSession({
      userId: mockUserId,
      sessionToken: mockSessionToken,
      userAgent: mockUserAgent,
      ipAddress: mockIp,
    });

    // Assert: Verify the `lastActiveAt` and encrypted IP are updated via the database update method.
    expect(db.update).toHaveBeenCalled();
    expect(mockDbChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        lastActiveAt: expect.any(Date),
        ipAddress: mockEncryptedIp,
      })
    );
    expect(db.insert).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true, sessionId: "existing-id" });
  });

  /**
   * Test case to verify that a device session is updated if the device fingerprint matches despite a token change.
   */
  it("updates device session if no exact match but device fingerprint matches (Case B)", async () => {
    // Arrange: Simulate finding a match based on user agent characteristics rather than token.
    mockDbChain.limit.mockResolvedValueOnce(["exists"]);
    mockDbChain.limit.mockResolvedValueOnce([{ id: "device-session-id" }]);
    mockDbChain.limit.mockResolvedValueOnce([]);

    // Act: Track the session.
    const result = await trackSession({
      userId: mockUserId,
      sessionToken: mockSessionToken,
      userAgent: mockUserAgent,
      ipAddress: mockIp,
    });

    // Assert: Confirm the update updates the existing metadata record with the new `sessionToken`.
    expect(db.update).toHaveBeenCalled();
    expect(mockDbChain.set).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionToken: mockSessionToken,
        lastActiveAt: expect.any(Date),
      })
    );
    expect(result).toEqual({ success: true, sessionId: "device-session-id" });
  });

  /**
   * Test case to verify that a completely new session record is created when no existing matches are found.
   */
  it("creates new session if no matches found (Case C)", async () => {
    // Arrange: Mock database responses to indicate no session or device match exists.
    mockDbChain.limit.mockResolvedValueOnce(["exists"]);
    mockDbChain.limit.mockResolvedValueOnce([]);
    mockDbChain.limit.mockResolvedValueOnce([]);

    // Act: Track a new session.
    const result = await trackSession({
      userId: mockUserId,
      sessionToken: mockSessionToken,
      userAgent: mockUserAgent,
      ipAddress: mockIp,
    });

    // Assert: Check that a new row is inserted into the database with the generated `mockSessionId`.
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(mockDbChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockSessionId,
        userId: mockUserId,
        sessionToken: mockSessionToken,
        deviceType: "desktop",
        ipAddress: mockEncryptedIp,
      })
    );
    expect(result).toEqual({ success: true, sessionId: mockSessionId });
  });

  /**
   * Test case to verify that background inactivity checks are triggered only in production environments.
   */
  it("schedules inngest check in production environment", async () => {
    // Arrange: Set environment to production.
    vi.stubEnv("NODE_ENV", "production");

    mockDbChain.limit.mockResolvedValueOnce(["exists"]);
    mockDbChain.limit.mockResolvedValueOnce([]);
    mockDbChain.limit.mockResolvedValueOnce([]);

    // Act: Execute the tracking action.
    await trackSession({
      userId: mockUserId,
      sessionToken: mockSessionToken,
      userAgent: mockUserAgent,
      ipAddress: mockIp,
    });

    // Assert: Verify that the Inngest event for inactivity checks was dispatched.
    expect(inngest.send).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "account/session.check-inactivity",
        data: expect.objectContaining({
          sessionToken: mockSessionToken,
          userId: mockUserId,
        }),
      })
    );
  });

  /**
   * Test case to verify that background tasks are not scheduled during local development.
   */
  it("does not schedule inngest check in development environment", async () => {
    // Arrange: Set environment to development.
    vi.stubEnv("NODE_ENV", "development");

    mockDbChain.limit.mockResolvedValueOnce(["exists"]);
    mockDbChain.limit.mockResolvedValueOnce([]);
    mockDbChain.limit.mockResolvedValueOnce([]);

    // Act: Track the session.
    await trackSession({
      userId: mockUserId,
      sessionToken: mockSessionToken,
      userAgent: mockUserAgent,
      ipAddress: mockIp,
    });

    // Assert: Ensure no Inngest events were sent.
    expect(inngest.send).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that failures in background scheduling do not interrupt the primary session tracking success.
   */
  it("logs warning but returns success if inngest scheduling fails", async () => {
    // Arrange: Mock an error in the Inngest service.
    vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    mockDbChain.limit.mockResolvedValueOnce(["exists"]);
    mockDbChain.limit.mockResolvedValueOnce([]);
    mockDbChain.limit.mockResolvedValueOnce([]);

    vi.mocked(inngest.send).mockRejectedValue(new Error("Inngest error"));

    // Act: Attempt to track the session.
    const result = await trackSession({
      userId: mockUserId,
      sessionToken: mockSessionToken,
      userAgent: mockUserAgent,
      ipAddress: mockIp,
    });

    // Assert: Confirm the main action succeeded and the background error was logged as a warning.
    expect(result).toEqual({ success: true, sessionId: mockSessionId });
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to schedule session inactivity check:",
      "Inngest error"
    );

    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify that critical errors result in a failure response and diagnostic logging.
   */
  it("handles and logs general errors", async () => {
    // Arrange: Force a failure in the user agent parsing utility.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(parseSessionInfo).mockRejectedValue(new Error("Parsing failed"));

    // Act: Execute the tracking action.
    const result = await trackSession({
      userId: mockUserId,
      sessionToken: mockSessionToken,
      userAgent: mockUserAgent,
      ipAddress: mockIp,
    });

    // Assert: Verify the return of a failure status and error details in logs.
    expect(result).toEqual({ success: false, error: "Failed to track session" });
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error occurred:",
      expect.objectContaining({
        error: "Parsing failed",
        userId: mockUserId,
      })
    );

    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify that non-Error rejection objects are normalized to 'Unknown error' during logging.
   */
  it("handles and logs non-Error objects in outer catch", async () => {
    // Arrange: Reject the promise with a string instead of an Error object.
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(parseSessionInfo).mockRejectedValue("String error");

    // Act: Track the session.
    const result = await trackSession({
      userId: mockUserId,
      sessionToken: mockSessionToken,
      userAgent: mockUserAgent,
      ipAddress: mockIp,
    });

    // Assert: Check that the error log correctly fallbacks to 'Unknown error'.
    expect(result).toEqual({ success: false, error: "Failed to track session" });
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error occurred:",
      expect.objectContaining({
        error: "Unknown error",
        userId: mockUserId,
      })
    );

    consoleSpy.mockRestore();
  });

  /**
   * Test case to verify fallback error messaging for background task scheduling failures.
   */
  it("logs warning with 'Unknown error' if inngest scheduling fails with non-Error object", async () => {
    // Arrange: Mock Inngest failure with a non-Error object.
    vi.stubEnv("NODE_ENV", "production");
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    mockDbChain.limit.mockResolvedValueOnce(["exists"]);
    mockDbChain.limit.mockResolvedValueOnce([]);
    mockDbChain.limit.mockResolvedValueOnce([]);

    vi.mocked(inngest.send).mockRejectedValue("String error");

    // Act: Execute the tracking action.
    const result = await trackSession({
      userId: mockUserId,
      sessionToken: mockSessionToken,
      userAgent: mockUserAgent,
      ipAddress: mockIp,
    });

    // Assert: Confirm the warning log used the fallback 'Unknown error' message.
    expect(result).toEqual({ success: true, sessionId: mockSessionId });
    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to schedule session inactivity check:",
      "Unknown error"
    );

    consoleSpy.mockRestore();
  });
});
