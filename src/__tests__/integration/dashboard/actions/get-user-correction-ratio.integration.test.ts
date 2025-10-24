"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, detections, uploads, users } from "@/db/schema";
import { getUserCorrectionRatio } from "@/features/dashboard/actions/get-user-correction-ratio";

// Mock the authentication module to simulate user identity and session availability.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `getUserCorrectionRatio` server action.
 */
describe("getUserCorrectionRatio (integration)", () => {
  const testUserId = mockUsers.primaryUser.id;

  /**
   * Resets the mock environment and database state before each test case.
   */
  beforeEach(async () => {
    // Arrange: Clear mock call history.
    vi.clearAllMocks();
    // Arrange: Wipe the in-memory database to provide a consistent baseline.
    resetMockDb();

    // Arrange: Seed the database with the primary test user record.
    await db.insert(users).values({
      id: testUserId,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Helper function to populate the database with a case, upload, and associated detections.
   */
  const insertCaseWithDetections = async (
    caseId: string,
    uploadId: string,
    statuses: ("user_confirmed" | "user_edited_confirmed" | "model_generated" | "user_created")[],
    caseDate: Date = new Date()
  ) => {
    // Arrange: Insert a record into the `cases` table.
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

    // Arrange: Insert a record into the `uploads` table linked to the case.
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

    // Arrange: Insert multiple detection records with specific statuses to test ratio logic.
    for (let i = 0; i < statuses.length; i++) {
      await db.insert(detections).values({
        id: `${caseId}-det-${i}`,
        uploadId: uploadId,
        status: statuses[i],
        label: "test",
        originalLabel: "test",
        confidence: 0.9,
        originalConfidence: 0.9,
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
   * Tests focused on the authentication guardrails of the server action.
   */
  describe("authentication", () => {
    /**
     * Verifies that the action throws an error when no session is found.
     */
    it("throws error when user is not authenticated", async () => {
      // Arrange: Force the `auth` mock to return null.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act & Assert: Execute the action and verify the authentication rejection.
      await expect(getUserCorrectionRatio()).rejects.toThrow("User not authenticated");
    });

    /**
     * Verifies that the action throws an error when the session lacks a user ID.
     */
    it("throws error when session has no user id", async () => {
      // Arrange: Force the `auth` mock to return a session without user identification.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act & Assert: Execute the action and verify the authentication rejection.
      await expect(getUserCorrectionRatio()).rejects.toThrow("User not authenticated");
    });
  });

  /**
   * Tests for the core ratio calculation logic and status filtering.
   */
  describe("correction ratio calculation", () => {
    /**
     * Configures a valid authenticated session for calculation tests.
     */
    beforeEach(() => {
      // Arrange: Mock `auth` to return the `testUserId`.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that zeroed results are returned when the user has no case data.
     */
    it("returns zero counts when no cases exist", async () => {
      // Act: Retrieve the ratio for a user with no data.
      const result = await getUserCorrectionRatio();

      // Assert: Confirm both verified and corrected categories are zero.
      expect(result).toEqual([
        { name: "verified_prediction", quantity: 0 },
        { name: "corrected_prediction", quantity: 0 },
      ]);
    });

    /**
     * Verifies that `user_confirmed` statuses are mapped to verified predictions.
     */
    it("counts user_confirmed detections as verified predictions", async () => {
      // Arrange: Insert detections with only `user_confirmed` statuses.
      await insertCaseWithDetections("clm8x9y0z0001ab2c3d4e5f6g", "cln9y0z1a0002bc3d4e5f6g7h", [
        "user_confirmed",
        "user_confirmed",
        "user_confirmed",
      ]);

      // Act: Retrieve the correction ratio.
      const result = await getUserCorrectionRatio();

      // Assert: Verify only verified predictions are counted.
      expect(result.find((r) => r.name === "verified_prediction")?.quantity).toBe(3);
      expect(result.find((r) => r.name === "corrected_prediction")?.quantity).toBe(0);
    });

    /**
     * Verifies that `user_edited_confirmed` statuses are mapped to corrected predictions.
     */
    it("counts user_edited_confirmed detections as corrected predictions", async () => {
      // Arrange: Insert detections with only `user_edited_confirmed` statuses.
      await insertCaseWithDetections("clo0z1a2b0003cd4e5f6g7h8i", "clp1a2b3c0004de5f6g7h8i9j", [
        "user_edited_confirmed",
        "user_edited_confirmed",
      ]);

      // Act: Retrieve the correction ratio.
      const result = await getUserCorrectionRatio();

      // Assert: Verify only corrected predictions are counted.
      expect(result.find((r) => r.name === "verified_prediction")?.quantity).toBe(0);
      expect(result.find((r) => r.name === "corrected_prediction")?.quantity).toBe(2);
    });

    /**
     * Verifies the simultaneous calculation of both ratio categories.
     */
    it("counts both verified and corrected predictions correctly", async () => {
      // Arrange: Insert a mix of confirmed and edited detection statuses.
      await insertCaseWithDetections("clq2b3c4d0005ef6g7h8i9j0k", "clr3c4d5e0006fg7h8i9j0k1l", [
        "user_confirmed",
        "user_edited_confirmed",
        "user_confirmed",
        "user_edited_confirmed",
      ]);

      // Act: Retrieve the correction ratio.
      const result = await getUserCorrectionRatio();

      // Assert: Confirm the split count is accurate.
      expect(result.find((r) => r.name === "verified_prediction")?.quantity).toBe(2);
      expect(result.find((r) => r.name === "corrected_prediction")?.quantity).toBe(2);
    });

    /**
     * Verifies that raw model predictions are excluded from user correction ratios.
     */
    it("ignores model_generated detections", async () => {
      // Arrange: Insert a mix of model and user statuses.
      await insertCaseWithDetections("cls4d5e6f0007gh8i9j0k1l2m", "clt5e6f7g0008hi9j0k1l2m3n", [
        "model_generated",
        "model_generated",
        "user_confirmed",
      ]);

      // Act: Retrieve the correction ratio.
      const result = await getUserCorrectionRatio();
      const totalCount =
        (result.find((r) => r.name === "verified_prediction")?.quantity ?? 0) +
        (result.find((r) => r.name === "corrected_prediction")?.quantity ?? 0);

      // Assert: Confirm only user-interacted detections are counted.
      expect(totalCount).toBe(1);
    });

    /**
     * Verifies that manual user additions are excluded from model prediction ratios.
     */
    it("ignores user_created detections", async () => {
      // Arrange: Insert detections created by the user from scratch.
      await insertCaseWithDetections("clu6f7g8h0009ij0k1l2m3n4o", "clv7g8h9i0010jk1l2m3n4o5p", [
        "user_created",
        "user_confirmed",
      ]);

      // Act: Retrieve the correction ratio.
      const result = await getUserCorrectionRatio();
      const totalCount =
        (result.find((r) => r.name === "verified_prediction")?.quantity ?? 0) +
        (result.find((r) => r.name === "corrected_prediction")?.quantity ?? 0);

      // Assert: Confirm manually created items are ignored.
      expect(totalCount).toBe(1);
    });

    /**
     * Verifies the aggregation logic across different cases and uploads.
     */
    it("aggregates detections across multiple cases and uploads", async () => {
      // Arrange: Setup first case and upload.
      await insertCaseWithDetections("clw8h9i0j0011kl2m3n4o5p6q", "clx9i0j1k0012lm3n4o5p6q7r", [
        "user_confirmed",
      ]);

      // Arrange: Add a second upload to the first case.
      await db.insert(uploads).values({
        id: "cly0j1k2l0013mn4o5p6q7r8s",
        caseId: "clw8h9i0j0011kl2m3n4o5p6q",
        userId: testUserId,
        name: "second-upload.jpg",
        key: "uploads/cly0j1k2l0013mn4o5p6q7r8s",
        url: "https://example.com/uploads/cly0j1k2l0013mn4o5p6q7r8s",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      // Arrange: Add a detection to the second upload.
      await db.insert(detections).values({
        id: "clz1k2l3m0014no5p6q7r8s9t",
        uploadId: "cly0j1k2l0013mn4o5p6q7r8s",
        status: "user_edited_confirmed",
        label: "test",
        originalLabel: "test",
        confidence: 0.9,
        originalConfidence: 0.9,
        xMin: 0,
        yMin: 0,
        xMax: 100,
        yMax: 100,
        createdById: testUserId,
        deletedAt: null,
      });

      // Arrange: Add a separate case with mixed detections.
      await insertCaseWithDetections("cla2l3m4n0015op6q7r8s9t0u", "clb3m4n5o0016pq7r8s9t0u1v", [
        "user_confirmed",
        "user_edited_confirmed",
      ]);

      // Act: Retrieve the correction ratio for all user data.
      const result = await getUserCorrectionRatio();

      // Assert: Confirm totals across all records are correct.
      expect(result.find((r) => r.name === "verified_prediction")?.quantity).toBe(2);
      expect(result.find((r) => r.name === "corrected_prediction")?.quantity).toBe(2);
    });

    /**
     * Verifies that empty case and upload shells are handled without errors.
     */
    it("handles empty uploads and empty detections", async () => {
      // Arrange: Create cases and an upload record without any child detections.
      await db.insert(cases).values({
        id: "clc4n5o6p0017qr8s9t0u1v2w",
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

      await db.insert(cases).values({
        id: "cld5o6p7q0018rs9t0u1v2w3x",
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

      // Act: Retrieve the correction ratio.
      const result = await getUserCorrectionRatio();

      // Assert: Verify the result defaults to zero counts.
      expect(result).toEqual([
        { name: "verified_prediction", quantity: 0 },
        { name: "corrected_prediction", quantity: 0 },
      ]);
    });
  });

  /**
   * Tests for the date-range filtering functionality.
   */
  describe("date filtering", () => {
    /**
     * Configures a valid authenticated session for filtering tests.
     */
    beforeEach(() => {
      // Arrange: Mock the authentication response.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that data dated before the `startDate` is excluded.
     */
    it("filters cases by startDate", async () => {
      // Arrange: Insert cases in 2024 and mid-2025.
      await insertCaseWithDetections(
        "clf7q8r9s0020tu1v2w3x4y5z",
        "clg8r9s0t0021uv2w3x4y5z6a",
        ["user_confirmed"],
        new Date("2024-01-01")
      );

      await insertCaseWithDetections(
        "clh9s0t1u0022vw3x4y5z6a7b",
        "cli0t1u2v0023wx4y5z6a7b8c",
        ["user_edited_confirmed"],
        new Date("2025-06-01")
      );

      // Act: Fetch ratio starting from 2025.
      const result = await getUserCorrectionRatio(new Date("2025-01-01"));

      // Assert: Confirm the 2024 record is ignored.
      expect(result.find((r) => r.name === "verified_prediction")?.quantity).toBe(0);
      expect(result.find((r) => r.name === "corrected_prediction")?.quantity).toBe(1);
    });

    /**
     * Verifies that data dated after the `endDate` is excluded.
     */
    it("filters cases by endDate", async () => {
      // Arrange: Insert cases in early 2025 and late 2025.
      await insertCaseWithDetections(
        "clj1u2v3w0024xy5z6a7b8c9d",
        "clk2v3w4x0025yz6a7b8c9d0e",
        ["user_confirmed"],
        new Date("2025-03-01")
      );

      await insertCaseWithDetections(
        "cll3w4x5y0026za7b8c9d0e1f",
        "clm4x5y6z0027ab8c9d0e1f2g",
        ["user_edited_confirmed"],
        new Date("2025-12-01")
      );

      // Act: Fetch ratio ending in June 2025.
      const result = await getUserCorrectionRatio(undefined, new Date("2025-06-01"));

      // Assert: Confirm the late 2025 record is ignored.
      expect(result.find((r) => r.name === "verified_prediction")?.quantity).toBe(1);
      expect(result.find((r) => r.name === "corrected_prediction")?.quantity).toBe(0);
    });

    /**
     * Verifies that both date bounds are applied simultaneously.
     */
    it("applies both startDate and endDate filters", async () => {
      // Arrange: Insert a case falling within the target range.
      await insertCaseWithDetections(
        "cln5y6z7a0028bc9d0e1f2g3h",
        "clo6z7a8b0029cd0e1f2g3h4i",
        ["user_confirmed", "user_edited_confirmed"],
        new Date("2025-06-15")
      );

      // Act: Fetch ratio for the specified range.
      const result = await getUserCorrectionRatio(new Date("2025-01-01"), new Date("2025-12-31"));

      // Assert: Confirm counts reflect detections within the date window.
      expect(result.find((r) => r.name === "verified_prediction")?.quantity).toBe(1);
      expect(result.find((r) => r.name === "corrected_prediction")?.quantity).toBe(1);
    });
  });
});
