"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases, detections, uploads, users } from "@/db/schema";
import { getDashboardMetrics } from "@/features/dashboard/actions/get-dashboard-metrics";

// Mock the authentication module to control user session state during integration tests.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

interface DetectionData {
  status: "model_generated" | "user_confirmed" | "user_edited_confirmed" | "user_created";
  confidence: number | null;
  label: string;
  originalLabel: string;
}

/**
 * Integration test suite for the `getDashboardMetrics` server action.
 */
describe("getDashboardMetrics (integration)", () => {
  const testUserId = mockUsers.primaryUser.id;

  /**
   * Resets the database and mocks before each test to ensure a clean state.
   */
  beforeEach(async () => {
    // Arrange: Clear mock call history.
    vi.clearAllMocks();
    // Arrange: Reset the in-memory database to a baseline state.
    resetMockDb();

    // Arrange: Seed the database with a primary test user.
    await db.insert(users).values({
      id: testUserId,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Helper function to populate the database with related case, upload, detection, and analysis data.
   */
  const insertCaseWithData = async (
    caseId: string,
    uploadId: string,
    detectionDataList: DetectionData[],
    pmiHours: number | null = null,
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

    // Arrange: Create a corresponding record in the `uploads` table linked to the case.
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

    // Arrange: Loop through detection data to populate the `detections` table for the specific upload.
    for (let i = 0; i < detectionDataList.length; i++) {
      const d = detectionDataList[i];
      await db.insert(detections).values({
        id: `${caseId}-det-${i}`,
        uploadId: uploadId,
        status: d.status,
        confidence: d.confidence,
        label: d.label,
        originalLabel: d.originalLabel,
        originalConfidence: d.confidence,
        xMin: 0,
        yMin: 0,
        xMax: 100,
        yMax: 100,
        createdById: testUserId,
        deletedAt: null,
      });
    }

    // Arrange: Conditionally insert analysis results if `pmiHours` is provided.
    if (pmiHours !== null) {
      await db.insert(analysisResults).values({
        caseId: caseId,
        status: "completed",
        pmiHours: pmiHours,
      });
    }
  };

  /**
   * Tests focused on authentication guardrails for the dashboard metrics action.
   */
  describe("authentication", () => {
    /**
     * Verifies that the function rejects requests from unauthenticated users.
     */
    it("throws error when user is not authenticated", async () => {
      // Arrange: Set the `auth` mock to return no session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act & Assert: Execute the action and verify it throws the expected authentication error.
      await expect(getDashboardMetrics()).rejects.toThrow("User not authenticated");
    });

    /**
     * Verifies that a session lacking a user ID is treated as unauthenticated.
     */
    it("throws error when session has no user id", async () => {
      // Arrange: Set the `auth` mock to return a session without an ID.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act & Assert: Execute the action and verify it throws the expected authentication error.
      await expect(getDashboardMetrics()).rejects.toThrow("User not authenticated");
    });
  });

  /**
   * Tests for the accuracy of various metric calculations.
   */
  describe("metrics calculation", () => {
    /**
     * Sets up a valid authenticated session for all calculation tests.
     */
    beforeEach(() => {
      // Arrange: Mock `auth` to return the `testUserId`.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that the system returns zeroed metrics when the user has no data.
     */
    it("returns zeroed metrics when no cases exist", async () => {
      // Act: Retrieve metrics for a user with an empty database state.
      const metrics = await getDashboardMetrics();

      // Assert: Confirm all calculated values are 0.
      expect(metrics).toEqual({
        verified: 0,
        totalCases: 0,
        totalImages: 0,
        verifiedImages: 0,
        totalDetectionsCount: 0,
        verifiedDetectionsCount: 0,
        averagePMI: 0,
        averageConfidence: 0,
        correctionRate: 0,
      });
    });

    /**
     * Verifies the calculation of verified versus total cases.
     */
    it("calculates case verification correctly", async () => {
      // Arrange: Insert one case with confirmed detections (verified) and one with only model detections (unverified).
      await insertCaseWithData(
        "clm8x9y0z0001ab2c3d4e5f6g",
        "cln9y0z1a0002bc3d4e5f6g7h",
        [
          {
            status: "user_confirmed",
            confidence: 0.9,
            label: "instar_1",
            originalLabel: "instar_1",
          },
          {
            status: "user_edited_confirmed",
            confidence: 0.8,
            label: "instar_2",
            originalLabel: "instar_2",
          },
        ],
        10
      );

      await insertCaseWithData(
        "clo0z1a2b0003cd4e5f6g7h8i",
        "clp1a2b3c0004de5f6g7h8i9j",
        [{ status: "model_generated", confidence: 0.7, label: "pupa", originalLabel: "pupa" }],
        20
      );

      // Act: Invoke the metrics calculation.
      const metrics = await getDashboardMetrics();

      // Assert: Verify that `totalCases` is 2 and only 1 is marked as `verified`.
      expect(metrics.totalCases).toBe(2);
      expect(metrics.verified).toBe(1);
    });

    /**
     * Verifies calculations for image-level and detection-level counts.
     */
    it("calculates image metrics correctly", async () => {
      // Arrange: Setup a case with two separate uploads and distinct detection statuses.
      await db.insert(cases).values({
        id: "clq2b3c4d0005ef6g7h8i9j0k",
        userId: testUserId,
        caseName: "Image Metrics Case",
        status: "active",
        temperatureCelsius: 25,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
      });

      await db.insert(uploads).values({
        id: "clr3c4d5e0006fg7h8i9j0k1l",
        caseId: "clq2b3c4d0005ef6g7h8i9j0k",
        userId: testUserId,
        name: "image1.jpg",
        key: "uploads/clr3c4d5e0006fg7h8i9j0k1l",
        url: "https://example.com/uploads/clr3c4d5e0006fg7h8i9j0k1l",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      await db.insert(uploads).values({
        id: "cls4d5e6f0007gh8i9j0k1l2m",
        caseId: "clq2b3c4d0005ef6g7h8i9j0k",
        userId: testUserId,
        name: "image2.jpg",
        key: "uploads/cls4d5e6f0007gh8i9j0k1l2m",
        url: "https://example.com/uploads/cls4d5e6f0007gh8i9j0k1l2m",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      await db.insert(detections).values({
        id: "clt5e6f7g0008hi9j0k1l2m3n",
        uploadId: "clr3c4d5e0006fg7h8i9j0k1l",
        status: "user_confirmed",
        confidence: 0.9,
        originalConfidence: 0.9,
        label: "adult",
        originalLabel: "adult",
        xMin: 0,
        yMin: 0,
        xMax: 100,
        yMax: 100,
        createdById: testUserId,
        deletedAt: null,
      });

      await db.insert(detections).values({
        id: "clu6f7g8h0009ij0k1l2m3n4o",
        uploadId: "cls4d5e6f0007gh8i9j0k1l2m",
        status: "model_generated",
        confidence: 0.8,
        originalConfidence: 0.8,
        label: "pupa",
        originalLabel: "pupa",
        xMin: 0,
        yMin: 0,
        xMax: 100,
        yMax: 100,
        createdById: testUserId,
        deletedAt: null,
      });

      // Act: Retrieve metrics for the image-based setup.
      const metrics = await getDashboardMetrics();

      // Assert: Verify total and verified counts for both images and detections.
      expect(metrics.totalImages).toBe(2);
      expect(metrics.verifiedImages).toBe(1);
      expect(metrics.totalDetectionsCount).toBe(2);
      expect(metrics.verifiedDetectionsCount).toBe(1);
    });

    /**
     * Verifies the average Post-Mortem Interval calculation.
     */
    it("calculates average PMI correctly", async () => {
      // Arrange: Insert two cases with different PMI hour values.
      await insertCaseWithData(
        "clv7g8h9i0010jk1l2m3n4o5p",
        "clw8h9i0j0011kl2m3n4o5p6q",
        [{ status: "user_confirmed", confidence: 0.9, label: "adult", originalLabel: "adult" }],
        10
      );

      await insertCaseWithData(
        "clx9i0j1k0012lm3n4o5p6q7r",
        "cly0j1k2l0013mn4o5p6q7r8s",
        [{ status: "user_confirmed", confidence: 0.9, label: "adult", originalLabel: "adult" }],
        20
      );

      // Act: Retrieve metrics to check PMI averaging logic.
      const metrics = await getDashboardMetrics();

      // Assert: Confirm the average of 10 and 20 is 15.
      expect(metrics.averagePMI).toBe(15);
    });

    /**
     * Verifies the average confidence calculation across detections.
     */
    it("calculates average confidence correctly", async () => {
      // Arrange: Insert a single case with multiple detections having different confidence scores.
      await insertCaseWithData("clz1k2l3m0014no5p6q7r8s9t", "cla2l3m4n0015op6q7r8s9t0u", [
        { status: "user_confirmed", confidence: 0.8, label: "adult", originalLabel: "adult" },
        { status: "user_confirmed", confidence: 0.9, label: "pupa", originalLabel: "pupa" },
      ]);

      // Act: Invoke the metrics calculation.
      const metrics = await getDashboardMetrics();

      // Assert: Verify the average confidence matches the expected float value.
      expect(metrics.averageConfidence).toBeCloseTo(0.85);
    });

    /**
     * Verifies the calculation of the user correction rate.
     */
    it("calculates correction rate correctly", async () => {
      // Arrange: Insert detections including one user-created and one with a label change (correction).
      await insertCaseWithData("clb3m4n5o0016pq7r8s9t0u1v", "clc4n5o6p0017qr8s9t0u1v2w", [
        { status: "user_created", confidence: 0.9, label: "adult", originalLabel: "adult" },
        { status: "user_confirmed", confidence: 0.8, label: "instar_2", originalLabel: "instar_1" },
        { status: "user_confirmed", confidence: 0.7, label: "pupa", originalLabel: "pupa" },
      ]);

      // Act: Retrieve metrics to check correction rate logic.
      const metrics = await getDashboardMetrics();

      // Assert: Verify the percentage of corrected detections is calculated accurately.
      expect(metrics.correctionRate).toBeCloseTo(66.67, 1);
    });
  });

  /**
   * Tests for handling invalid, incomplete, or edge-case data scenarios.
   */
  describe("edge cases", () => {
    /**
     * Ensures an authenticated session exists for edge case testing.
     */
    beforeEach(() => {
      // Arrange: Mock the authentication for the test user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that cases without detections are ignored in the final metrics.
     */
    it("handles cases with no detections", async () => {
      // Arrange: Insert a case and an upload record without any associated detections.
      await db.insert(cases).values({
        id: "cld5o6p7q0018rs9t0u1v2w3x",
        userId: testUserId,
        caseName: "Empty Case",
        status: "active",
        temperatureCelsius: 25,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
      });

      await db.insert(uploads).values({
        id: "cle6p7q8r0019st0u1v2w3x4y",
        caseId: "cld5o6p7q0018rs9t0u1v2w3x",
        userId: testUserId,
        name: "empty.jpg",
        key: "uploads/cle6p7q8r0019st0u1v2w3x4y",
        url: "https://example.com/uploads/cle6p7q8r0019st0u1v2w3x4y",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      // Act: Retrieve metrics for the empty detection scenario.
      const metrics = await getDashboardMetrics();

      // Assert: Verify the case and image are excluded since metrics depend on detection data.
      expect(metrics.totalCases).toBe(0);
      expect(metrics.totalImages).toBe(0);
    });

    /**
     * Verifies that `null` values in `analysisResults` do not crash the averaging logic.
     */
    it("handles null PMI values within analysisResult", async () => {
      // Arrange: Insert a case where the analysis is completed but `pmiHours` is `null`.
      await db.insert(cases).values({
        id: "clf7q8r9s0020tu1v2w3x4y5z",
        userId: testUserId,
        caseName: "Null PMI Case",
        status: "active",
        temperatureCelsius: 25,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
      });

      await db.insert(uploads).values({
        id: "clg8r9s0t0021uv2w3x4y5z6a",
        caseId: "clf7q8r9s0020tu1v2w3x4y5z",
        userId: testUserId,
        name: "null-pmi.jpg",
        key: "uploads/clg8r9s0t0021uv2w3x4y5z6a",
        url: "https://example.com/uploads/clg8r9s0t0021uv2w3x4y5z6a",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      await db.insert(detections).values({
        id: "clh9s0t1u0022vw3x4y5z6a7b",
        uploadId: "clg8r9s0t0021uv2w3x4y5z6a",
        status: "user_confirmed",
        confidence: 0.9,
        originalConfidence: 0.9,
        label: "adult",
        originalLabel: "adult",
        xMin: 0,
        yMin: 0,
        xMax: 100,
        yMax: 100,
        createdById: testUserId,
        deletedAt: null,
      });

      await db.insert(analysisResults).values({
        caseId: "clf7q8r9s0020tu1v2w3x4y5z",
        status: "completed",
        pmiHours: null,
      });

      // Act: Calculate metrics for the `null` PMI data.
      const metrics = await getDashboardMetrics();

      // Assert: Confirm the average PMI defaults to 0.
      expect(metrics.averagePMI).toBe(0);
    });

    /**
     * Verifies that detections with `null` confidence scores are handled safely.
     */
    it("handles null confidence values", async () => {
      // Arrange: Insert a detection record where the `confidence` field is missing.
      await insertCaseWithData("cli0t1u2v0023wx4y5z6a7b8c", "clj1u2v3w0024xy5z6a7b8c9d", [
        { status: "user_confirmed", confidence: null, label: "adult", originalLabel: "adult" },
      ]);

      // Act: Retrieve metrics.
      const metrics = await getDashboardMetrics();

      // Assert: Confirm the average confidence is treated as 0.
      expect(metrics.averageConfidence).toBe(0);
    });

    /**
     * Verifies that cases with no uploads do not affect case or PMI counts.
     */
    it("handles empty uploads array", async () => {
      // Arrange: Insert a case and an analysis result, but omit any upload records.
      await db.insert(cases).values({
        id: "clk2v3w4x0025yz6a7b8c9d0e",
        userId: testUserId,
        caseName: "No Uploads Case",
        status: "active",
        temperatureCelsius: 25,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
      });

      await db.insert(analysisResults).values({
        caseId: "clk2v3w4x0025yz6a7b8c9d0e",
        status: "completed",
        pmiHours: 10,
      });

      // Act: Invoke metrics calculation.
      const metrics = await getDashboardMetrics();

      // Assert: Confirm that cases without valid data attachments are excluded.
      expect(metrics.totalCases).toBe(0);
      expect(metrics.averagePMI).toBe(0);
    });
  });

  /**
   * Tests for the date-based filtering functionality of the metrics action.
   */
  describe("date filtering", () => {
    /**
     * Ensures an authenticated session is active for filtering tests.
     */
    beforeEach(() => {
      // Arrange: Mock the session for the test user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that data occurring before the `startDate` is excluded.
     */
    it("filters cases by startDate", async () => {
      // Arrange: Insert one case in early 2024 and another in mid 2025.
      await insertCaseWithData(
        "cll3w4x5y0026za7b8c9d0e1f",
        "clm4x5y6z0027ab8c9d0e1f2g",
        [{ status: "user_confirmed", confidence: 0.5, label: "adult", originalLabel: "adult" }],
        null,
        new Date("2024-01-01")
      );

      await insertCaseWithData(
        "cln5y6z7a0028bc9d0e1f2g3h",
        "clo6z7a8b0029cd0e1f2g3h4i",
        [{ status: "user_confirmed", confidence: 0.75, label: "pupa", originalLabel: "pupa" }],
        null,
        new Date("2025-06-01")
      );

      // Act: Request metrics starting from 2025.
      const metrics = await getDashboardMetrics(new Date("2025-01-01"));

      // Assert: Verify only the 2025 case is included.
      expect(metrics.totalCases).toBe(1);
    });

    /**
     * Verifies that data occurring after the `endDate` is excluded.
     */
    it("filters cases by endDate", async () => {
      // Arrange: Insert one case in early 2025 and another in late 2025.
      await insertCaseWithData(
        "clp7a8b9c0030de1f2g3h4i5j",
        "clq8b9c0d0031ef2g3h4i5j6k",
        [{ status: "user_confirmed", confidence: 0.35, label: "adult", originalLabel: "adult" }],
        null,
        new Date("2025-03-01")
      );

      await insertCaseWithData(
        "clr9c0d1e0032fg3h4i5j6k7l",
        "cls0d1e2f0033gh4i5j6k7l8m",
        [{ status: "user_confirmed", confidence: 0.95, label: "pupa", originalLabel: "pupa" }],
        null,
        new Date("2025-12-01")
      );

      // Act: Request metrics ending in mid-2025.
      const metrics = await getDashboardMetrics(undefined, new Date("2025-06-01"));

      // Assert: Verify only the March case is included.
      expect(metrics.totalCases).toBe(1);
    });

    /**
     * Verifies that the metrics engine can apply both start and end date bounds simultaneously.
     */
    it("applies both startDate and endDate filters", async () => {
      // Arrange: Insert a case within the target year.
      await insertCaseWithData(
        "clt1e2f3g0034hi5j6k7l8m9n",
        "clu2f3g4h0035ij6k7l8m9n0o",
        [{ status: "user_confirmed", confidence: 0.65, label: "adult", originalLabel: "adult" }],
        null,
        new Date("2025-06-15")
      );

      // Act: Request metrics for the full calendar year of 2025.
      const metrics = await getDashboardMetrics(new Date("2025-01-01"), new Date("2025-12-31"));

      // Assert: Confirm the case is captured by the range filter.
      expect(metrics.totalCases).toBe(1);
    });
  });
});
