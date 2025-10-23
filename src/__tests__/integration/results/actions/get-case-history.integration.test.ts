"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockIds, mockLocations, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { caseAuditLogs, cases, users } from "@/db/schema";
import { getCaseHistory } from "@/features/results/actions/get-case-history";

// Mock the authentication module to simulate and control user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Utility function to seed a test case into the database for history retrieval.
 */
const insertTestCase = async (overrides?: { userId?: string }) => {
  // Arrange: Insert a record into the `cases` table with provided or default ownership.
  await db.insert(cases).values({
    id: mockIds.firstCase,
    userId: overrides?.userId ?? mockUsers.primaryUser.id,
    caseName: mockCases.firstCase.caseName,
    temperatureCelsius: mockCases.firstCase.temperatureCelsius,
    ...mockLocations.firstLocation,
    caseDate: new Date("2025-01-15"),
  });
};

/**
 * Utility function to seed audit log entries associated with a specific case.
 */
const insertTestAuditLog = async (overrides: {
  id: string;
  field: string;
  oldValue: unknown;
  newValue: unknown;
  timestamp: Date;
  batchId?: string;
}) => {
  // Arrange: Insert a record into the `caseAuditLogs` table to simulate historical changes.
  await db.insert(caseAuditLogs).values({
    id: overrides.id,
    caseId: mockIds.firstCase,
    userId: mockUsers.primaryUser.id,
    field: overrides.field,
    oldValue: overrides.oldValue as string,
    newValue: overrides.newValue as string,
    timestamp: overrides.timestamp,
    batchId: overrides.batchId ?? `batch-${overrides.id}`,
  });
};

/**
 * Integration test suite for the `getCaseHistory` server action.
 */
describe("getCaseHistory (integration)", () => {
  /**
   * Resets the environment and ensures the primary user exists before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear mock history and reset the database state.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Seed the `users` table with the primary test user.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
      image: null,
    });
  });

  /**
   * Test suite focused on enforcing authentication requirements.
   */
  describe("authentication", () => {
    /**
     * Test case to verify that unauthenticated requests are rejected.
     */
    it("throws error when user is not authenticated", async () => {
      // Arrange: Configure the `auth` module to return no session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act & Assert: Verify that an unauthorized error is thrown.
      await expect(getCaseHistory(mockIds.firstCase)).rejects.toThrow("Unauthorized");
    });

    /**
     * Test case to verify that sessions lacking user identity are rejected.
     */
    it("throws error when session has no user id", async () => {
      // Arrange: Configure `auth` to return a session without a user ID.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act & Assert: Verify that an unauthorized error is thrown.
      await expect(getCaseHistory(mockIds.firstCase)).rejects.toThrow("Unauthorized");
    });
  });

  /**
   * Test suite focused on verifying record-level authorization and existence.
   */
  describe("case access verification", () => {
    /**
     * Establishes a valid authenticated session before each access test.
     */
    beforeEach(() => {
      // Arrange: Simulate an active session for the primary user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify that querying a non-existent case throws an error.
     */
    it("throws error when case does not exist", async () => {
      // Act & Assert: Verify rejection when the `cases` table is empty.
      await expect(getCaseHistory(mockIds.firstCase)).rejects.toThrow(
        "Case not found or access denied."
      );
    });

    /**
     * Test case to verify that users cannot view history for cases they do not own.
     */
    it("throws error when case belongs to another user", async () => {
      // Arrange: Seed a secondary user and a case record belonging to them.
      await db.insert(users).values({
        id: mockIds.secondUser,
        email: mockUsers.secondaryUser.email,
        name: mockUsers.secondaryUser.name,
      });

      await insertTestCase({ userId: mockIds.secondUser });

      // Act & Assert: Verify rejection when the primary user attempts to access the other user's case.
      await expect(getCaseHistory(mockIds.firstCase)).rejects.toThrow(
        "Case not found or access denied."
      );
    });
  });

  /**
   * Test suite for the retrieval and formatting of historical audit logs.
   */
  describe("history retrieval", () => {
    /**
     * Sets up a valid session and case record before each retrieval test.
     */
    beforeEach(async () => {
      // Arrange: Simulate a valid session and seed an owned case.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      await insertTestCase();
    });

    /**
     * Test case to verify the response when no audit logs exist for the case.
     */
    it("returns empty array when no audit logs exist", async () => {
      // Act: Retrieve history for a newly created case with no logs.
      const result = await getCaseHistory(mockIds.firstCase);

      // Assert: Verify that an empty list is returned.
      expect(result).toEqual([]);
    });

    /**
     * Test case to verify that audit logs are returned with related user metadata.
     */
    it("returns audit logs with user details", async () => {
      // Arrange: Seed multiple audit logs for the test case.
      await insertTestAuditLog({
        id: "log-1",
        field: "status",
        oldValue: "pending",
        newValue: "active",
        timestamp: new Date("2025-01-01"),
      });

      await insertTestAuditLog({
        id: "log-2",
        field: "label",
        oldValue: "instar_1",
        newValue: "instar_2",
        timestamp: new Date("2025-01-02"),
      });

      // Act: Retrieve the case history.
      const result = await getCaseHistory(mockIds.firstCase);

      // Assert: Verify log count and the presence of the acting user's name.
      expect(result).toHaveLength(2);
      expect(result[0].user.name).toBe(mockUsers.primaryUser.name);
    });

    /**
     * Test case to verify that history is sorted chronologically descending.
     */
    it("returns audit logs ordered by most recent first", async () => {
      // Arrange: Seed logs with different timestamps.
      await insertTestAuditLog({
        id: "log-1",
        field: "status",
        oldValue: null,
        newValue: "active",
        timestamp: new Date("2025-01-01"),
      });

      await insertTestAuditLog({
        id: "log-2",
        field: "label",
        oldValue: "pupa",
        newValue: "adult",
        timestamp: new Date("2025-01-05"),
      });

      // Act: Retrieve the case history.
      const result = await getCaseHistory(mockIds.firstCase);

      // Assert: Verify that the newest log is at the beginning of the array.
      expect(result[0].timestamp.getTime()).toBeGreaterThan(result[1].timestamp.getTime());
      expect(result[0].field).toBe("label");
      expect(result[1].field).toBe("status");
    });

    /**
     * Test case to verify that user profile images are included in the history.
     */
    it("includes user image when available", async () => {
      // Arrange: Update the test user with a profile image URL and seed a log.
      await db
        .update(users)
        .set({ image: "https://example.com/avatar.png" })
        .where({ id: mockUsers.primaryUser.id } as never);

      await insertTestAuditLog({
        id: "log-1",
        field: "status",
        oldValue: null,
        newValue: "active",
        timestamp: new Date("2025-01-15"),
      });

      // Act: Retrieve the history.
      const result = await getCaseHistory(mockIds.firstCase);

      // Assert: Verify the user image URL is present in the result.
      expect(result[0].user.image).toBe("https://example.com/avatar.png");
    });

    /**
     * Test case to verify that null image fields are handled correctly.
     */
    it("handles user with null image", async () => {
      // Arrange: Seed a log for a user without a profile image.
      await insertTestAuditLog({
        id: "log-1",
        field: "status",
        oldValue: null,
        newValue: "active",
        timestamp: new Date("2025-01-15"),
      });

      // Act: Retrieve the history.
      const result = await getCaseHistory(mockIds.firstCase);

      // Assert: Verify the image property is explicitly null.
      expect(result[0].user.image).toBeNull();
    });
  });
});
