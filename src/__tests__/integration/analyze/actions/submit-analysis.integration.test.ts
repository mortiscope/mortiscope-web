"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases, users } from "@/db/schema";
import { submitAnalysis } from "@/features/analyze/actions/submit-analysis";
import { inngest } from "@/lib/inngest";

// Mock the authentication module to control session state for integration tests.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the Inngest client to verify that background jobs are dispatched correctly.
vi.mock("@/lib/inngest", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

// Define a type for the mocked authentication function to facilitate type casting.
type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `submitAnalysis` server action.
 */
describe("submitAnalysis (integration)", () => {
  /**
   * Cleans the database environment and seeds a primary user before each test execution.
   */
  beforeEach(async () => {
    // Arrange: Reset all mocks and clear the database state.
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
   * Test suite for verifying authentication-related security constraints.
   */
  describe("authentication", () => {
    /**
     * Test case to verify that unauthenticated users cannot trigger an analysis.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Force the `auth` function to return a null session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Attempt to submit an analysis without an active session.
      const result = await submitAnalysis({ caseId: "some-id" });

      // Assert: Verify the unauthorized error response.
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });

    /**
     * Test case to verify that sessions lacking a user identifier are treated as unauthorized.
     */
    it("returns error when session has no user id", async () => {
      // Arrange: Force the `auth` function to return a session with an empty user object.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Attempt to submit an analysis with an incomplete session.
      const result = await submitAnalysis({ caseId: "some-id" });

      // Assert: Verify the unauthorized error response.
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });
  });

  /**
   * Test suite for verifying input validation logic for case identifiers.
   */
  describe("input validation", () => {
    /**
     * Sets up a valid authentication session before testing input validation.
     */
    beforeEach(() => {
      // Arrange: Mock a successful authentication session for the primary user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify that malformed UUIDs are rejected.
     */
    it("returns error for invalid input", async () => {
      // Act: Invoke the action with an invalid case identifier format.
      const result = await submitAnalysis({ caseId: "invalid-id" });

      // Assert: Verify the validation error message.
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid input provided.");
    });
  });

  /**
   * Test suite for verifying successful submission logic and side effects.
   */
  describe("successful submission", () => {
    // Define a shared case identifier for success path tests.
    const caseId = mockCases.firstCase.id;

    /**
     * Prepares a valid session and a draft case in the database.
     */
    beforeEach(async () => {
      // Arrange: Mock a successful authentication session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      // Arrange: Seed the `cases` table with a draft record belonging to the test user.
      await db.insert(cases).values({
        id: caseId,
        userId: mockUsers.primaryUser.id,
        caseName: "Test Case",
        status: "draft",
        temperatureCelsius: 20,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
        createdAt: new Date(),
      });
    });

    /**
     * Test case to verify that submission transitions case status and triggers background processes.
     */
    it("updates case status to active and creates analysis result", async () => {
      // Act: Attempt to submit the draft case for analysis.
      const result = await submitAnalysis({ caseId });

      // Assert: Verify the success status and message.
      expect(result.success).toBe(true);
      expect(result.message).toContain("successfully submitted");

      // Assert: Verify the case status was updated to active in the database.
      const updatedCase = await (
        db.query.cases as unknown as { findFirst: (args: unknown) => Promise<{ status: string }> }
      ).findFirst({
        where: { operator: "eq", val: caseId, col: cases.id },
      });
      expect(updatedCase).toBeDefined();
      expect(updatedCase!.status).toBe("active");

      // Assert: Verify a pending analysis result record was created.
      const analysisResult = await (
        db.query.analysisResults as unknown as {
          findFirst: (args: unknown) => Promise<{ status: string }>;
        }
      ).findFirst({
        where: { operator: "eq", val: caseId, col: analysisResults.caseId },
      });
      expect(analysisResult).toBeDefined();
      expect(analysisResult!.status).toBe("pending");

      // Assert: Verify that the background event was dispatched to Inngest.
      expect(inngest.send).toHaveBeenCalledWith({
        name: "analysis/request.sent",
        data: { caseId },
      });
    });

    /**
     * Test case to ensure that cases already in an active state cannot be re-submitted.
     */
    it("returns error if case not found (already active)", async () => {
      // Arrange: Update the seeded case status to active.
      await (
        db.update(cases) as unknown as {
          set: (args: unknown) => { where: (args: unknown) => Promise<void> };
        }
      )
        .set({ status: "active" })
        .where({ operator: "eq", val: caseId, col: cases.id });

      // Act: Attempt to submit the already active case.
      const result = await submitAnalysis({ caseId });

      // Assert: Verify the submission fails because no draft case was found.
      expect(result.success).toBe(false);
      expect(result.error).toContain("Case not found");
    });
  });

  /**
   * Test suite for verifying system resilience and graceful error handling.
   */
  describe("error handling", () => {
    /**
     * Sets up a valid authentication session before testing error scenarios.
     */
    beforeEach(() => {
      // Arrange: Mock a successful authentication session for the primary user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify behavior when a non-existent case ID is provided.
     */
    it("returns error if case does not exist", async () => {
      // Act: Attempt to submit a case ID that is not in the database.
      const result = await submitAnalysis({ caseId: mockCases.firstCase.id });

      // Assert: Verify the case not found error message.
      expect(result.success).toBe(false);
      expect(result.error).toContain("Case not found");
    });

    /**
     * Test case to verify that database exceptions return a standardized internal server error.
     */
    it("handles database errors gracefully", async () => {
      // Arrange: Suppress console error output and force a database rejection.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db.query.cases, "findFirst").mockRejectedValue(
        new Error("Database failure")
      );

      // Act: Attempt to submit an analysis during a database failure.
      const result = await submitAnalysis({ caseId: mockCases.firstCase.id });

      // Assert: Verify the generic error response and that the error was logged.
      expect(result.success).toBe(false);
      expect(result.error).toBe("An internal server error occurred.");
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
