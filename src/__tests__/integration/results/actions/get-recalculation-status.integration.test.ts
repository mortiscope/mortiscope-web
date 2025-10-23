"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockIds, mockLocations, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, users } from "@/db/schema";
import { getRecalculationStatus } from "@/features/results/actions/get-recalculation-status";

// Mock the authentication module to simulate and control user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Utility function to seed a test case into the database for status verification.
 */
const insertTestCase = async (overrides?: {
  id?: string;
  userId?: string;
  recalculationNeeded?: boolean;
}) => {
  // Arrange: Insert a record into the `cases` table with custom flags for status testing.
  await db.insert(cases).values({
    id: overrides?.id ?? mockIds.firstCase,
    userId: overrides?.userId ?? mockUsers.primaryUser.id,
    caseName: mockCases.firstCase.caseName,
    temperatureCelsius: mockCases.firstCase.temperatureCelsius,
    recalculationNeeded: overrides?.recalculationNeeded ?? false,
    ...mockLocations.firstLocation,
    caseDate: new Date("2025-01-15"),
  });
};

/**
 * Integration test suite for the `getRecalculationStatus` server action.
 */
describe("getRecalculationStatus (integration)", () => {
  /**
   * Resets the environment and ensures a test user exists before each test case.
   */
  beforeEach(async () => {
    // Arrange: Clear all mock call history and reset the database state.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Seed the `users` table with the primary test user record.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Test suite focused on security and session-based access control.
   */
  describe("authentication", () => {
    /**
     * Test case to verify that unauthenticated attempts throw a specific error.
     */
    it("throws error when user is not authenticated", async () => {
      // Arrange: Configure the `auth` function to return a null session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act & Assert: Verify that calling the action results in an authentication error.
      await expect(getRecalculationStatus(mockIds.firstCase)).rejects.toThrow(
        "User not authenticated"
      );
    });

    /**
     * Test case to verify that sessions lacking a user ID are rejected.
     */
    it("throws error when session has no user id", async () => {
      // Arrange: Configure `auth` to return a session object without a `user.id` property.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act & Assert: Verify that the absence of identity results in a rejection.
      await expect(getRecalculationStatus(mockIds.firstCase)).rejects.toThrow(
        "User not authenticated"
      );
    });
  });

  /**
   * Test suite for the core retrieval logic and authorization checks.
   */
  describe("status retrieval", () => {
    /**
     * Configures a valid authenticated session for retrieval testing.
     */
    beforeEach(() => {
      // Arrange: Mock `auth` to return a valid session for the primary test user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify that a positive recalculation flag is correctly retrieved.
     */
    it("returns true when recalculation is needed", async () => {
      // Arrange: Insert a case record where `recalculationNeeded` is set to true.
      await insertTestCase({ recalculationNeeded: true });

      // Act: Retrieve the status for the existing `mockIds.firstCase`.
      const result = await getRecalculationStatus(mockIds.firstCase);

      // Assert: Verify the returned boolean value is true.
      expect(result).toBe(true);
    });

    /**
     * Test case to verify that a negative recalculation flag is correctly retrieved.
     */
    it("returns false when recalculation is not needed", async () => {
      // Arrange: Insert a case record where `recalculationNeeded` is set to false.
      await insertTestCase({ recalculationNeeded: false });

      // Act: Retrieve the status for the existing `mockIds.firstCase`.
      const result = await getRecalculationStatus(mockIds.firstCase);

      // Assert: Verify the returned boolean value is false.
      expect(result).toBe(false);
    });

    /**
     * Test case to verify that querying a non-existent case results in a rejection.
     */
    it("throws error when case does not exist", async () => {
      // Act & Assert: Verify that querying an empty database throws a permission or not found error.
      await expect(getRecalculationStatus(mockIds.firstCase)).rejects.toThrow(
        "Case not found or permission denied."
      );
    });

    /**
     * Test case to verify that users cannot view the status of cases owned by others.
     */
    it("throws error when case belongs to another user", async () => {
      // Arrange: Insert a secondary user and a case record owned by that user.
      await db.insert(users).values({
        id: mockIds.secondUser,
        email: mockUsers.secondaryUser.email,
        name: mockUsers.secondaryUser.name,
      });

      await insertTestCase({ userId: mockIds.secondUser });

      // Act & Assert: Verify the primary user is denied access to the secondary user's case.
      await expect(getRecalculationStatus(mockIds.firstCase)).rejects.toThrow(
        "Case not found or permission denied."
      );
    });
  });
});
