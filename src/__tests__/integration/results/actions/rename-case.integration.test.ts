"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockIds, mockLocations, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, users } from "@/db/schema";
import { renameCase } from "@/features/results/actions/rename-case";

// Mock the authentication module to simulate and control user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the Next.js cache module to verify that data is revalidated after updates.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock the logging utility to prevent side effects and verify error reporting.
vi.mock("@/lib/logger", () => ({
  caseLogger: {},
  logError: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Utility function to seed a test case into the database.
 */
const insertTestCase = async (overrides?: { userId?: string; caseName?: string }) => {
  // Arrange: Insert a record into the `cases` table with provided or default mock values.
  await db.insert(cases).values({
    id: mockIds.firstCase,
    userId: overrides?.userId ?? mockUsers.primaryUser.id,
    caseName: overrides?.caseName ?? mockCases.firstCase.caseName,
    temperatureCelsius: mockCases.firstCase.temperatureCelsius,
    ...mockLocations.firstLocation,
    caseDate: new Date("2025-01-15"),
  });
};

/**
 * Integration test suite for the `renameCase` server action.
 */
describe("renameCase (integration)", () => {
  /**
   * Resets the environment and ensures a primary user exists before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear mock calls and reset the database state.
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
   * Test suite for verifying input schema enforcement.
   */
  describe("input validation", () => {
    /**
     * Establishes an authenticated session for validation testing.
     */
    beforeEach(() => {
      // Arrange: Configure `auth` to return a valid session for the primary user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to ensure invalid UUID formats are rejected.
     */
    it("returns error for invalid caseId format", async () => {
      // Act: Attempt to rename using a malformed `caseId` string.
      const result = await renameCase({ caseId: "invalid-id", newName: "New Name" });

      // Assert: Verify that the response returns a validation error.
      expect(result).toEqual({
        error: "Invalid input. Please check the details and try again.",
      });
    });

    /**
     * Test case to ensure the new name cannot be an empty string.
     */
    it("returns error for empty newName", async () => {
      // Act: Attempt to rename with an empty `newName` value.
      const result = await renameCase({ caseId: mockIds.firstCase, newName: "" });

      // Assert: Verify that the response returns a validation error.
      expect(result).toEqual({
        error: "Invalid input. Please check the details and try again.",
      });
    });

    /**
     * Test case to ensure name length constraints are enforced.
     */
    it("returns error for newName exceeding 256 characters", async () => {
      // Arrange: Generate a string that exceeds the database schema limit.
      const longName = "a".repeat(257);

      // Act: Attempt to rename with the oversized string.
      const result = await renameCase({ caseId: mockIds.firstCase, newName: longName });

      // Assert: Verify that the response returns a validation error.
      expect(result).toEqual({
        error: "Invalid input. Please check the details and try again.",
      });
    });
  });

  /**
   * Test suite for verifying identity and access management.
   */
  describe("authentication", () => {
    /**
     * Test case to ensure anonymous users cannot perform renames.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Mock the `auth` module to return no session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Attempt to rename a case without a session.
      const result = await renameCase({
        caseId: mockIds.firstCase,
        newName: "New Name",
      });

      // Assert: Verify that the response returns an authentication error.
      expect(result).toEqual({ error: "You must be logged in to rename a case." });
    });

    /**
     * Test case to verify that sessions without a user ID are treated as unauthenticated.
     */
    it("returns error when session has no user id", async () => {
      // Arrange: Mock `auth` to return a session object lacking identity data.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Attempt to rename a case with an incomplete session.
      const result = await renameCase({
        caseId: mockIds.firstCase,
        newName: "New Name",
      });

      // Assert: Verify that the response returns an authentication error.
      expect(result).toEqual({ error: "You must be logged in to rename a case." });
    });
  });

  /**
   * Test suite for the core renaming logic and authorization checks.
   */
  describe("case renaming", () => {
    /**
     * Sets up a valid authenticated session for logic testing.
     */
    beforeEach(() => {
      // Arrange: Simulate an active session for the primary test user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify successful database updates for owned records.
     */
    it("successfully renames a case belonging to the user", async () => {
      // Arrange: Create a case record owned by the authenticated user.
      await insertTestCase();

      // Act: Execute the rename action with a valid new name.
      const result = await renameCase({
        caseId: mockIds.firstCase,
        newName: "Renamed Case",
      });

      // Assert: Confirm the success response message.
      expect(result).toEqual({ success: "Case renamed successfully." });
    });

    /**
     * Test case to ensure renames fail for non-existent case IDs.
     */
    it("returns error when case does not exist", async () => {
      // Act: Attempt to rename a case that has not been inserted into the database.
      const result = await renameCase({
        caseId: mockIds.firstCase,
        newName: "New Name",
      });

      // Assert: Verify that the response returns a not found or permission error.
      expect(result).toEqual({
        error: "Case not found or you don't have permission to rename it.",
      });
    });

    /**
     * Test case to verify that users cannot rename cases owned by others.
     */
    it("returns error when case belongs to another user", async () => {
      // Arrange: Insert a secondary user and a case record linked to that user.
      await db.insert(users).values({
        id: mockIds.secondUser,
        email: mockUsers.secondaryUser.email,
        name: mockUsers.secondaryUser.name,
      });

      await insertTestCase({ userId: mockIds.secondUser });

      // Act: Attempt to rename the secondary user's case while logged in as the primary user.
      const result = await renameCase({
        caseId: mockIds.firstCase,
        newName: "New Name",
      });

      // Assert: Verify that the unauthorized access is blocked with an error.
      expect(result).toEqual({
        error: "Case not found or you don't have permission to rename it.",
      });
    });

    /**
     * Test case to verify that the results path is purged from the cache after a rename.
     */
    it("calls revalidatePath after successful rename", async () => {
      // Arrange: Import the mocked cache function and seed a case.
      const { revalidatePath } = await import("next/cache");

      await insertTestCase();

      // Act: Successfully rename the seeded case.
      await renameCase({
        caseId: mockIds.firstCase,
        newName: "Updated Name",
      });

      // Assert: Confirm that `revalidatePath` was triggered for the `/results` route.
      expect(revalidatePath).toHaveBeenCalledWith("/results");
    });
  });

  /**
   * Test suite for verifying database exception handling.
   */
  describe("error handling", () => {
    /**
     * Sets up a valid authenticated session for error handling tests.
     */
    beforeEach(() => {
      // Arrange: Configure the `auth` module to return the primary user session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify handling of unique constraint violations.
     */
    it("handles duplicate name constraint error", async () => {
      // Arrange: Seed an initial case and mock the database to throw a unique violation error.
      await insertTestCase();

      const dbModule = await import("@/db");
      const duplicateError = new Error("Duplicate key") as Error & { code: string };
      duplicateError.code = "23505";
      vi.spyOn(dbModule.db, "update").mockImplementation(() => {
        throw duplicateError;
      });

      // Act: Attempt to rename the case to a name that triggers the mocked constraint.
      const result = await renameCase({
        caseId: mockIds.firstCase,
        newName: "Duplicate Name",
      });

      // Assert: Verify that a user-friendly duplicate name error is returned.
      expect(result).toEqual({
        error: "A case with this name already exists. Please choose a different name.",
      });
    });

    /**
     * Test case to verify fallback for unhandled database exceptions.
     */
    it("handles unexpected database errors", async () => {
      // Arrange: Seed an initial case and force the database update to fail generically.
      await insertTestCase();

      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db, "update").mockImplementation(() => {
        throw new Error("Database connection failed");
      });

      // Act: Attempt to rename the case while the database is failing.
      const result = await renameCase({
        caseId: mockIds.firstCase,
        newName: "New Name",
      });

      // Assert: Verify that a generic unexpected error message is returned to the user.
      expect(result).toEqual({ error: "An unexpected error occurred. Please try again." });
    });
  });
});
