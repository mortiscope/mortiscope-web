"use server";

import { createId } from "@paralleldrive/cuid2";
import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases, detections, uploads, users } from "@/db/schema";
import { getCaseData } from "@/features/dashboard/actions/get-case-data";

// Mock the authentication module to control user session state.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock utility functions to ensure consistent formatting logic during testing.
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    formatConfidence: actual.formatConfidence,
    formatPmiToInterpretableString: actual.formatPmiToInterpretableString,
  };
});

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for `getCaseData` server action.
 */
describe("getCaseData (integration)", () => {
  /**
   * Resets the database and mocks to a clean state before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear mock history and reset the database schema.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Seed the database with a primary test user.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Helper function to seed complex case hierarchies including uploads, detections, and analysis.
   */
  const seedCase = async ({
    caseData = {},
    hasUploads = true,
    detectionsData = [],
    analysisData = {},
  }: {
    caseData?: Partial<typeof cases.$inferInsert>;
    hasUploads?: boolean;
    detectionsData?: Partial<typeof detections.$inferInsert>[];
    analysisData?: Partial<typeof analysisResults.$inferInsert> | null;
  } = {}) => {
    const caseId = caseData.id || createId();
    await db.insert(cases).values({
      ...mockCases.firstCase,
      userId: mockUsers.primaryUser.id,
      id: caseId,
      status: "active",
      ...caseData,
    });

    if (analysisData !== null) {
      await db.insert(analysisResults).values({
        caseId,
        status: "completed",
        pmiMinutes: 0,
        ...analysisData,
      });
    }

    if (hasUploads) {
      const uploadId = createId();
      await db.insert(uploads).values({
        id: uploadId,
        caseId,
        userId: mockUsers.primaryUser.id,
        key: `key-${uploadId}`,
        name: "test.jpg",
        url: "http://example.com/test.jpg",
        size: 1000,
        type: "image/jpeg",
        width: 100,
        height: 100,
      });

      if (detectionsData.length > 0) {
        for (const data of detectionsData) {
          await db.insert(detections).values({
            id: createId(),
            uploadId,
            label: "pupa",
            originalLabel: "pupa",
            xMin: 0,
            yMin: 0,
            xMax: 10,
            yMax: 10,
            status: "model_generated",
            createdById: mockUsers.primaryUser.id,
            ...data,
          });
        }
      }
    }

    return caseId;
  };

  /**
   * Test suite for verifying authentication enforcement.
   */
  describe("authentication", () => {
    /**
     * Verifies that unauthenticated requests are rejected.
     */
    it("throws error when user is not authenticated", async () => {
      // Arrange: Simulate a null session response.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act & Assert: Ensure the action throws the expected authentication error.
      await expect(getCaseData()).rejects.toThrow("User not authenticated");
    });

    /**
     * Verifies that sessions missing a user identifier are rejected.
     */
    it("throws error when session has no user id", async () => {
      // Arrange: Simulate a session object missing user details.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act & Assert: Ensure the action throws the expected authentication error.
      await expect(getCaseData()).rejects.toThrow("User not authenticated");
    });
  });

  /**
   * Test suite for validating the core case data retrieval and filtering logic.
   */
  describe("case data fetching", () => {
    /**
     * Configures a valid authenticated session before each retrieval test.
     */
    beforeEach(() => {
      // Arrange: Mock auth to return a valid user ID.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that a user with no associated records receives an empty list.
     */
    it("returns empty array when user has no cases", async () => {
      // Act: Invoke the action with an empty database.
      const result = await getCaseData();

      // Assert: Verify that no case data is returned.
      expect(result).toEqual([]);
    });

    /**
     * Verifies the correct mapping of database records to the dashboard view model.
     */
    it("fetches and transforms case data correctly", async () => {
      // Arrange: Seed a case with specific analysis and detection metrics.
      await seedCase({
        analysisData: { pmiMinutes: 1440, oldestStageDetected: "instar_3" },
        detectionsData: [
          { confidence: 0.9, status: "model_generated" },
          { confidence: 0.8, status: "user_confirmed" },
        ],
      });

      // Act: Retrieve the case data.
      const result = await getCaseData();

      // Assert: Verify the presence and accuracy of transformed fields.
      expect(result).toHaveLength(1);
      expect(result[0].caseName).toBe(mockCases.firstCase.caseName);
      expect(result[0].oldestStage).toBe("Third Instar");
      expect(result[0].imageCount).toBe(1);
      expect(result[0].detectionCount).toBe(2);
      expect(result[0].verificationStatus).toBe("in_progress");
    });

    /**
     * Verifies that cases lacking biological detections or uploads are excluded from results.
     */
    it("filters out cases with no detections", async () => {
      // Arrange: Seed one valid case and two invalid cases missing detections or uploads.
      await seedCase({
        caseData: { id: "case-1", caseName: "Case 1" },
        detectionsData: [{ confidence: 0.9 }],
      });

      await seedCase({
        caseData: { id: "case-2", caseName: "Case 2" },
        detectionsData: [],
      });

      await seedCase({
        caseData: { id: "case-3", caseName: "Case 3" },
        hasUploads: false,
      });

      // Act: Retrieve filtered case data.
      const result = await getCaseData();

      // Assert: Confirm only the case with detections is returned.
      expect(result).toHaveLength(1);
      expect(result[0].caseId).toBe("case-1");
    });

    /**
     * Verifies the temporal filtering for cases occurring after a specific date.
     */
    it("applies startDate filter when provided", async () => {
      // Arrange: Seed cases on different sides of the filter boundary.
      const targetDate = new Date("2025-06-01");
      const earlyDate = new Date("2025-01-01");

      await seedCase({
        caseData: { id: "c1", caseDate: targetDate },
        detectionsData: [{ confidence: 1 }],
      });
      await seedCase({
        caseData: { id: "c2", caseDate: earlyDate },
        detectionsData: [{ confidence: 1 }],
      });

      // Act: Filter by a start date of May 2025.
      const result = await getCaseData(new Date("2025-05-01"));

      // Assert: Verify only the later case is returned.
      expect(result).toHaveLength(1);
      expect(result[0].caseId).toBe("c1");
    });

    /**
     * Verifies the temporal filtering for cases occurring before a specific date.
     */
    it("applies endDate filter when provided", async () => {
      // Arrange: Seed cases inside and outside the upper date boundary.
      const targetDate = new Date("2025-06-01");
      const lateDate = new Date("2025-12-01");

      await seedCase({
        caseData: { id: "c1", caseDate: targetDate },
        detectionsData: [{ confidence: 1 }],
      });
      await seedCase({
        caseData: { id: "c2", caseDate: lateDate },
        detectionsData: [{ confidence: 1 }],
      });

      // Act: Filter by an end date of October 2025.
      const result = await getCaseData(undefined, new Date("2025-10-01"));

      // Assert: Verify only the earlier case is returned.
      expect(result).toHaveLength(1);
      expect(result[0].caseId).toBe("c1");
    });

    /**
     * Verifies the combined application of start and end date boundaries.
     */
    it("applies both startDate and endDate filters when provided", async () => {
      // Arrange: Seed three cases to test the bounded range.
      const targetDate = new Date("2025-06-01");
      const earlyDate = new Date("2025-01-01");
      const lateDate = new Date("2025-12-01");

      await seedCase({
        caseData: { id: "c1", caseDate: targetDate },
        detectionsData: [{ confidence: 1 }],
      });
      await seedCase({
        caseData: { id: "c2", caseDate: earlyDate },
        detectionsData: [{ confidence: 1 }],
      });
      await seedCase({
        caseData: { id: "c3", caseDate: lateDate },
        detectionsData: [{ confidence: 1 }],
      });

      // Act: Filter for cases between May and October 2025.
      const result = await getCaseData(new Date("2025-05-01"), new Date("2025-10-01"));

      // Assert: Verify only the middle case within the range is returned.
      expect(result).toHaveLength(1);
      expect(result[0].caseId).toBe("c1");
    });
  });

  /**
   * Test suite for the logic determining a case's human verification progress.
   */
  describe("verification status calculation", () => {
    /**
     * Ensures an authenticated session is active for status tests.
     */
    beforeEach(() => {
      // Arrange: Mock the session for the primary user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies the status is "verified" when all detections have been reviewed by a user.
     */
    it("returns verified when all detections are confirmed", async () => {
      // Arrange: Seed a case where all detections have confirmed statuses.
      await seedCase({
        detectionsData: [
          { status: "user_confirmed", confidence: 0.9 },
          { status: "user_edited_confirmed", confidence: 0.8 },
        ],
      });

      // Act: Retrieve the case data.
      const result = await getCaseData();

      // Assert: Confirm the status is calculated as verified.
      expect(result[0].verificationStatus).toBe("verified");
    });

    /**
     * Verifies the status is "unverified" when no detections have been reviewed.
     */
    it("returns unverified when all detections are model_generated", async () => {
      // Arrange: Seed a case where all detections are in the initial model state.
      await seedCase({
        detectionsData: [
          { status: "model_generated", confidence: 0.9 },
          { status: "model_generated", confidence: 0.8 },
        ],
      });

      // Act: Retrieve the case data.
      const result = await getCaseData();

      // Assert: Confirm the status is calculated as unverified.
      expect(result[0].verificationStatus).toBe("unverified");
    });

    /**
     * Verifies the status is "in_progress" when a mix of reviewed and unreviewed detections exist.
     */
    it("returns in_progress when some detections are confirmed", async () => {
      // Arrange: Seed a case with partial human verification.
      await seedCase({
        detectionsData: [
          { status: "model_generated", confidence: 0.9 },
          { status: "user_confirmed", confidence: 0.8 },
        ],
      });

      // Act: Retrieve the case data.
      const result = await getCaseData();

      // Assert: Confirm the status is calculated as in progress.
      expect(result[0].verificationStatus).toBe("in_progress");
    });
  });

  /**
   * Test suite for converting technical stage keys into human-readable labels.
   */
  describe("stage formatting", () => {
    /**
     * Ensures an authenticated session is active for formatting tests.
     */
    beforeEach(() => {
      // Arrange: Mock the session for the primary user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that each supported life stage key maps to its correct display name.
     */
    it("formats known stages correctly", async () => {
      // Arrange: Define the mapping of database keys to expected UI labels.
      const stages = [
        { input: "instar_1", expected: "First Instar" },
        { input: "instar_2", expected: "Second Instar" },
        { input: "instar_3", expected: "Third Instar" },
        { input: "pupa", expected: "Pupa" },
        { input: "adult", expected: "Adult" },
      ];

      for (const { input, expected } of stages) {
        // Arrange: Reset the database for each iteration to prevent interference.
        await resetMockDb();
        await db.insert(users).values({
          id: mockUsers.primaryUser.id,
          email: mockUsers.primaryUser.email,
          name: mockUsers.primaryUser.name,
        });

        await seedCase({
          analysisData: { oldestStageDetected: input, pmiMinutes: 0 },
          detectionsData: [{ confidence: 0.9 }],
        });

        // Act: Retrieve the case data for the specific stage.
        const result = await getCaseData();

        // Assert: Confirm the formatted string matches the expectation.
        expect(result[0].oldestStage).toBe(expected);
      }
    });

    /**
     * Verifies that unrecognized stage keys are handled with a standard fallback title case.
     */
    it("formats unknown stages with fallback", async () => {
      // Arrange: Seed a case with a non-standard stage string.
      await seedCase({
        analysisData: { oldestStageDetected: "unknown_stage", pmiMinutes: 0 },
        detectionsData: [{ confidence: 0.9 }],
      });

      // Act: Retrieve the case data.
      const result = await getCaseData();

      // Assert: Verify the fallback formatting logic is applied.
      expect(result[0].oldestStage).toBe("Unknown Stage");
    });
  });

  /**
   * Test suite for verifying system robustness against missing or null data.
   */
  describe("edge cases", () => {
    /**
     * Ensures an authenticated session is active for edge case tests.
     */
    beforeEach(() => {
      // Arrange: Mock the session for the primary user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies behavior when a case exists but the asynchronous analysis has not completed.
     */
    it("handles missing analysis result", async () => {
      // Arrange: Seed a case with detections but no analysis record.
      await seedCase({
        analysisData: null,
        detectionsData: [{ confidence: 0.9 }],
      });

      // Act: Retrieve the case data.
      const result = await getCaseData();

      // Assert: Verify the default strings for missing analysis.
      expect(result[0].pmiEstimation).toBe("No estimation");
      expect(result[0].oldestStage).toBe("No detections");
    });

    /**
     * Verifies that null environmental data is gracefully handled in the UI model.
     */
    it("handles null temperature", async () => {
      // Arrange: Seed a case with an explicit null temperature value.
      await seedCase({
        caseData: { temperatureCelsius: null as unknown as number },
        detectionsData: [{ confidence: 0.9 }],
      });

      // Act: Retrieve the case data.
      const result = await getCaseData();

      // Assert: Verify that the model returns N/A for temperature.
      expect(result[0].temperature).toBe("N/A");
    });

    /**
     * Verifies that detections missing confidence scores do not break calculation logic.
     */
    it("handles null confidence scores", async () => {
      // Arrange: Seed a case with a detection lacking a confidence metric.
      await seedCase({
        detectionsData: [{ confidence: null }],
      });

      // Act: Retrieve the case data.
      const result = await getCaseData();

      // Assert: Verify that the average confidence is reported as unavailable.
      expect(result[0].averageConfidence).toBe("N/A");
    });
  });
});
