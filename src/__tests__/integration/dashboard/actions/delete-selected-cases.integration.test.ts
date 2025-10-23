"use server";

import { createId } from "@paralleldrive/cuid2";
import { revalidatePath } from "next/cache";
import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockIds, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, users } from "@/db/schema";
import { verifyCurrentPassword } from "@/features/account/actions/verify-current-password";
import { deleteSelectedCases } from "@/features/dashboard/actions/delete-selected-cases";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the password verification action to control security checks.
vi.mock("@/features/account/actions/verify-current-password");

// Mock the Next.js cache module to track path revalidation calls.
vi.mock("next/cache");

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for `deleteSelectedCases` server action.
 */
describe("deleteSelectedCases (integration)", () => {
  // Define a valid password string for use in verification mocks.
  const validPassword = "password123";

  /**
   * Resets the database and mock state before each test execution.
   */
  beforeEach(async () => {
    // Arrange: Reset all mock call history.
    vi.clearAllMocks();

    // Arrange: Wipe the in-memory database to ensure isolation.
    resetMockDb();

    // Arrange: Seed the database with a primary test user.
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
     * Test case to verify that an empty list of identifiers is rejected.
     */
    it("returns error for empty caseIds array", async () => {
      // Act: Invoke the action with an empty `caseIds` array.
      const result = await deleteSelectedCases({
        caseIds: [],
        currentPassword: validPassword,
      });

      // Assert: Verify that a validation error is returned.
      expect(result.error).toBe("Invalid input provided.");
    });

    /**
     * Test case to verify that a missing password prevents execution.
     */
    it("returns error for empty password", async () => {
      // Act: Invoke the action with an empty `currentPassword` string.
      const result = await deleteSelectedCases({
        caseIds: [mockIds.firstCase],
        currentPassword: "",
      });

      // Assert: Verify that a validation error is returned.
      expect(result.error).toBe("Invalid input provided.");
    });
  });

  /**
   * Test suite for verifying session and identity requirements.
   */
  describe("authentication", () => {
    /**
     * Test case to verify that null sessions are handled.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Simulate an unauthenticated state by returning null from `auth`.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Attempt to delete cases without a session.
      const result = await deleteSelectedCases({
        caseIds: [mockIds.firstCase],
        currentPassword: validPassword,
      });

      // Assert: Verify the unauthorized error message.
      expect(result.error).toBe("Authentication required. Please sign in.");
    });

    /**
     * Test case to verify that sessions missing a user identifier are rejected.
     */
    it("returns error when session has no user id", async () => {
      // Arrange: Simulate a session object that lacks a `user.id` property.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Attempt to delete cases with an incomplete session.
      const result = await deleteSelectedCases({
        caseIds: [mockIds.firstCase],
        currentPassword: validPassword,
      });

      // Assert: Verify the unauthorized error message.
      expect(result.error).toBe("Authentication required. Please sign in.");
    });
  });

  /**
   * Test suite for verifying security credential checks.
   */
  describe("password verification", () => {
    /**
     * Test case to verify that incorrect passwords block the deletion.
     */
    it("returns error when password verification fails", async () => {
      // Arrange: Configure an authenticated session for the `primaryUser`.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      // Arrange: Mock the password check to return a failure.
      vi.mocked(verifyCurrentPassword).mockResolvedValue({ error: "Invalid password" });

      // Act: Attempt to delete cases with an incorrect password.
      const result = await deleteSelectedCases({
        caseIds: [mockIds.firstCase],
        currentPassword: "wrong-password",
      });

      // Assert: Verify the specific password error response.
      expect(result.error).toBe("Invalid password.");
    });
  });

  /**
   * Test suite for verifying the core deletion logic and side effects.
   */
  describe("case deletion", () => {
    /**
     * Configures a successful authentication and password check environment.
     */
    beforeEach(() => {
      // Arrange: Mock successful authentication for the `primaryUser`.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      // Arrange: Mock successful password verification.
      vi.mocked(verifyCurrentPassword).mockResolvedValue({ success: "Verified" });
    });

    /**
     * Test case to verify behavior when the targeted IDs do not exist or belong to others.
     */
    it("returns error when no cases found for user", async () => {
      // Act: Attempt to delete a case ID that has not been inserted into the `cases` table.
      const result = await deleteSelectedCases({
        caseIds: [mockIds.firstCase],
        currentPassword: validPassword,
      });

      // Assert: Verify the error message indicating no records were found.
      expect(result.error).toBe("No cases found or you do not have permission to delete them.");

      // Assert: Ensure the cache was not revalidated since no changes occurred.
      expect(revalidatePath).not.toHaveBeenCalled();
    });

    /**
     * Test case to verify the successful removal of a single record.
     */
    it("successfully deletes a single case", async () => {
      // Arrange: Insert a single record into the `cases` table for the test user.
      await db.insert(cases).values({
        ...mockCases.firstCase,
        userId: mockUsers.primaryUser.id,
      });

      // Act: Attempt to delete the inserted record.
      const result = await deleteSelectedCases({
        caseIds: [mockCases.firstCase.id],
        currentPassword: validPassword,
      });

      // Assert: Verify the success response message.
      expect(result.success).toBe("1 case successfully deleted.");

      // Assert: Confirm that the dashboard path was revalidated.
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");

      // Assert: Verify the record is no longer present in the `cases` table.
      const deletedCase = await db.query.cases.findFirst({
        where: (cases, { eq }) => eq(cases.id, mockCases.firstCase.id),
      });
      expect(deletedCase).toBeUndefined();
    });

    /**
     * Test case to verify bulk deletion of multiple records.
     */
    it("successfully deletes multiple cases", async () => {
      // Arrange: Insert two distinct records into the `cases` table.
      await db.insert(cases).values({
        ...mockCases.firstCase,
        userId: mockUsers.primaryUser.id,
      });
      await db.insert(cases).values({
        ...mockCases.secondCase,
        userId: mockUsers.primaryUser.id,
      });

      // Act: Attempt to delete both records in a single call.
      const result = await deleteSelectedCases({
        caseIds: [mockCases.firstCase.id, mockCases.secondCase.id],
        currentPassword: validPassword,
      });

      // Assert: Verify the pluralized success message.
      expect(result.success).toBe("2 cases successfully deleted.");

      // Assert: Confirm that the dashboard path was revalidated.
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard");

      // Assert: Verify both records have been removed from the `cases` table.
      const firstDeletedCase = await db.query.cases.findFirst({
        where: (cases, { eq }) => eq(cases.id, mockCases.firstCase.id),
      });
      const secondDeletedCase = await db.query.cases.findFirst({
        where: (cases, { eq }) => eq(cases.id, mockCases.secondCase.id),
      });
      expect(firstDeletedCase).toBeUndefined();
      expect(secondDeletedCase).toBeUndefined();
    });

    /**
     * Test case to verify that ownership is enforced during deletion.
     */
    it("does not delete cases belonging to other users", async () => {
      // Arrange: Create a second user in the `users` table.
      await db.insert(users).values({
        id: mockUsers.secondaryUser.id,
        email: mockUsers.secondaryUser.email,
        name: mockUsers.secondaryUser.name,
      });

      // Arrange: Insert a record belonging to the second user.
      await db.insert(cases).values({
        ...mockCases.thirdCase,
      });

      // Act: Attempt to delete the second user's case while authenticated as the primary user.
      const result = await deleteSelectedCases({
        caseIds: [mockCases.thirdCase.id],
        currentPassword: validPassword,
      });

      // Assert: Verify that the action returns a permission error.
      expect(result.error).toBe("No cases found or you do not have permission to delete them.");

      // Assert: Confirm the record still exists in the `cases` table.
      const existingCase = await db.query.cases.findFirst({
        where: (cases, { eq }) => eq(cases.id, mockCases.thirdCase.id),
      });
      expect(existingCase).not.toBeNull();
      expect(existingCase?.id).toBe(mockCases.thirdCase.id);
    });
  });

  /**
   * Test suite for verifying system resilience and error boundaries.
   */
  describe("error handling", () => {
    /**
     * Test case to verify that database exceptions are caught.
     */
    it("handles database errors gracefully", async () => {
      // Arrange: Setup valid authentication and password mocks.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
      vi.mocked(verifyCurrentPassword).mockResolvedValue({ success: "Verified" });

      // Arrange: Prevent error logs from cluttering the test output.
      vi.spyOn(console, "error").mockImplementation(() => {});

      // Arrange: Force the database `delete` method to throw an error.
      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db, "delete").mockImplementationOnce(() => {
        throw new Error("Database Error");
      });

      // Act: Attempt the deletion which will trigger the forced database error.
      const result = await deleteSelectedCases({
        caseIds: [createId()],
        currentPassword: validPassword,
      });

      // Assert: Verify the generic error fallback message.
      expect(result.error).toBe("An unexpected error occurred.");
    });
  });
});
