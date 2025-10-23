"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  mockCases,
  mockIds,
  mockLocations,
  mockUploads,
  mockUsers,
} from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases, detections, uploads, users } from "@/db/schema";
import { getCases } from "@/features/results/actions/get-cases";

// Mock the authentication module to simulate user sessions and verify identity.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Utility function to seed a test case into the database.
 */
const insertTestCase = async (overrides?: {
  id?: string;
  caseName?: string;
  status?: "draft" | "active";
  userId?: string;
}) => {
  // Arrange: Insert a record into the `cases` table with specific state and owner.
  await db.insert(cases).values({
    id: overrides?.id ?? mockIds.firstCase,
    userId: overrides?.userId ?? mockUsers.primaryUser.id,
    caseName: overrides?.caseName ?? mockCases.firstCase.caseName,
    status: overrides?.status ?? "active",
    temperatureCelsius: mockCases.firstCase.temperatureCelsius,
    ...mockLocations.firstLocation,
    caseDate: new Date("2025-01-15"),
  });
};

/**
 * Utility function to seed an upload record associated with a case.
 */
const insertTestUpload = async (overrides?: { id?: string; caseId?: string }) => {
  // Arrange: Insert a record into the `uploads` table for a specific case.
  await db.insert(uploads).values({
    id: overrides?.id ?? mockIds.firstUpload,
    key: mockUploads.firstUpload.key,
    name: mockUploads.firstUpload.name,
    url: mockUploads.firstUpload.url,
    size: mockUploads.firstUpload.size,
    type: mockUploads.firstUpload.type,
    width: mockUploads.firstUpload.width,
    height: mockUploads.firstUpload.height,
    userId: mockUsers.primaryUser.id,
    caseId: overrides?.caseId ?? mockIds.firstCase,
  });
};

/**
 * Utility function to seed a detection result with a specific lifecycle status.
 */
const insertTestDetection = async (overrides: {
  id: string;
  uploadId: string;
  status:
    | "model_generated"
    | "user_created"
    | "user_confirmed"
    | "user_edited"
    | "user_edited_confirmed";
  deletedAt?: Date | null;
}) => {
  // Arrange: Insert a record into the `detections` table to simulate AI or user input.
  await db.insert(detections).values({
    id: overrides.id,
    uploadId: overrides.uploadId,
    label: "adult",
    originalLabel: "adult",
    confidence: 0.9,
    originalConfidence: 0.9,
    xMin: 100,
    yMin: 100,
    xMax: 200,
    yMax: 200,
    status: overrides.status,
    createdById: mockUsers.primaryUser.id,
    deletedAt: overrides.deletedAt ?? null,
  });
};

/**
 * Utility function to seed an analysis result for a case.
 */
const insertTestAnalysisResult = async (caseId: string, pmiHours: number) => {
  // Arrange: Insert a record into the `analysisResults` table.
  await db.insert(analysisResults).values({
    caseId,
    status: "completed",
    pmiHours,
  });
};

/**
 * Integration test suite for the `getCases` server action.
 */
describe("getCases (integration)", () => {
  /**
   * Resets the environment and ensures a primary user exists before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear mock call history and reset the database.
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
   * Test suite for verifying access control.
   */
  describe("authentication", () => {
    /**
     * Test case to verify that unauthenticated users are barred from fetching cases.
     */
    it("throws error when user is not authenticated", async () => {
      // Arrange: Configure `auth` to return a null session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act & Assert: Verify that the retrieval attempt is rejected.
      await expect(getCases()).rejects.toThrow("User not authenticated");
    });

    /**
     * Test case to verify that sessions without user metadata are rejected.
     */
    it("throws error when session has no user id", async () => {
      // Arrange: Configure `auth` to return an incomplete session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act & Assert: Verify that the retrieval attempt is rejected.
      await expect(getCases()).rejects.toThrow("User not authenticated");
    });
  });

  /**
   * Test suite for verifying the logic and aggregation of case data.
   */
  describe("cases retrieval", () => {
    /**
     * Establishes a valid authenticated session for retrieval testing.
     */
    beforeEach(() => {
      // Arrange: Mock the session for the primary test user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify the response format when the user has no data.
     */
    it("returns empty array when no cases exist", async () => {
      // Act: Retrieve cases for a user with an empty database.
      const result = await getCases();

      // Assert: Verify that an empty list is returned.
      expect(result).toEqual([]);
    });

    /**
     * Test case to verify the `verified` status when all detections have user approval.
     */
    it("returns cases with verification status 'verified' when all detections verified", async () => {
      // Arrange: Seed a case, upload, confirmed detections, and an analysis result.
      await insertTestCase();
      await insertTestUpload();
      await insertTestDetection({
        id: "det-1",
        uploadId: mockIds.firstUpload,
        status: "user_confirmed",
      });
      await insertTestDetection({
        id: "det-2",
        uploadId: mockIds.firstUpload,
        status: "user_edited_confirmed",
      });
      await insertTestAnalysisResult(mockIds.firstCase, 24);

      // Act: Retrieve the case list.
      const result = await getCases();

      // Assert: Verify the verification status and detection presence flag.
      expect(result[0].verificationStatus).toBe("verified");
      expect(result[0].hasDetections).toBe(true);
    });

    /**
     * Test case to verify the `unverified` status when detections are AI-only.
     */
    it("returns cases with verification status 'unverified' when all detections unverified", async () => {
      // Arrange: Seed a case with only model-generated detections.
      await insertTestCase();
      await insertTestUpload();
      await insertTestDetection({
        id: "det-1",
        uploadId: mockIds.firstUpload,
        status: "model_generated",
      });
      await insertTestDetection({
        id: "det-2",
        uploadId: mockIds.firstUpload,
        status: "model_generated",
      });

      // Act: Retrieve the case list.
      const result = await getCases();

      // Assert: Verify the status reflects that no user confirmation has occurred.
      expect(result[0].verificationStatus).toBe("unverified");
    });

    /**
     * Test case to verify the `in_progress` status for partially verified cases.
     */
    it("returns cases with verification status 'in_progress' when mixed", async () => {
      // Arrange: Seed a case with both confirmed and unconfirmed detections.
      await insertTestCase();
      await insertTestUpload();
      await insertTestDetection({
        id: "det-1",
        uploadId: mockIds.firstUpload,
        status: "user_confirmed",
      });
      await insertTestDetection({
        id: "det-2",
        uploadId: mockIds.firstUpload,
        status: "model_generated",
      });

      // Act: Retrieve the case list.
      const result = await getCases();

      // Assert: Verify the status reflects an ongoing verification process.
      expect(result[0].verificationStatus).toBe("in_progress");
    });

    /**
     * Test case to verify the status when a case has uploads but no detection records.
     */
    it("returns cases with verification status 'no_detections' when empty", async () => {
      // Arrange: Seed a case and upload without any detections.
      await insertTestCase();
      await insertTestUpload();

      // Act: Retrieve the case list.
      const result = await getCases();

      // Assert: Verify flags indicate a lack of detection data.
      expect(result[0].verificationStatus).toBe("no_detections");
      expect(result[0].hasDetections).toBe(false);
    });

    /**
     * Test case to verify detection count calculations.
     */
    it("calculates totalDetections and verifiedDetections correctly", async () => {
      // Arrange: Seed a case with a mix of three detections, two of which are verified.
      await insertTestCase();
      await insertTestUpload();
      await insertTestDetection({
        id: "det-1",
        uploadId: mockIds.firstUpload,
        status: "user_confirmed",
      });
      await insertTestDetection({
        id: "det-2",
        uploadId: mockIds.firstUpload,
        status: "user_edited_confirmed",
      });
      await insertTestDetection({
        id: "det-3",
        uploadId: mockIds.firstUpload,
        status: "model_generated",
      });

      // Act: Retrieve the case list.
      const result = await getCases();

      // Assert: Verify the numerical counts for total and verified items.
      expect(result[0].totalDetections).toBe(3);
      expect(result[0].verifiedDetections).toBe(2);
    });

    /**
     * Test case to verify that detections from multiple uploads are summed correctly.
     */
    it("aggregates detections across multiple uploads", async () => {
      // Arrange: Seed one case with two different uploads, each containing one detection.
      await insertTestCase();
      await insertTestUpload({ id: mockIds.firstUpload, caseId: mockIds.firstCase });
      await insertTestUpload({ id: mockIds.secondUpload, caseId: mockIds.firstCase });
      await insertTestDetection({
        id: "det-1",
        uploadId: mockIds.firstUpload,
        status: "user_confirmed",
      });
      await insertTestDetection({
        id: "det-2",
        uploadId: mockIds.secondUpload,
        status: "model_generated",
      });

      // Act: Retrieve the case list.
      const result = await getCases();

      // Assert: Verify aggregated counts and status across both uploads.
      expect(result[0].totalDetections).toBe(2);
      expect(result[0].verifiedDetections).toBe(1);
      expect(result[0].verificationStatus).toBe("in_progress");
    });

    /**
     * Test case to verify data integrity for cases without any associated uploads.
     */
    it("handles cases with no uploads", async () => {
      // Arrange: Seed a case record only.
      await insertTestCase();

      // Act: Retrieve the case list.
      const result = await getCases();

      // Assert: Verify default values for detection properties.
      expect(result[0].verificationStatus).toBe("no_detections");
      expect(result[0].hasDetections).toBe(false);
      expect(result[0].totalDetections).toBe(0);
    });

    /**
     * Test case to verify that multiple case records are returned.
     */
    it("returns multiple cases correctly", async () => {
      // Arrange: Seed two distinct cases with their own uploads and detections.
      await insertTestCase({ id: mockIds.firstCase, caseName: "Case 1" });
      await insertTestCase({ id: mockIds.secondCase, caseName: "Case 2" });
      await insertTestUpload({ id: mockIds.firstUpload, caseId: mockIds.firstCase });
      await insertTestUpload({ id: mockIds.secondUpload, caseId: mockIds.secondCase });
      await insertTestDetection({
        id: "det-1",
        uploadId: mockIds.firstUpload,
        status: "user_confirmed",
      });
      await insertTestDetection({
        id: "det-2",
        uploadId: mockIds.secondUpload,
        status: "model_generated",
      });

      // Act: Retrieve the case list.
      const result = await getCases();

      // Assert: Verify the expected list length.
      expect(result).toHaveLength(2);
    });

    /**
     * Test case to verify that soft-deleted detections are ignored in calculations.
     */
    it("excludes soft-deleted detections from counts", async () => {
      // Arrange: Seed a case with one active detection and one soft-deleted detection.
      await insertTestCase();
      await insertTestUpload();
      await insertTestDetection({
        id: "det-1",
        uploadId: mockIds.firstUpload,
        status: "user_confirmed",
      });
      await insertTestDetection({
        id: "det-2",
        uploadId: mockIds.firstUpload,
        status: "model_generated",
        deletedAt: new Date(),
      });

      // Act: Retrieve the case list.
      const result = await getCases();

      // Assert: Verify that only the non-deleted record is counted.
      expect(result[0].totalDetections).toBe(1);
      expect(result[0].verificationStatus).toBe("verified");
    });

    /**
     * Test case to ensure draft cases are filtered out from the results.
     */
    it("only returns active cases, not drafts", async () => {
      // Arrange: Seed one active case and one draft case.
      await insertTestCase({ id: mockIds.firstCase, status: "active" });
      await insertTestCase({ id: mockIds.secondCase, status: "draft" });

      // Act: Retrieve the case list.
      const result = await getCases();

      // Assert: Verify that only the active record is returned.
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(mockIds.firstCase);
    });
  });
});
