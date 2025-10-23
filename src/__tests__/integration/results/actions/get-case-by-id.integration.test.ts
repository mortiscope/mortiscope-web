"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  mockCases,
  mockDetections,
  mockIds,
  mockLocations,
  mockUploads,
  mockUsers,
} from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases, detections, uploads, users } from "@/db/schema";
import { getCaseById } from "@/features/results/actions/get-case-by-id";

// Mock the authentication module to simulate and control user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock Next.js navigation to verify that missing resources trigger a not found error.
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Utility function to seed a test case into the database.
 */
const insertTestCase = async (overrides?: { userId?: string }) => {
  // Arrange: Insert a record into the `cases` table with provided or default ownership.
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
 * Utility function to seed an upload record for a specific case.
 */
const insertTestUpload = async (overrides?: { id?: string }) => {
  // Arrange: Insert a record into the `uploads` table linked to the first test case.
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
    caseId: mockIds.firstCase,
  });
};

/**
 * Utility function to seed a detection record for a specific upload.
 */
const insertTestDetection = async (overrides: {
  id: string;
  uploadId: string;
  deletedAt?: Date | null;
}) => {
  // Arrange: Insert a record into the `detections` table with optional soft-deletion state.
  await db.insert(detections).values({
    id: overrides.id,
    uploadId: overrides.uploadId,
    label: mockDetections.adultDetection.label,
    originalLabel: mockDetections.adultDetection.originalLabel,
    confidence: mockDetections.adultDetection.confidence,
    originalConfidence: mockDetections.adultDetection.originalConfidence,
    xMin: mockDetections.adultDetection.xMin,
    yMin: mockDetections.adultDetection.yMin,
    xMax: mockDetections.adultDetection.xMax,
    yMax: mockDetections.adultDetection.yMax,
    status: "model_generated",
    createdById: mockUsers.primaryUser.id,
    deletedAt: overrides.deletedAt ?? null,
  });
};

/**
 * Utility function to seed an analysis result for the current test case.
 */
const insertTestAnalysisResult = async (pmiHours: number) => {
  // Arrange: Insert a record into the `analysisResults` table with specified PMI data.
  await db.insert(analysisResults).values({
    caseId: mockIds.firstCase,
    status: "completed",
    pmiHours,
  });
};

/**
 * Integration test suite for the `getCaseById` server action.
 */
describe("getCaseById (integration)", () => {
  /**
   * Resets the database and seeds a primary user before each test execution.
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
   * Test suite focused on security and session-based access control.
   */
  describe("authentication", () => {
    /**
     * Test case to verify that unauthenticated users are barred from fetching cases.
     */
    it("throws error when user is not authenticated", async () => {
      // Arrange: Configure `auth` to return a null session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act & Assert: Verify that calling the action results in an unauthorized error.
      await expect(getCaseById(mockIds.firstCase)).rejects.toThrow("Unauthorized");
    });

    /**
     * Test case to verify that sessions lacking user identity are rejected.
     */
    it("throws error when session has no user id", async () => {
      // Arrange: Configure `auth` to return a session object without a `user.id`.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act & Assert: Verify that the absence of a user ID results in an unauthorized error.
      await expect(getCaseById(mockIds.firstCase)).rejects.toThrow("Unauthorized");
    });
  });

  /**
   * Test suite for the retrieval of a case and its deep nested relationships.
   */
  describe("case retrieval", () => {
    /**
     * Establishes a valid session and case record before each retrieval test.
     */
    beforeEach(async () => {
      // Arrange: Simulate a valid authenticated session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      // Arrange: Seed the target case record.
      await insertTestCase();
    });

    /**
     * Test case to verify the successful retrieval of a case with all associated entities.
     */
    it("returns case data with uploads and detections", async () => {
      // Arrange: Seed an upload and two related detections.
      await insertTestUpload();
      await insertTestDetection({ id: mockIds.firstDetection, uploadId: mockIds.firstUpload });
      await insertTestDetection({ id: mockIds.secondDetection, uploadId: mockIds.firstUpload });

      // Act: Retrieve the case by ID.
      const result = await getCaseById(mockIds.firstCase);

      // Assert: Verify the case ID and the lengths of nested arrays.
      expect(result.id).toBe(mockIds.firstCase);
      expect(result.uploads).toHaveLength(1);
      expect(result.uploads[0].detections).toHaveLength(2);
    });

    /**
     * Test case to ensure that detections marked with `deletedAt` are excluded from results.
     */
    it("filters out soft-deleted detections", async () => {
      // Arrange: Seed an upload with one deleted and two active detections.
      await insertTestUpload();
      await insertTestDetection({ id: mockIds.firstDetection, uploadId: mockIds.firstUpload });
      await insertTestDetection({
        id: mockIds.secondDetection,
        uploadId: mockIds.firstUpload,
        deletedAt: new Date(),
      });
      await insertTestDetection({ id: mockIds.thirdDetection, uploadId: mockIds.firstUpload });

      // Act: Retrieve the case by ID.
      const result = await getCaseById(mockIds.firstCase);

      // Assert: Verify that only active detection IDs are present in the response.
      expect(result.uploads[0].detections).toHaveLength(2);
      expect(result.uploads[0].detections.map((d) => d.id)).toContain(mockIds.firstDetection);
      expect(result.uploads[0].detections.map((d) => d.id)).toContain(mockIds.thirdDetection);
      expect(result.uploads[0].detections.map((d) => d.id)).not.toContain(mockIds.secondDetection);
    });

    /**
     * Test case to verify the response format when a case exists but has no files.
     */
    it("handles case with no uploads", async () => {
      // Act: Retrieve a case that has no associated records in the `uploads` table.
      const result = await getCaseById(mockIds.firstCase);

      // Assert: Verify that the `uploads` property is an empty array.
      expect(result.uploads).toHaveLength(0);
    });

    /**
     * Test case to verify the response when files exist but contain no detections.
     */
    it("handles uploads with no detections", async () => {
      // Arrange: Seed an upload record without any associated detection records.
      await insertTestUpload();

      // Act: Retrieve the case by ID.
      const result = await getCaseById(mockIds.firstCase);

      // Assert: Verify that the nested `detections` array is empty.
      expect(result.uploads[0].detections).toHaveLength(0);
    });

    /**
     * Test case to verify that the final analysis result is included when available.
     */
    it("returns analysisResult when present", async () => {
      // Arrange: Seed an analysis result record for the test case.
      await insertTestAnalysisResult(48);

      // Act: Retrieve the case by ID.
      const result = await getCaseById(mockIds.firstCase);

      // Assert: Verify that the analysis data is populated correctly.
      expect(result.analysisResult).toBeDefined();
      expect(result.analysisResult?.pmiHours).toBe(48);
    });

    /**
     * Test case to verify that a missing analysis result is returned as null.
     */
    it("handles null analysisResult", async () => {
      // Act: Retrieve a case without any record in the `analysisResults` table.
      const result = await getCaseById(mockIds.firstCase);

      // Assert: Verify the `analysisResult` property is explicitly null.
      expect(result.analysisResult).toBeNull();
    });
  });

  /**
   * Test suite for verifying resource-level authorization.
   */
  describe("authorization", () => {
    /**
     * Sets up a valid session for authorization testing.
     */
    beforeEach(() => {
      // Arrange: Simulate a valid authenticated session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to ensure that querying a non-existent case triggers an error.
     */
    it("throws when case does not exist", async () => {
      // Act & Assert: Verify that the action rejects when the case is missing from the database.
      await expect(getCaseById(mockIds.firstCase)).rejects.toThrow();
    });

    /**
     * Test case to verify that users are denied access to cases they do not own.
     */
    it("throws when case belongs to another user", async () => {
      // Arrange: Seed a secondary user and a case record linked to that user.
      await db.insert(users).values({
        id: mockIds.secondUser,
        email: mockUsers.secondaryUser.email,
        name: mockUsers.secondaryUser.name,
      });

      await insertTestCase({ userId: mockIds.secondUser });

      // Act & Assert: Verify the primary user is forbidden from retrieving the secondary user's case.
      await expect(getCaseById(mockIds.firstCase)).rejects.toThrow();
    });
  });
});
