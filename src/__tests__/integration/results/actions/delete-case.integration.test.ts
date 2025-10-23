"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, users } from "@/db/schema";
import { deleteCase } from "@/features/results/actions/delete-case";

// Mock the authentication module to simulate and control user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the Next.js cache module to verify that data is revalidated after deletion.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `deleteCase` server action.
 */
describe("deleteCase (integration)", () => {
  /**
   * Resets the environment and ensures a primary test user exists before each test.
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
   * Test suite for verifying input schema enforcement and validation.
   */
  describe("input validation", () => {
    /**
     * Test case to ensure that malformed UUIDs result in a validation error.
     */
    it("returns error for invalid caseId format", async () => {
      // Arrange: Configure `auth` to return a valid session for the primary user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      // Act: Attempt to delete a case using a malformed `caseId` string.
      const result = await deleteCase({ caseId: "invalid-id" });

      // Assert: Verify that the response returns a validation error message.
      expect(result).toEqual({ error: "Invalid input provided." });
    });

    /**
     * Test case to ensure that empty identifiers are rejected during validation.
     */
    it("returns error for empty caseId", async () => {
      // Arrange: Configure `auth` to return a valid session for the primary user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      // Act: Attempt to delete a case using an empty string.
      const result = await deleteCase({ caseId: "" });

      // Assert: Verify that the response returns a validation error message.
      expect(result).toEqual({ error: "Invalid input provided." });
    });
  });

  /**
   * Test suite focused on enforcing security and authentication boundaries.
   */
  describe("authentication", () => {
    /**
     * Test case to verify that unauthenticated users cannot delete resources.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Configure the `auth` function to return a null session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Attempt to delete a case without an active session.
      const result = await deleteCase({ caseId: mockCases.firstCase.id });

      // Assert: Verify that the response contains an authentication error message.
      expect(result).toEqual({ error: "Authentication required. Please sign in." });
    });

    /**
     * Test case to verify that sessions lacking user identity are rejected.
     */
    it("returns error when session has no user id", async () => {
      // Arrange: Configure `auth` to return a session object missing the `user.id`.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Attempt to delete a case with an incomplete session.
      const result = await deleteCase({ caseId: mockCases.firstCase.id });

      // Assert: Verify that the response contains an authentication error message.
      expect(result).toEqual({ error: "Authentication required. Please sign in." });
    });
  });

  /**
   * Test suite for verifying the core deletion logic and authorization checks.
   */
  describe("case deletion", () => {
    /**
     * Establishes a valid authenticated session before each deletion test.
     */
    beforeEach(() => {
      // Arrange: Simulate an active session for the primary test user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify successful removal of a record owned by the user.
     */
    it("successfully deletes a case belonging to the user", async () => {
      // Arrange: Seed the `cases` table with a record belonging to the primary user.
      await db.insert(cases).values({
        ...mockCases.firstCase,
        userId: mockUsers.primaryUser.id,
      });

      // Act: Invoke the deletion action for the seeded case.
      const result = await deleteCase({ caseId: mockCases.firstCase.id });

      // Assert: Verify that the success response is returned.
      expect(result).toEqual({ success: "Case successfully deleted." });
    });

    /**
     * Test case to verify the response message when a specific case name is provided.
     */
    it("returns success message with case name when provided", async () => {
      // Arrange: Seed a record belonging to the primary user.
      await db.insert(cases).values({
        ...mockCases.firstCase,
        userId: mockUsers.primaryUser.id,
      });

      // Act: Execute deletion while passing a specific `caseName` for the confirmation message.
      const result = await deleteCase({
        caseId: mockCases.firstCase.id,
        caseName: "Test Case",
      });

      // Assert: Verify the custom success message includes the case name.
      expect(result).toEqual({ success: "Test Case successfully deleted." });
    });

    /**
     * Test case to ensure failure when attempting to delete a non-existent identifier.
     */
    it("returns error when case does not exist", async () => {
      // Act: Attempt to delete a case that has not been seeded in the database.
      const result = await deleteCase({ caseId: mockCases.firstCase.id });

      // Assert: Verify that a permission or not found error is returned.
      expect(result).toEqual({
        error: "Case not found or you do not have permission to delete it.",
      });
    });

    /**
     * Test case to verify that users are prohibited from deleting resources owned by others.
     */
    it("returns error when case belongs to another user", async () => {
      // Arrange: Seed a secondary user and a case record associated with them.
      await db.insert(users).values({
        id: mockUsers.secondaryUser.id,
        email: mockUsers.secondaryUser.email,
        name: mockUsers.secondaryUser.name,
      });

      await db.insert(cases).values({
        ...mockCases.firstCase,
        userId: mockUsers.secondaryUser.id,
      });

      // Act: Attempt to delete the secondary user's case while logged in as the primary user.
      const result = await deleteCase({ caseId: mockCases.firstCase.id });

      // Assert: Verify that access is denied with a permission error.
      expect(result).toEqual({
        error: "Case not found or you do not have permission to delete it.",
      });
    });

    /**
     * Test case to verify that the UI cache is purged after a successful deletion.
     */
    it("calls revalidatePath after successful deletion", async () => {
      // Arrange: Import the mocked cache utility and seed a case.
      const { revalidatePath } = await import("next/cache");

      await db.insert(cases).values({
        ...mockCases.firstCase,
        userId: mockUsers.primaryUser.id,
      });

      // Act: Perform a successful deletion.
      await deleteCase({ caseId: mockCases.firstCase.id });

      // Assert: Confirm that `revalidatePath` was called for the `/results` path.
      expect(revalidatePath).toHaveBeenCalledWith("/results");
    });
  });

  /**
   * Test suite for verifying robust behavior during database exceptions.
   */
  describe("error handling", () => {
    /**
     * Sets up a valid authenticated session before each error handling test.
     */
    beforeEach(() => {
      // Arrange: Configure `auth` to return a session for the primary test user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify that unexpected database failures are caught and logged.
     */
    it("handles database errors gracefully", async () => {
      // Arrange: Suppress console error output and force the `delete` operation to throw an error.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db, "delete").mockImplementationOnce(() => {
        throw new Error("Database connection failed");
      });

      // Act: Attempt to delete a case while the database is unresponsive.
      const result = await deleteCase({ caseId: mockCases.firstCase.id });

      // Assert: Verify the generic error response and ensure the error was logged to the console.
      expect(result).toEqual({ error: "An unexpected error occurred. Please try again." });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Database error while deleting case:",
        expect.any(Error)
      );
    });
  });
});
