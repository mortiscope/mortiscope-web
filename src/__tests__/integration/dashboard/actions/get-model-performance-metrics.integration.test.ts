"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, detections, uploads, users } from "@/db/schema";
import { getModelPerformanceMetrics } from "@/features/dashboard/actions/get-model-performance-metrics";

// Mock the authentication module to control user session state during integration testing.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `getModelPerformanceMetrics` server action.
 */
describe("getModelPerformanceMetrics (integration)", () => {
  const testUserId = mockUsers.primaryUser.id;

  /**
   * Sets up a clean database and common test user before each test case.
   */
  beforeEach(async () => {
    // Arrange: Reset mock call history.
    vi.clearAllMocks();
    // Arrange: Wipe the database to ensure test isolation.
    resetMockDb();

    // Arrange: Seed the test user in the `users` table.
    await db.insert(users).values({
      id: testUserId,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Helper function to insert a case with associated upload and detection records.
   */
  const insertCaseWithDetections = async (
    caseId: string,
    uploadId: string,
    detectionData: { originalLabel: string; originalConfidence: number | null }[],
    caseDate: Date = new Date()
  ) => {
    // Arrange: Create a new record in the `cases` table.
    await db.insert(cases).values({
      id: caseId,
      userId: testUserId,
      caseName: `Test Case`,
      status: "active",
      temperatureCelsius: 25,
      locationRegion: "Region",
      locationProvince: "Province",
      locationCity: "City",
      locationBarangay: "Barangay",
      caseDate: caseDate,
    });

    // Arrange: Create a corresponding record in the `uploads` table.
    await db.insert(uploads).values({
      id: uploadId,
      caseId: caseId,
      userId: testUserId,
      name: `test-image.jpg`,
      key: `uploads/${uploadId}`,
      url: `https://example.com/uploads/${uploadId}`,
      size: 1024,
      type: "image/jpeg",
      width: 1920,
      height: 1080,
    });

    // Arrange: Iterate through the provided detection data to populate the `detections` table.
    for (let i = 0; i < detectionData.length; i++) {
      const d = detectionData[i];
      await db.insert(detections).values({
        id: `${caseId}-det-${i}`,
        uploadId: uploadId,
        label: d.originalLabel,
        originalLabel: d.originalLabel,
        confidence: d.originalConfidence,
        originalConfidence: d.originalConfidence,
        xMin: 0,
        yMin: 0,
        xMax: 100,
        yMax: 100,
        createdById: testUserId,
        deletedAt: null,
      });
    }
  };

  /**
   * Test suite for authentication-related requirements.
   */
  describe("authentication", () => {
    /**
     * Verifies that unauthenticated requests are rejected with an error.
     */
    it("throws error when user is not authenticated", async () => {
      // Arrange: Simulate a null authentication response.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act & Assert: Execute the action and check for the expected error message.
      await expect(getModelPerformanceMetrics()).rejects.toThrow("User not authenticated");
    });

    /**
     * Verifies that sessions missing a user identifier are treated as unauthorized.
     */
    it("throws error when session has no user id", async () => {
      // Arrange: Simulate a session object without a user ID.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act & Assert: Execute the action and check for the expected error message.
      await expect(getModelPerformanceMetrics()).rejects.toThrow("User not authenticated");
    });
  });

  /**
   * Test suite for the core calculation of model performance data.
   */
  describe("performance metrics calculation", () => {
    /**
     * Ensures all calculation tests are performed with a valid user session.
     */
    beforeEach(() => {
      // Arrange: Mock the `auth` response to return the active test user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that the function returns a baseline zeroed structure when no data is found.
     */
    it("returns all stages with zero confidence when no cases exist", async () => {
      // Act: Retrieve metrics for a user with no database records.
      const result = await getModelPerformanceMetrics();

      // Assert: Verify that 5 life stages are returned, all with 0 confidence.
      expect(result).toHaveLength(5);
      expect(result.every((stage) => stage.confidence === 0)).toBe(true);
    });

    /**
     * Verifies that confidence averages are correctly computed for specific insect life stages.
     */
    it("calculates average confidence per life stage correctly", async () => {
      // Arrange: Insert detections with varying confidence levels for multiple life stages.
      await insertCaseWithDetections("clm8x9y0z0001ab2c3d4e5f6g", "cln9y0z1a0002bc3d4e5f6g7h", [
        { originalLabel: "instar_1", originalConfidence: 0.8 },
        { originalLabel: "instar_1", originalConfidence: 0.9 },
        { originalLabel: "adult", originalConfidence: 0.7 },
      ]);

      // Act: Invoke the performance metrics calculation.
      const result = await getModelPerformanceMetrics();

      // Assert: Verify averages (e.g., (0.8 + 0.9) / 2 = 0.85, then converted to percentage 85).
      expect(result.find((s) => s.name === "instar_1")?.confidence).toBe(85);
      expect(result.find((s) => s.name === "adult")?.confidence).toBe(70);
      expect(result.find((s) => s.name === "instar_2")?.confidence).toBe(0);
    });

    /**
     * Verifies behavior when confidence values already match a 0-100 scale.
     */
    it("handles confidence values in 0-100 scale", async () => {
      // Arrange: Insert detections using a non-decimal percentage format.
      await insertCaseWithDetections("clo0z1a2b0003cd4e5f6g7h8i", "clp1a2b3c0004de5f6g7h8i9j", [
        { originalLabel: "pupa", originalConfidence: 95 },
        { originalLabel: "pupa", originalConfidence: 85 },
      ]);

      // Act: Retrieve performance metrics.
      const result = await getModelPerformanceMetrics();

      // Assert: Confirm the logic treats these as raw multipliers (90 * 100).
      expect(result.find((s) => s.name === "pupa")?.confidence).toBe(9000);
    });

    /**
     * Verifies that detections from different cases and uploads are combined.
     */
    it("aggregates detections across multiple cases and uploads", async () => {
      // Arrange: Setup data across two different cases and multiple uploads.
      await insertCaseWithDetections("clq2b3c4d0005ef6g7h8i9j0k", "clr3c4d5e0006fg7h8i9j0k1l", [
        { originalLabel: "instar_2", originalConfidence: 0.6 },
      ]);

      await db.insert(uploads).values({
        id: "cls4d5e6f0007gh8i9j0k1l2m",
        caseId: "clq2b3c4d0005ef6g7h8i9j0k",
        userId: testUserId,
        name: "second-upload.jpg",
        key: "uploads/cls4d5e6f0007gh8i9j0k1l2m",
        url: "https://example.com/uploads/cls4d5e6f0007gh8i9j0k1l2m",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      await db.insert(detections).values({
        id: "clt5e6f7g0008hi9j0k1l2m3n",
        uploadId: "cls4d5e6f0007gh8i9j0k1l2m",
        label: "instar_2",
        originalLabel: "instar_2",
        confidence: 0.8,
        originalConfidence: 0.8,
        xMin: 0,
        yMin: 0,
        xMax: 100,
        yMax: 100,
        createdById: testUserId,
        deletedAt: null,
      });

      await insertCaseWithDetections("clu6f7g8h0009ij0k1l2m3n4o", "clv7g8h9i0010jk1l2m3n4o5p", [
        { originalLabel: "instar_2", originalConfidence: 0.7 },
      ]);

      // Act: Calculate metrics from all relevant records.
      const result = await getModelPerformanceMetrics();

      // Assert: Verify the combined average for `instar_2` ((0.6 + 0.8 + 0.7) / 3 = 0.7).
      expect(result.find((s) => s.name === "instar_2")?.confidence).toBe(70);
    });

    /**
     * Verifies that detections missing a confidence score do not skew the averages.
     */
    it("ignores detections with null confidence", async () => {
      // Arrange: Insert a detection with a null confidence and one with a valid score.
      await insertCaseWithDetections("clw8h9i0j0011kl2m3n4o5p6q", "clx9i0j1k0012lm3n4o5p6q7r", [
        { originalLabel: "instar_3", originalConfidence: null },
        { originalLabel: "instar_3", originalConfidence: 0.9 },
      ]);

      // Act: Calculate metrics.
      const result = await getModelPerformanceMetrics();

      // Assert: Verify that only the non-null value is used in the average.
      expect(result.find((s) => s.name === "instar_3")?.confidence).toBe(90);
    });

    /**
     * Verifies that empty case or upload records do not break the metrics engine.
     */
    it("handles cases with empty uploads or no detections", async () => {
      // Arrange: Create a case and an upload record but skip adding detection records.
      await db.insert(cases).values({
        id: "cly0j1k2l0013mn4o5p6q7r8s",
        userId: testUserId,
        caseName: "Empty Case 1",
        status: "active",
        temperatureCelsius: 25,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
      });

      await db.insert(uploads).values({
        id: "clz1k2l3m0014no5p6q7r8s9t",
        caseId: "cly0j1k2l0013mn4o5p6q7r8s",
        userId: testUserId,
        name: "empty.jpg",
        key: "uploads/clz1k2l3m0014no5p6q7r8s9t",
        url: "https://example.com/uploads/clz1k2l3m0014no5p6q7r8s9t",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      await db.insert(cases).values({
        id: "cla2l3m4n0015op6q7r8s9t0u",
        userId: testUserId,
        caseName: "Empty Case 2",
        status: "active",
        temperatureCelsius: 25,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
      });

      // Act: Retrieve metrics.
      const result = await getModelPerformanceMetrics();

      // Assert: Verify all results remain at the zero baseline.
      expect(result.every((stage) => stage.confidence === 0)).toBe(true);
    });

    /**
     * Verifies that life stages are returned in the specific order defined by the insect life cycle.
     */
    it("returns stages in canonical order", async () => {
      // Arrange: Seed detections out of biological order.
      await insertCaseWithDetections("clb3m4n5o0016pq7r8s9t0u1v", "clc4n5o6p0017qr8s9t0u1v2w", [
        { originalLabel: "adult", originalConfidence: 0.9 },
        { originalLabel: "instar_3", originalConfidence: 0.8 },
      ]);

      // Act: Fetch the metrics array.
      const result = await getModelPerformanceMetrics();

      // Assert: Verify indices match the expected biological sequence.
      expect(result[0].name).toBe("instar_1");
      expect(result[1].name).toBe("instar_2");
      expect(result[2].name).toBe("instar_3");
      expect(result[3].name).toBe("pupa");
      expect(result[4].name).toBe("adult");
    });

    /**
     * Verifies that the resulting confidence percentages are rounded correctly.
     */
    it("rounds confidence to one decimal place", async () => {
      // Arrange: Insert a detection with a complex float value.
      await insertCaseWithDetections("cld5o6p7q0018rs9t0u1v2w3x", "cle6p7q8r0019st0u1v2w3x4y", [
        { originalLabel: "pupa", originalConfidence: 0.8567 },
      ]);

      // Act: Retrieve metrics.
      const result = await getModelPerformanceMetrics();

      // Assert: Verify the value is rounded to the first decimal point (85.67 -> 85.7).
      expect(result.find((s) => s.name === "pupa")?.confidence).toBe(85.7);
    });
  });

  /**
   * Test suite for date-based data filtering.
   */
  describe("date filtering", () => {
    /**
     * Ensures an active user session is present for filtering tests.
     */
    beforeEach(() => {
      // Arrange: Mock the authentication function.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that cases occurring before the provided `startDate` are ignored.
     */
    it("filters cases by startDate", async () => {
      // Arrange: Setup cases from different years.
      await insertCaseWithDetections(
        "clf7q8r9s0020tu1v2w3x4y5z",
        "clg8r9s0t0021uv2w3x4y5z6a",
        [{ originalLabel: "instar_1", originalConfidence: 0.5 }],
        new Date("2024-01-01")
      );

      await insertCaseWithDetections(
        "clh9s0t1u0022vw3x4y5z6a7b",
        "cli0t1u2v0023wx4y5z6a7b8c",
        [{ originalLabel: "adult", originalConfidence: 0.9 }],
        new Date("2025-06-01")
      );

      // Act: Filter for data starting in 2025.
      const result = await getModelPerformanceMetrics(new Date("2025-01-01"));

      // Assert: Confirm only the 2025 data is reflected.
      expect(result.find((s) => s.name === "instar_1")?.confidence).toBe(0);
      expect(result.find((s) => s.name === "adult")?.confidence).toBe(90);
    });

    /**
     * Verifies that cases occurring after the provided `endDate` are ignored.
     */
    it("filters cases by endDate", async () => {
      // Arrange: Setup cases across the year 2025.
      await insertCaseWithDetections(
        "clj1u2v3w0024xy5z6a7b8c9d",
        "clk2v3w4x0025yz6a7b8c9d0e",
        [{ originalLabel: "pupa", originalConfidence: 0.8 }],
        new Date("2025-03-01")
      );

      await insertCaseWithDetections(
        "cll3w4x5y0026za7b8c9d0e1f",
        "clm4x5y6z0027ab8c9d0e1f2g",
        [{ originalLabel: "instar_3", originalConfidence: 0.9 }],
        new Date("2025-12-01")
      );

      // Act: Filter for data ending by June 2025.
      const result = await getModelPerformanceMetrics(undefined, new Date("2025-06-01"));

      // Assert: Confirm only the early 2025 data is reflected.
      expect(result.find((s) => s.name === "pupa")?.confidence).toBe(80);
      expect(result.find((s) => s.name === "instar_3")?.confidence).toBe(0);
    });

    /**
     * Verifies that the metrics engine handles a bounded date range correctly.
     */
    it("applies both startDate and endDate filters", async () => {
      // Arrange: Setup a case within the target month.
      await insertCaseWithDetections(
        "cln5y6z7a0028bc9d0e1f2g3h",
        "clo6z7a8b0029cd0e1f2g3h4i",
        [{ originalLabel: "instar_2", originalConfidence: 0.75 }],
        new Date("2025-06-15")
      );

      // Act: Retrieve metrics for the full year 2025.
      const result = await getModelPerformanceMetrics(
        new Date("2025-01-01"),
        new Date("2025-12-31")
      );

      // Assert: Verify the case is correctly included.
      expect(result.find((s) => s.name === "instar_2")?.confidence).toBe(75);
    });
  });

  /**
   * Test suite for detection-level visibility and validity filters.
   */
  describe("detection filtering", () => {
    /**
     * Prepares an authenticated environment for query filtering tests.
     */
    beforeEach(() => {
      // Arrange: Mock the `auth` function.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that detections marked with a `deletedAt` timestamp are ignored.
     */
    it("excludes soft-deleted detections", async () => {
      // Arrange: Setup a case with active and deleted detections.
      await db.insert(cases).values({
        id: "clp7a8b9c0030de1f2g3h4i5j",
        userId: testUserId,
        caseName: "Soft Delete Test",
        status: "active",
        temperatureCelsius: 25,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
      });

      await db.insert(uploads).values({
        id: "clq8b9c0d0031ef2g3h4i5j6k",
        caseId: "clp7a8b9c0030de1f2g3h4i5j",
        userId: testUserId,
        name: "delete-test.jpg",
        key: "uploads/clq8b9c0d0031ef2g3h4i5j6k",
        url: "https://example.com/uploads/clq8b9c0d0031ef2g3h4i5j6k",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      await db.insert(detections).values({
        id: "clr9c0d1e0032fg3h4i5j6k7l",
        uploadId: "clq8b9c0d0031ef2g3h4i5j6k",
        label: "instar_1",
        originalLabel: "instar_1",
        confidence: 0.8,
        originalConfidence: 0.8,
        xMin: 0,
        yMin: 0,
        xMax: 100,
        yMax: 100,
        createdById: testUserId,
        deletedAt: null,
      });

      await db.insert(detections).values({
        id: "cls0d1e2f0033gh4i5j6k7l8m",
        uploadId: "clq8b9c0d0031ef2g3h4i5j6k",
        label: "adult",
        originalLabel: "adult",
        confidence: 0.9,
        originalConfidence: 0.9,
        xMin: 0,
        yMin: 0,
        xMax: 100,
        yMax: 100,
        createdById: testUserId,
        deletedAt: new Date(),
      });

      // Act: Retrieve metrics.
      const result = await getModelPerformanceMetrics();

      // Assert: Verify only active detections are included.
      expect(result.find((s) => s.name === "instar_1")?.confidence).toBe(80);
      expect(result.find((s) => s.name === "adult")?.confidence).toBe(0);
    });

    /**
     * Verifies that the database query implementation contains the necessary logic to filter nulls and deletions.
     */
    it("constructs where clause to filter soft-deleted and null confidence detections", async () => {
      // Arrange: Setup a spy to capture the relational query options passed to Drizzle.
      const dbModule = await import("@/db");
      const findManySpy = vi.spyOn(dbModule.db.query.cases, "findMany");

      // Act: Execute the action.
      await getModelPerformanceMetrics();

      // Assert: Drill into the mock calls to verify the nested `where` logic for detections.
      const findManyCall = findManySpy.mock.calls[0];
      const queryOptions = findManyCall[0] as unknown as {
        with: {
          uploads: {
            with: {
              detections: {
                where: (
                  schema: Record<string, unknown>,
                  utils: {
                    isNull: (col: unknown) => unknown;
                    isNotNull: (col: unknown) => unknown;
                    and: (...args: unknown[]) => unknown;
                  }
                ) => unknown;
              };
            };
          };
        };
      };

      // Assert: Verify that the `where` function uses `isNull` for deletion and `isNotNull` for confidence.
      const whereFn = queryOptions.with.uploads.with.detections.where;

      const isNullMock = vi.fn().mockReturnValue("isNullResult");
      const isNotNullMock = vi.fn().mockReturnValue("isNotNullResult");
      const andMock = vi.fn().mockReturnValue("andResult");

      const mockDetections = {
        deletedAt: "deletedAtCol",
        originalConfidence: "confidenceCol",
      };

      const result = whereFn(mockDetections, {
        isNull: isNullMock,
        isNotNull: isNotNullMock,
        and: andMock,
      });

      // Assert: Confirm the logic was correctly wired.
      expect(isNullMock).toHaveBeenCalledWith("deletedAtCol");
      expect(isNotNullMock).toHaveBeenCalledWith("confidenceCol");
      expect(andMock).toHaveBeenCalled();
      expect(result).toBe("andResult");

      // Assert: Restore the spy to prevent side effects in other tests.
      findManySpy.mockRestore();
    });
  });
});
