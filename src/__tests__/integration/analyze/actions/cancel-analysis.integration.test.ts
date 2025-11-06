"use server";

import { eq } from "drizzle-orm";
import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockUploads, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases, detections, uploads, users } from "@/db/schema";
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
        message: "Analysis has been successfully cancelled.",
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
        message: "Analysis has been successfully cancelled.",
      });

      // Assert: Verify the case status was still set to draft.
      const updatedCase = await db.query.cases.findFirst({
        where: eq(cases.id, mockCases.firstCase.id),
      });
      expect(updatedCase?.status).toBe("draft");
    });

    /**
     * Test case to verify that detections are deleted when cancelling an analysis.
     * This prevents duplicate detections when a user cancels and resubmits.
     */
    it("deletes all detections for the case's uploads", async () => {
      // Arrange: Seed a case with uploads and detections.
      await db.insert(cases).values({
        id: mockCases.firstCase.id,
        userId: mockUsers.primaryUser.id,
        caseName: "Test Case With Detections",
        temperatureCelsius: 20,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
        status: "active",
      });

      // Arrange: Insert uploads for the case.
      await db.insert(uploads).values(mockUploads.firstUpload);

      // Arrange: Insert multiple detections linked to the upload.
      await db.insert(detections).values([
        {
          id: "det-1",
          uploadId: mockUploads.firstUpload.id,
          label: "adult",
          originalLabel: "adult",
          confidence: 0.9,
          originalConfidence: 0.9,
          xMin: 10,
          yMin: 10,
          xMax: 100,
          yMax: 100,
          status: "model_generated",
          createdById: mockUsers.primaryUser.id,
        },
        {
          id: "det-2",
          uploadId: mockUploads.firstUpload.id,
          label: "instar_1",
          originalLabel: "instar_1",
          confidence: 0.85,
          originalConfidence: 0.85,
          xMin: 200,
          yMin: 200,
          xMax: 300,
          yMax: 300,
          status: "model_generated",
          createdById: mockUsers.primaryUser.id,
        },
        {
          id: "det-3",
          uploadId: mockUploads.firstUpload.id,
          label: "instar_2",
          originalLabel: "instar_2",
          confidence: 0.8,
          originalConfidence: 0.8,
          xMin: 400,
          yMin: 400,
          xMax: 500,
          yMax: 500,
          status: "model_generated",
          createdById: mockUsers.primaryUser.id,
        },
      ]);

      // Arrange: Insert an analysis results record.
      await db.insert(analysisResults).values({
        caseId: mockCases.firstCase.id,
        status: "processing",
      });

      // Sanity check: Verify detections exist before cancellation.
      const detectionsBeforeCancel = await db.query.detections.findMany({
        where: eq(detections.uploadId, mockUploads.firstUpload.id),
      });
      expect(detectionsBeforeCancel).toHaveLength(3);

      // Act: Cancel the analysis.
      const result = await cancelAnalysis(validInput);

      // Assert: Verify the cancellation was successful.
      expect(result).toEqual({
        status: "success",
        message: "Analysis has been successfully cancelled.",
      });

      // Assert: Verify all detections were deleted.
      const detectionsAfterCancel = await db.query.detections.findMany({
        where: eq(detections.uploadId, mockUploads.firstUpload.id),
      });
      expect(detectionsAfterCancel).toHaveLength(0);

      // Assert: Verify the analysis results record was deleted.
      const deletedResult = await db.query.analysisResults.findFirst({
        where: eq(analysisResults.caseId, mockCases.firstCase.id),
      });
      expect(deletedResult).toBeNull();

      // Assert: Verify the case status was reverted to draft.
      const updatedCase = await db.query.cases.findFirst({
        where: eq(cases.id, mockCases.firstCase.id),
      });
      expect(updatedCase?.status).toBe("draft");
    });

    /**
     * Test case to verify that cancellation works correctly for cases with multiple uploads.
     */
    it("deletes detections across multiple uploads", async () => {
      // Arrange: Seed a case with multiple uploads.
      await db.insert(cases).values({
        id: mockCases.firstCase.id,
        userId: mockUsers.primaryUser.id,
        caseName: "Test Case With Multiple Uploads",
        temperatureCelsius: 20,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
        status: "active",
      });

      // Arrange: Insert two uploads for the case.
      await db.insert(uploads).values([mockUploads.firstUpload, mockUploads.secondUpload]);

      // Arrange: Insert detections linked to the first upload.
      await db.insert(detections).values([
        {
          id: "det-1",
          uploadId: mockUploads.firstUpload.id,
          label: "adult",
          originalLabel: "adult",
          confidence: 0.9,
          originalConfidence: 0.9,
          xMin: 10,
          yMin: 10,
          xMax: 100,
          yMax: 100,
          status: "model_generated",
          createdById: mockUsers.primaryUser.id,
        },
        {
          id: "det-2",
          uploadId: mockUploads.firstUpload.id,
          label: "instar_1",
          originalLabel: "instar_1",
          confidence: 0.85,
          originalConfidence: 0.85,
          xMin: 200,
          yMin: 200,
          xMax: 300,
          yMax: 300,
          status: "model_generated",
          createdById: mockUsers.primaryUser.id,
        },
      ]);

      // Arrange: Insert a detection linked to the second upload.
      await db.insert(detections).values({
        id: "det-3",
        uploadId: mockUploads.secondUpload.id,
        label: "pupa",
        originalLabel: "pupa",
        confidence: 0.95,
        originalConfidence: 0.95,
        xMin: 50,
        yMin: 50,
        xMax: 150,
        yMax: 150,
        status: "model_generated",
        createdById: mockUsers.primaryUser.id,
      });

      // Arrange: Insert an analysis results record.
      await db.insert(analysisResults).values({
        caseId: mockCases.firstCase.id,
        status: "processing",
      });

      // Sanity check: Verify detections exist across both uploads.
      const firstUploadDetections = await db.query.detections.findMany({
        where: eq(detections.uploadId, mockUploads.firstUpload.id),
      });
      const secondUploadDetections = await db.query.detections.findMany({
        where: eq(detections.uploadId, mockUploads.secondUpload.id),
      });
      expect(firstUploadDetections).toHaveLength(2);
      expect(secondUploadDetections).toHaveLength(1);

      // Act: Cancel the analysis.
      const result = await cancelAnalysis(validInput);

      // Assert: Verify the cancellation was successful.
      expect(result.status).toBe("success");

      // Assert: Verify all detections from both uploads were deleted.
      const allDetectionsAfterCancel = await db.query.detections.findMany({});
      expect(allDetectionsAfterCancel).toHaveLength(0);
    });

    /**
     * Test case to verify that cancellation works correctly for cases with no uploads.
     */
    it("handles cases with no uploads gracefully", async () => {
      // Arrange: Seed only a case with no uploads.
      await db.insert(cases).values({
        id: mockCases.firstCase.id,
        userId: mockUsers.primaryUser.id,
        caseName: "Test Case Without Uploads",
        temperatureCelsius: 20,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
        status: "active",
      });

      await db.insert(analysisResults).values({
        caseId: mockCases.firstCase.id,
        status: "processing",
      });

      // Act: Cancel the analysis.
      const result = await cancelAnalysis(validInput);

      // Assert: Verify the cancellation was successful.
      expect(result).toEqual({
        status: "success",
        message: "Analysis has been successfully cancelled.",
      });

      // Assert: Verify the case status was reverted to draft.
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
      // Arrange: Spy on `console.error` and force a database transaction to fail.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db, "transaction").mockRejectedValue(new Error("Database error"));

      // Act: Attempt to cancel analysis during a database outage.
      const result = await cancelAnalysis(validInput);

      // Assert: Verify the generic database error response and logging.
      expect(result).toEqual({
        status: "error",
        message: "A database error occurred. Please try again.",
      });
      expect(consoleErrorSpy).toHaveBeenCalled();

      // Cleanup: Restore console.error.
      consoleErrorSpy.mockRestore();
    });
  });
});
