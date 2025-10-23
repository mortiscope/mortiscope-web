"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requestRecalculation } from "@/features/results/actions/request-recalculation";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the Next.js cache module to track path revalidation calls.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock the Inngest client to verify event dispatching without external network calls.
vi.mock("@/lib/inngest", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `requestRecalculation` server action.
 */
describe("requestRecalculation (integration)", () => {
  /**
   * Resets the database and mocks to a clean state before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear mock call history and reset the in-memory database.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Seed the `users` table with a primary test user record.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Test suite focused on enforcing security and authentication boundaries.
   */
  describe("authentication", () => {
    /**
     * Test case to verify that unauthenticated requests are rejected.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Configure the `auth` function to return a null session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Attempt to request a recalculation for `mockCases.firstCase.id`.
      const result = await requestRecalculation({ caseId: mockCases.firstCase.id });

      // Assert: Verify that the response contains the unauthorized error message.
      expect(result).toEqual({ error: "Unauthorized: You must be logged in." });
    });

    /**
     * Test case to verify that sessions missing a user identifier are rejected.
     */
    it("returns error when session has no user id", async () => {
      // Arrange: Configure the `auth` function to return a session without a `user.id`.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Invoke the action with a valid `caseId`.
      const result = await requestRecalculation({ caseId: mockCases.firstCase.id });

      // Assert: Verify that the response returns the unauthorized error message.
      expect(result).toEqual({ error: "Unauthorized: You must be logged in." });
    });
  });

  /**
   * Test suite for the core functional requirements of the recalculation request.
   */
  describe("recalculation request", () => {
    /**
     * Configures a valid authenticated session before each functional test.
     */
    beforeEach(() => {
      // Arrange: Mock `auth` to return a session associated with the `mockUsers.primaryUser.id`.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify successful event emission to the background worker.
     */
    it("successfully sends recalculation event to Inngest", async () => {
      // Arrange: Import the mocked `inngest` client.
      const { inngest } = await import("@/lib/inngest");

      // Act: Trigger the recalculation action for the specified `caseId`.
      const result = await requestRecalculation({ caseId: mockCases.firstCase.id });

      // Assert: Confirm the success response and verify the event payload sent to `inngest`.
      expect(result).toEqual({ success: "Recalculation has been started." });
      expect(inngest.send).toHaveBeenCalledWith({
        name: "recalculation/case.requested",
        data: {
          caseId: mockCases.firstCase.id,
        },
      });
    });

    /**
     * Test case to ensure the UI cache is invalidated for the relevant case.
     */
    it("calls revalidatePath with the correct case path", async () => {
      // Arrange: Import the mocked `revalidatePath` function.
      const { revalidatePath } = await import("next/cache");

      // Act: Perform the recalculation request.
      await requestRecalculation({ caseId: mockCases.firstCase.id });

      // Assert: Verify that `revalidatePath` was called with the specific results path.
      expect(revalidatePath).toHaveBeenCalledWith(`/results/${mockCases.firstCase.id}`);
    });
  });

  /**
   * Test suite for verifying robust error handling during the action lifecycle.
   */
  describe("error handling", () => {
    /**
     * Configures a valid authenticated session before each error handling test.
     */
    beforeEach(() => {
      // Arrange: Simulate a valid authenticated user session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to ensure external service failures do not crash the action.
     */
    it("handles Inngest send failure gracefully", async () => {
      // Arrange: Spy on `console.error` and force the `inngest.send` method to reject.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const { inngest } = await import("@/lib/inngest");
      vi.mocked(inngest.send).mockRejectedValue(new Error("Inngest connection failed"));

      // Act: Attempt the recalculation while the background service is down.
      const result = await requestRecalculation({ caseId: mockCases.firstCase.id });

      // Assert: Verify the user receives a generic error and the failure is logged.
      expect(result).toEqual({
        error: "An unexpected error occurred while starting the recalculation.",
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to send recalculation request:",
        expect.any(Error)
      );
    });
  });
});
