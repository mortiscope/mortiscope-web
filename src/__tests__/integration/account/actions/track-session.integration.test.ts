import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { sessions, userSessions } from "@/db/schema";
import { trackSession } from "@/features/account/actions/track-session";
import { inngest } from "@/lib/inngest";

// Mock the Inngest client to prevent actual event dispatching and track calls.
vi.mock("@/lib/inngest", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

// Mock the crypto module to provide predictable encryption and decryption values.
vi.mock("@/lib/crypto", () => ({
  encrypt: (val: string) => `encrypted-${val}`,
  decrypt: (val: string) => val.replace("encrypted-", ""),
}));

// Mock the session parser to return standardized device and location metadata.
vi.mock("@/features/account/utils/parse-session", () => ({
  parseSessionInfo: vi.fn(() => {
    return Promise.resolve({
      browserName: "Chrome",
      browserVersion: "120.0",
      osName: "Windows",
      osVersion: "11",
      deviceType: "desktop",
      deviceVendor: "Vendor 1",
      deviceModel: "Model 1",
      country: "Country 1",
      region: "Region 1",
      city: "City 1",
      timezone: "Timezone 1",
    });
  }),
}));

/**
 * Integration test suite for `trackSession` server action.
 */
describe("trackSession (integration)", () => {
  // Define mock constants for session identification and user context.
  const mockUserId = "test-user-id";
  const mockSessionToken = "test-session-token";
  const mockUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
  const mockIp = "127.0.0.1";

  /**
   * Resets the database and mock state before each test execution.
   */
  beforeEach(() => {
    // Arrange: Reset all mocks and clear the in-memory database.
    vi.clearAllMocks();
    resetMockDb();
  });

  // Consolidate default session input data for use across test cases.
  const sessionData = {
    userId: mockUserId,
    sessionToken: mockSessionToken,
    userAgent: mockUserAgent,
    ipAddress: mockIp,
  };

  /**
   * Test case to verify that an existing session match updates its activity and metadata.
   */
  it("Case A: Updates existing exact session match", async () => {
    // Arrange: Seed an existing record in the `userSessions` and `sessions` tables.
    const [existing] = await db
      .insert(userSessions)
      .values({
        userId: mockUserId,
        sessionToken: mockSessionToken,
        browserName: "Chrome",
        osName: "Windows",
        ipAddress: "old-ip",
        userAgent: "old-agent",
        lastActiveAt: new Date(Date.now() - 10000),
        createdAt: new Date(),
        expiresAt: new Date(),
      })
      .returning();

    await db.insert(sessions).values({
      sessionToken: mockSessionToken,
      userId: mockUserId,
      expires: new Date(),
    });

    // Act: Invoke the tracking logic with the matching session token.
    const result = await trackSession(sessionData);

    // Assert: Verify the success response and the returned `sessionId`.
    expect(result).toEqual({ success: true, sessionId: existing.id });

    // Assert: Verify that the `lastActiveAt` timestamp and `ipAddress` were updated in the database.
    const [updated] = await db.select().from(userSessions).where(eq(userSessions.id, existing.id));

    expect(updated.lastActiveAt.getTime()).toBeGreaterThanOrEqual(existing.lastActiveAt.getTime());
    expect(updated.ipAddress).toBe(`encrypted-${mockIp}`);
  });

  /**
   * Test case to verify session token updates when the user returns on the same device.
   */
  it("Case B: Updates session for same device (different token)", async () => {
    // Arrange: Create a record representing a previous session from the same browser and OS.
    const [deviceSession] = await db
      .insert(userSessions)
      .values({
        userId: mockUserId,
        sessionToken: "old-token",
        browserName: "Chrome",
        osName: "Windows",
        ipAddress: "old-ip",
        userAgent: "old-agent",
        deviceType: "desktop",
        deviceVendor: "Vendor 1",
        deviceModel: "Model 1",
        lastActiveAt: new Date(),
        createdAt: new Date(),
        expiresAt: new Date(),
      })
      .returning();

    await db.insert(sessions).values({
      sessionToken: mockSessionToken,
      userId: mockUserId,
      expires: new Date(),
    });

    // Act: Track a session with a new token but matching device fingerprints.
    const result = await trackSession(sessionData);

    // Assert: Verify the operation succeeded and returned the ID of the existing device session.
    expect(result.success).toBe(true);
    if (result.success && "sessionId" in result) {
      expect(result.sessionId).toBe(deviceSession.id);
    } else {
      expect.fail("Result should be success with sessionId");
    }

    // Assert: Confirm the `sessionToken` in the `userSessions` table was updated to the new value.
    const [updated] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.id, deviceSession.id));

    expect(updated.sessionToken).toBe(mockSessionToken);
  });

  /**
   * Test case to verify the creation of a new session entry for an unrecognized device.
   */
  it("Case C: Creates new session for new device", async () => {
    // Arrange: Insert the core session record that lacks a corresponding extended user session.
    await db.insert(sessions).values({
      sessionToken: mockSessionToken,
      userId: mockUserId,
      expires: new Date(),
    });

    // Act: Attempt to track the session for the new device.
    const result = await trackSession(sessionData);

    // Assert: Check for success and retrieve the newly created record ID.
    expect(result.success).toBe(true);
    if (!result.success || !("sessionId" in result) || !result.sessionId) {
      throw new Error("Result should be success with sessionId");
    }

    // Assert: Verify the new record exists in `userSessions` with correct properties.
    const [created] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.id, result.sessionId));

    expect(created).toBeDefined();
    expect(created.sessionToken).toBe(mockSessionToken);
    expect(created.deviceType).toBe("desktop");
  });

  /**
   * Test case to verify that missing core session records are re-created for consistency.
   */
  it("Re-creates missing core session", async () => {
    // Act: Track a session when the primary `sessions` table record is missing.
    await trackSession(sessionData);

    // Assert: Verify that a new record was inserted into the `sessions` table.
    const [core] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.sessionToken, mockSessionToken));

    expect(core).toBeDefined();
    expect(core.userId).toBe(mockUserId);
  });

  /**
   * Test case to verify background job scheduling in the production environment.
   */
  it("Schedules Inngest job in production environment", async () => {
    // Arrange: Set the environment variable to simulate production.
    vi.stubEnv("NODE_ENV", "production");

    try {
      // Act: Invoke the tracking action.
      await trackSession(sessionData);

      // Assert: Verify that the `inngest.send` method was called with the correct event payload.
      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "account/session.check-inactivity",
          data: expect.objectContaining({
            sessionToken: mockSessionToken,
            userId: mockUserId,
          }),
        })
      );
    } finally {
      // Arrange: Revert environment changes.
      vi.unstubAllEnvs();
    }
  });

  /**
   * Test case to verify that failures in job scheduling do not crash the primary action.
   */
  it("Handles Inngest scheduling errors gracefully", async () => {
    // Arrange: Simulate production and force an error in the job dispatcher.
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(inngest.send).mockRejectedValueOnce(new Error("Inngest error"));
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      // Act: Attempt to track the session despite the background job failure.
      const result = await trackSession(sessionData);

      // Assert: Verify the action returns success and logs a warning.
      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to schedule session inactivity check:",
        "Inngest error"
      );
    } finally {
      // Arrange: Clean up environment and spies.
      vi.unstubAllEnvs();
      consoleSpy.mockRestore();
    }
  });

  /**
   * Test case to verify handling of unexpected database exceptions.
   */
  it("Handles unexpected errors", async () => {
    // Arrange: Suppress error logs and mock a database failure during selection.
    vi.spyOn(console, "error").mockImplementation(() => {});

    const dbModule = await import("@/db");
    vi.spyOn(dbModule.db, "select").mockImplementationOnce(() => {
      throw new Error("Fatal DB Error");
    });

    // Act: Invoke the tracking action to trigger the error path.
    const result = await trackSession(sessionData);

    // Assert: Verify the returned error message matches the failure state.
    expect(result).toEqual({ success: false, error: "Failed to track session" });
  });

  /**
   * Test case to verify handling of non-standard error types in catch blocks.
   */
  it("Handles non-Error thrown in main catch block", async () => {
    // Arrange: Mock the database to throw a raw string instead of an Error object.
    vi.spyOn(console, "error").mockImplementation(() => {});

    const dbModule = await import("@/db");
    vi.spyOn(dbModule.db, "select").mockImplementationOnce(() => {
      throw "string error";
    });

    // Act: Invoke the tracking action.
    const result = await trackSession(sessionData);

    // Assert: Confirm the catch block still produces the correct failure response.
    expect(result).toEqual({ success: false, error: "Failed to track session" });
  });

  /**
   * Test case to ensure background jobs are not scheduled in non-production environments.
   */
  it("Skips Inngest scheduling in development environment", async () => {
    // Arrange: Explicitly set the environment to development.
    vi.stubEnv("NODE_ENV", "development");

    try {
      // Act: Invoke the tracking action.
      const result = await trackSession(sessionData);

      // Assert: Verify success and confirm no background events were sent.
      expect(result.success).toBe(true);
      expect(inngest.send).not.toHaveBeenCalled();
    } finally {
      // Arrange: Restore environment state.
      vi.unstubAllEnvs();
    }
  });

  /**
   * Test case to verify logging when non-Error objects are rejected by the job scheduler.
   */
  it("Handles non-Error objects thrown by Inngest", async () => {
    // Arrange: Force a raw string rejection from the Inngest client in production.
    vi.stubEnv("NODE_ENV", "production");
    vi.mocked(inngest.send).mockRejectedValueOnce("string error");
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      // Act: Trigger the tracking action.
      const result = await trackSession(sessionData);

      // Assert: Verify the warning log uses a fallback message for unknown error types.
      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to schedule session inactivity check:",
        "Unknown error"
      );
    } finally {
      // Arrange: Clean up mocks and environment variables.
      vi.unstubAllEnvs();
      consoleSpy.mockRestore();
    }
  });
});
