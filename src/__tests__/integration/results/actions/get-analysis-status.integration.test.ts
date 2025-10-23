"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockIds, mockLocations, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases, users } from "@/db/schema";
import { getAnalysisStatus } from "@/features/results/actions/get-analysis-status";

// Mock the authentication module to simulate and control user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Utility function to seed a test case into the database.
 */
const insertTestCase = async (overrides?: { userId?: string }) => {
  // Arrange: Insert a record into the `cases` table with specific ownership and mock data.
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
 * Utility function to seed an analysis result record with a specific status.
 */
const insertTestAnalysisResult = async (
  status: "pending" | "processing" | "completed" | "failed"
) => {
  // Arrange: Insert a record into the `analysisResults` table linked to the primary test case.
  await db.insert(analysisResults).values({
    caseId: mockIds.firstCase,
    status,
  });
};

/**
 * Integration test suite for the `getAnalysisStatus` server action.
 */
describe("getAnalysisStatus (integration)", () => {
  /**
   * Resets the database and seeds a primary user record before each test execution.
   */
  beforeEach(async () => {
    // Arrange: Clear mock call history and reset the database state.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Seed the `users` table with the primary test user.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Test suite focused on enforcing authentication and session security.
   */
  describe("authentication", () => {
    /**
     * Test case to verify that unauthenticated users trigger a rejection.
     */
    it("throws error when user is not authenticated", async () => {
      // Arrange: Configure the `auth` module to return a null session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act & Assert: Verify that the retrieval attempt results in an authentication error.
      await expect(getAnalysisStatus(mockIds.firstCase)).rejects.toThrow("User not authenticated");
    });

    /**
     * Test case to verify that sessions missing a user identifier are rejected.
     */
    it("throws error when session has no user id", async () => {
      // Arrange: Configure `auth` to return a session object without a `user.id` property.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act & Assert: Verify that the retrieval attempt results in an authentication error.
      await expect(getAnalysisStatus(mockIds.firstCase)).rejects.toThrow("User not authenticated");
    });
  });

  /**
   * Test suite for verifying the retrieval of analysis lifecycle states.
   */
  describe("status retrieval", () => {
    /**
     * Sets up a valid session and case record before each retrieval test.
     */
    beforeEach(async () => {
      // Arrange: Simulate a valid authenticated session for the primary user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      // Arrange: Seed the case record to be queried.
      await insertTestCase();
    });

    /**
     * Test case to verify the fallback status when no result record exists.
     */
    it("returns 'pending' when no analysis result exists", async () => {
      // Act: Retrieve status for a case that has no record in the `analysisResults` table.
      const result = await getAnalysisStatus(mockIds.firstCase);

      // Assert: Verify that the status defaults to `pending`.
      expect(result).toBe("pending");
    });

    /**
     * Test case to verify the retrieval of the `processing` state.
     */
    it("returns 'processing' status correctly", async () => {
      // Arrange: Seed an analysis record with a `processing` status.
      await insertTestAnalysisResult("processing");

      // Act: Retrieve the analysis status.
      const result = await getAnalysisStatus(mockIds.firstCase);

      // Assert: Verify the returned string matches the database value.
      expect(result).toBe("processing");
    });

    /**
     * Test case to verify the retrieval of the `completed` state.
     */
    it("returns 'completed' status correctly", async () => {
      // Arrange: Seed an analysis record with a `completed` status.
      await insertTestAnalysisResult("completed");

      // Act: Retrieve the analysis status.
      const result = await getAnalysisStatus(mockIds.firstCase);

      // Assert: Verify the returned string matches the database value.
      expect(result).toBe("completed");
    });

    /**
     * Test case to verify the retrieval of the `failed` state.
     */
    it("returns 'failed' status correctly", async () => {
      // Arrange: Seed an analysis record with a `failed` status.
      await insertTestAnalysisResult("failed");

      // Act: Retrieve the analysis status.
      const result = await getAnalysisStatus(mockIds.firstCase);

      // Assert: Verify the returned string matches the database value.
      expect(result).toBe("failed");
    });

    /**
     * Test case to verify the retrieval of the explicit `pending` state.
     */
    it("returns 'pending' status correctly", async () => {
      // Arrange: Seed an analysis record with an explicit `pending` status.
      await insertTestAnalysisResult("pending");

      // Act: Retrieve the analysis status.
      const result = await getAnalysisStatus(mockIds.firstCase);

      // Assert: Verify the returned string matches the database value.
      expect(result).toBe("pending");
    });
  });

  /**
   * Test suite for verifying authorization and resource boundaries.
   */
  describe("authorization", () => {
    /**
     * Configures a valid session for the primary user before authorization tests.
     */
    beforeEach(() => {
      // Arrange: Simulate an active session for the primary test user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to ensure users cannot view analysis states for cases they do not own.
     */
    it("returns 'pending' when case belongs to another user", async () => {
      // Arrange: Seed a secondary user and a completed analysis belonging to them.
      await db.insert(users).values({
        id: mockIds.secondUser,
        email: mockUsers.secondaryUser.email,
        name: mockUsers.secondaryUser.name,
      });

      await insertTestCase({ userId: mockIds.secondUser });
      await insertTestAnalysisResult("completed");

      // Act: Attempt to retrieve the status for the other user's case.
      const result = await getAnalysisStatus(mockIds.firstCase);

      // Assert: Verify that access is denied by returning the default `pending` status.
      expect(result).toBe("pending");
    });

    /**
     * Test case to ensure querying non-existent resources results in a default status.
     */
    it("returns 'pending' when case does not exist", async () => {
      // Act: Retrieve the status for a `caseId` that does not exist in the database.
      const result = await getAnalysisStatus("non-existent-case-id");

      // Assert: Verify that the response defaults to `pending`.
      expect(result).toBe("pending");
    });
  });
});
