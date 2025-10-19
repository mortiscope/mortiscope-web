"use server";

import { eq } from "drizzle-orm";
import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases, users } from "@/db/schema";
import { cancelAnalysis } from "@/features/analyze/actions/cancel-analysis";

// Mock the authentication module to control user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the rate limiter to simulate request throttling.
vi.mock("@/lib/rate-limiter", () => ({
  privateActionLimiter: {
    limit: vi.fn().mockResolvedValue({ success: true }),
  },
}));

// Define a type for the mocked authentication function.
type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `cancelAnalysis` server action.
 */
describe("cancelAnalysis (integration)", () => {
  // Define standard input for testing the action.
  const validInput = {
    caseId: mockCases.firstCase.id,
  };

  /**
   * Cleans the database and seeds a test user before each test execution.
   */
  beforeEach(async () => {
    // Arrange: Reset mock state and clear the database.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Seed the `users` table with a primary test user.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Test suite for verifying authentication-related security checks.
   */
  describe("authentication", () => {
    /**
     * Test case to verify that unauthenticated requests are blocked.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Force the `auth` function to return a null session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Attempt to cancel analysis without a session.
      const result = await cancelAnalysis(validInput);

      // Assert: Verify the unauthorized error response.
      expect(result).toEqual({
        status: "error",
        message: "You must be logged in to perform this action.",
      });
    });

    /**
     * Test case to verify that sessions without a user identifier are treated as unauthenticated.
     */
    it("returns error when session has no user id", async () => {
      // Arrange: Force the `auth` function to return a session with an empty user object.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Attempt to cancel analysis with an incomplete session.
      const result = await cancelAnalysis(validInput);

      // Assert: Verify the unauthorized error response.
      expect(result).toEqual({
        status: "error",
        message: "You must be logged in to perform this action.",
      });
    });
  });

  /**
   * Test suite for verifying the enforcement of rate limits.
   */
  describe("rate limiting", () => {
    /**
     * Establishes a valid session prior to rate limit testing.
     */
    beforeEach(() => {
      // Arrange: Mock a successful authentication session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify that the action fails when the rate limit is reached.
     */
    it("returns error when rate limit exceeded", async () => {
      // Arrange: Force the rate limiter to return a failure status.
      const { privateActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(privateActionLimiter.limit).mockResolvedValue({ success: false } as never);

      // Act: Attempt to cancel analysis while rate limited.
      const result = await cancelAnalysis(validInput);

      // Assert: Verify the rate limit error response.
      expect(result).toEqual({
        status: "error",
        message: "Rate limit exceeded. Please try again later.",
      });
    });
  });

  /**
   * Test suite for verifying input schema validation.
   */
  describe("input validation", () => {
    /**
     * Sets up valid session and rate limit states for validation tests.
     */
    beforeEach(async () => {
      // Arrange: Mock a successful authentication session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      // Arrange: Ensure the rate limiter allows the request.
      const { privateActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(privateActionLimiter.limit).mockResolvedValue({ success: true } as never);
    });

    /**
     * Test case to verify rejection of malformed case identifiers.
     */
    it("returns error for invalid caseId", async () => {
      // Act: Invoke the action with an invalid UUID format.
      const result = await cancelAnalysis({
        caseId: "invalid-id",
      } as never);

      // Assert: Verify the validation error response.
      expect(result).toEqual({
        status: "error",
        message: "Invalid input provided. Please try again.",
      });
    });

    /**
     * Test case to verify rejection of empty case identifiers.
     */
    it("returns error for empty caseId", async () => {
      // Act: Invoke the action with an empty string.
      const result = await cancelAnalysis({
        caseId: "",
      } as never);

      // Assert: Verify the validation error response.
      expect(result).toEqual({
        status: "error",
        message: "Invalid input provided. Please try again.",
      });
    });
  });

  /**
   * Test suite for successful analysis cancellation paths.
   */
  describe("successful cancellation", () => {
    /**
     * Sets up valid preconditions for successful cancellation tests.
     */
    beforeEach(async () => {
      // Arrange: Mock a successful authentication session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      // Arrange: Ensure the rate limiter allows the request.
      const { privateActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(privateActionLimiter.limit).mockResolvedValue({ success: true } as never);
    });

    /**
     * Test case to verify side effects of a successful cancellation.
     */
    it("successfully cancels analysis and returns success", async () => {
      // Arrange: Seed an active case and a corresponding analysis result record.
      await db.insert(cases).values({
        id: mockCases.firstCase.id,
        userId: mockUsers.primaryUser.id,
        caseName: "Test Case",
        temperatureCelsius: 20,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
      });

      await db.insert(analysisResults).values({
        caseId: mockCases.firstCase.id,
        status: "processing",
      });

      // Act: Attempt to cancel the analysis.
      const result = await cancelAnalysis(validInput);

      // Assert: Verify the success response message.
      expect(result).toEqual({
        status: "success",
        message: "Analysis cancelled. Your case is now editable again.",
      });

      // Assert: Verify the `analysisResults` record was deleted from the database.
      const deletedResult = await db.query.analysisResults.findFirst({
        where: eq(analysisResults.caseId, mockCases.firstCase.id),
      });
      expect(deletedResult).toBeNull();

      // Assert: Verify the `cases` record status was reverted to draft.
      const updatedCase = await db.query.cases.findFirst({
        where: eq(cases.id, mockCases.firstCase.id),
      });
      expect(updatedCase?.status).toBe("draft");
    });

    /**
     * Test case to verify behavior when a cancellation is requested for a case without an active analysis.
     */
    it("returns success when analysis not found", async () => {
      // Arrange: Seed only the case record without any analysis results.
      await db.insert(cases).values({
        id: mockCases.firstCase.id,
        userId: mockUsers.primaryUser.id,
        caseName: "Test Case",
        temperatureCelsius: 20,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
      });

      // Act: Attempt to cancel analysis where none exists.
      const result = await cancelAnalysis(validInput);

      // Assert: Verify success response (idempotency).
      expect(result).toEqual({
        status: "success",
        message: "Analysis cancelled. Your case is now editable again.",
      });

      // Assert: Verify the case status was still set to draft.
      const updatedCase = await db.query.cases.findFirst({
        where: eq(cases.id, mockCases.firstCase.id),
      });
      expect(updatedCase?.status).toBe("draft");
    });
  });

  /**
   * Test suite for verifying handling of unexpected system failures.
   */
  describe("error handling", () => {
    /**
     * Sets up valid session and rate limit states for error handling tests.
     */
    beforeEach(async () => {
      // Arrange: Mock a successful authentication session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      // Arrange: Ensure the rate limiter allows the request.
      const { privateActionLimiter } = await import("@/lib/rate-limiter");
      vi.mocked(privateActionLimiter.limit).mockResolvedValue({ success: true } as never);
    });

    /**
     * Test case to verify that database exceptions are caught and reported as errors.
     */
    it("handles database errors gracefully", async () => {
      // Arrange: Spy on `console.error` and force a database deletion to fail.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db, "delete").mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      } as never);

      // Act: Attempt to cancel analysis during a database outage.
      const result = await cancelAnalysis(validInput);

      // Assert: Verify the generic database error response and logging.
      expect(result).toEqual({
        status: "error",
        message: "A database error occurred. Please try again.",
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
