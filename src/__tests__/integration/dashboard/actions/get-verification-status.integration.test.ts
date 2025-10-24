"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, detections, uploads, users } from "@/db/schema";
import { getVerificationStatus } from "@/features/dashboard/actions/get-verification-status";

// Mock the authentication module to simulate user identity and session persistence.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `getVerificationStatus` server action.
 */
describe("getVerificationStatus (integration)", () => {
  const testUserId = mockUsers.primaryUser.id;

  /**
   * Resets the mock database and initializes a test user before each test execution.
   */
  beforeEach(async () => {
    // Arrange: Reset mock call history.
    vi.clearAllMocks();
    // Arrange: Wipe the database to ensure test isolation.
    resetMockDb();

    // Arrange: Seed the database with the test user record.
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
    // Arrange: Create a new record in the `cases` table for the user.
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

    // Arrange: Seed detections with various statuses to test aggregation logic.
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
   * Test suite for authentication-related requirements of the verification action.
   */
  describe("authentication", () => {
    /**
     * Verifies that the function rejects requests from unauthenticated callers.
     */
    it("throws error when user is not authenticated", async () => {
      // Arrange: Configure `auth` to return a null session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act & Assert: Execute the action and check for the authentication error.
      await expect(getVerificationStatus()).rejects.toThrow("User not authenticated");
    });

    /**
     * Verifies that the function rejects sessions missing a user identifier.
     */
    it("throws error when session has no user id", async () => {
      // Arrange: Configure `auth` to return a session without a user ID.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act & Assert: Execute the action and check for the authentication error.
      await expect(getVerificationStatus()).rejects.toThrow("User not authenticated");
    });
  });

  /**
   * Test suite for the core verification state aggregation logic.
   */
  describe("verification status calculation", () => {
    /**
     * Sets a default authenticated session for calculation tests.
     */
    beforeEach(() => {
      // Arrange: Mock `auth` to provide the `testUserId`.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that the system returns zeroed status objects when no data exists.
     */
    it("returns all zero counts when no cases exist", async () => {
      // Act: Retrieve verification status for an empty database state.
      const result = await getVerificationStatus();

      // Assert: Verify all counts are initialized to 0.
      expect(result).toEqual({
        caseVerification: { verified: 0, unverified: 0, inProgress: 0 },
        imageVerification: { verified: 0, unverified: 0, inProgress: 0 },
        detectionVerification: { verified: 0, unverified: 0 },
      });
    });

    /**
     * Verifies that cases with only user-confirmed detections are marked as verified.
     */
    it("counts fully verified cases correctly", async () => {
      // Arrange: Insert a case where every detection has been confirmed or edited by a user.
      await insertCaseWithDetections("clm8x9y0z0001ab2c3d4e5f6g", "cln9y0z1a0002bc3d4e5f6g7h", [
        "user_confirmed",
        "user_edited_confirmed",
      ]);

      // Act: Retrieve verification status.
      const result = await getVerificationStatus();

      // Assert: Confirm the case is counted in the `verified` bucket.
      expect(result.caseVerification.verified).toBe(1);
      expect(result.caseVerification.unverified).toBe(0);
      expect(result.caseVerification.inProgress).toBe(0);
    });

    /**
     * Verifies that cases with only raw model outputs are marked as unverified.
     */
    it("counts fully unverified cases correctly", async () => {
      // Arrange: Insert a case containing only detections generated by the model.
      await insertCaseWithDetections("clo0z1a2b0003cd4e5f6g7h8i", "clp1a2b3c0004de5f6g7h8i9j", [
        "model_generated",
        "model_generated",
      ]);

      // Act: Retrieve verification status.
      const result = await getVerificationStatus();

      // Assert: Confirm the case is counted in the `unverified` bucket.
      expect(result.caseVerification.verified).toBe(0);
      expect(result.caseVerification.unverified).toBe(1);
      expect(result.caseVerification.inProgress).toBe(0);
    });

    /**
     * Verifies that cases with a mix of verified and unverified detections are marked as in-progress.
     */
    it("counts in-progress cases correctly", async () => {
      // Arrange: Insert a case with one confirmed detection and one pending model prediction.
      await insertCaseWithDetections("clq2b3c4d0005ef6g7h8i9j0k", "clr3c4d5e0006fg7h8i9j0k1l", [
        "user_confirmed",
        "model_generated",
      ]);

      // Act: Retrieve verification status.
      const result = await getVerificationStatus();

      // Assert: Confirm the case is counted in the `inProgress` bucket.
      expect(result.caseVerification.verified).toBe(0);
      expect(result.caseVerification.unverified).toBe(0);
      expect(result.caseVerification.inProgress).toBe(1);
    });

    /**
     * Verifies that image-level verification states are calculated independently.
     */
    it("counts image verification status correctly", async () => {
      // Arrange: Create a single case container for multiple uploads.
      await db.insert(cases).values({
        id: "cls4d5e6f0007gh8i9j0k1l2m",
        userId: testUserId,
        caseName: "Test Case",
        status: "active",
        temperatureCelsius: 25,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
      });

      // Arrange: Create a verified image with only user-confirmed detections.
      await db.insert(uploads).values({
        id: "clt5e6f7g0008hi9j0k1l2m3n1",
        caseId: "cls4d5e6f0007gh8i9j0k1l2m",
        userId: testUserId,
        name: "verified.jpg",
        key: "uploads/clt5e6f7g0008hi9j0k1l2m3n1",
        url: "https://example.com/uploads/clt5e6f7g0008hi9j0k1l2m3n1",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      await db.insert(detections).values({
        id: "clq9r0s1t0034ij5k6l7m8n9o",
        uploadId: "clt5e6f7g0008hi9j0k1l2m3n1",
        status: "user_confirmed",
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

      // Arrange: Create an unverified image with only model-generated detections.
      await db.insert(uploads).values({
        id: "clt5e6f7g0008hi9j0k1l2m3n2",
        caseId: "cls4d5e6f0007gh8i9j0k1l2m",
        userId: testUserId,
        name: "unverified.jpg",
        key: "uploads/clt5e6f7g0008hi9j0k1l2m3n2",
        url: "https://example.com/uploads/clt5e6f7g0008hi9j0k1l2m3n2",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      await db.insert(detections).values({
        id: "clr0s1t2u0035jk6l7m8n9o0p",
        uploadId: "clt5e6f7g0008hi9j0k1l2m3n2",
        status: "model_generated",
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

      // Arrange: Create an in-progress image with mixed detection statuses.
      await db.insert(uploads).values({
        id: "clt5e6f7g0008hi9j0k1l2m3n3",
        caseId: "cls4d5e6f0007gh8i9j0k1l2m",
        userId: testUserId,
        name: "inprogress.jpg",
        key: "uploads/clt5e6f7g0008hi9j0k1l2m3n3",
        url: "https://example.com/uploads/clt5e6f7g0008hi9j0k1l2m3n3",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      await db.insert(detections).values({
        id: "cls1t2u3v0036kl7m8n9o0p1q",
        uploadId: "clt5e6f7g0008hi9j0k1l2m3n3",
        status: "user_confirmed",
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

      await db.insert(detections).values({
        id: "clt2u3v4w0037lm8n9o0p1q2r",
        uploadId: "clt5e6f7g0008hi9j0k1l2m3n3",
        status: "model_generated",
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

      // Act: Retrieve verification status.
      const result = await getVerificationStatus();

      // Assert: Confirm that each image is counted in the correct bucket.
      expect(result.imageVerification.verified).toBe(1);
      expect(result.imageVerification.unverified).toBe(1);
      expect(result.imageVerification.inProgress).toBe(1);
    });

    /**
     * Verifies the count of verified versus unverified detection records.
     */
    it("counts detection verification correctly", async () => {
      // Arrange: Insert a mix of user-confirmed and model-generated detections.
      await insertCaseWithDetections("clu6f7g8h0009ij0k1l2m3n4o", "clv7g8h9i0010jk1l2m3n4o5p", [
        "user_confirmed",
        "user_edited_confirmed",
        "model_generated",
        "model_generated",
      ]);

      // Act: Retrieve verification status.
      const result = await getVerificationStatus();

      // Assert: Verify that user interaction counts as verified and model output as unverified.
      expect(result.detectionVerification.verified).toBe(2);
      expect(result.detectionVerification.unverified).toBe(2);
    });

    /**
     * Verifies that cases lacking any detections are ignored in the final tallies.
     */
    it("ignores cases with no detections", async () => {
      // Arrange: Create cases and uploads without any detection records.
      await db.insert(cases).values({
        id: "clw8h9i0j0011kl2m3n4o5p6q",
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
        id: "clx9i0j1k0012lm3n4o5p6q7r",
        caseId: "clw8h9i0j0011kl2m3n4o5p6q",
        userId: testUserId,
        name: "empty.jpg",
        key: "uploads/clx9i0j1k0012lm3n4o5p6q7r",
        url: "https://example.com/uploads/clx9i0j1k0012lm3n4o5p6q7r",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      await db.insert(cases).values({
        id: "cly0j1k2l0013mn4o5p6q7r8s",
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

      // Act: Retrieve status.
      const result = await getVerificationStatus();

      // Assert: Confirm that empty cases are not counted as unverified or verified.
      expect(result.caseVerification).toEqual({ verified: 0, unverified: 0, inProgress: 0 });
    });

    /**
     * Verifies that images without detections are ignored in verification metrics.
     */
    it("ignores images with no detections", async () => {
      // Arrange: Setup a single case with one empty image and one populated image.
      await db.insert(cases).values({
        id: "clz1k2l3m0014no5p6q7r8s9t",
        userId: testUserId,
        caseName: "Test Case",
        status: "active",
        temperatureCelsius: 25,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
      });

      await db.insert(uploads).values({
        id: "clu3v4w5x0038mn9o0p1q2r3s",
        caseId: "clz1k2l3m0014no5p6q7r8s9t",
        userId: testUserId,
        name: "empty.jpg",
        key: "uploads/clu3v4w5x0038mn9o0p1q2r3s",
        url: "https://example.com/uploads/clu3v4w5x0038mn9o0p1q2r3s",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      await db.insert(uploads).values({
        id: "clv4w5x6y0039no0p1q2r3s4t",
        caseId: "clz1k2l3m0014no5p6q7r8s9t",
        userId: testUserId,
        name: "full.jpg",
        key: "uploads/clv4w5x6y0039no0p1q2r3s4t",
        url: "https://example.com/uploads/clv4w5x6y0039no0p1q2r3s4t",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      await db.insert(detections).values({
        id: "clw5x6y7z0040op1q2r3s4t5u",
        uploadId: "clv4w5x6y0039no0p1q2r3s4t",
        status: "user_confirmed",
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

      // Act: Retrieve status.
      const result = await getVerificationStatus();

      // Assert: Verify only the populated image is counted as verified.
      expect(result.imageVerification.verified).toBe(1);
      expect(result.imageVerification.unverified).toBe(0);
      expect(result.imageVerification.inProgress).toBe(0);
    });

    /**
     * Verifies aggregation logic when different cases represent different verification states.
     */
    it("aggregates across multiple cases correctly", async () => {
      // Arrange: Seed three cases, each representing a unique verification state.
      await insertCaseWithDetections("clb3m4n5o0016pq7r8s9t0u1v", "clc4n5o6p0017qr8s9t0u1v2w", [
        "user_confirmed",
      ]);

      await insertCaseWithDetections("cld5o6p7q0018rs9t0u1v2w3x", "cle6p7q8r0019st0u1v2w3x4y", [
        "model_generated",
      ]);

      await insertCaseWithDetections("clf7q8r9s0020tu1v2w3x4y5z", "clg8r9s0t0021uv2w3x4y5z6a", [
        "user_confirmed",
        "model_generated",
      ]);

      // Act: Retrieve status.
      const result = await getVerificationStatus();

      // Assert: Confirm that one case exists in each of the three possible states.
      expect(result.caseVerification.verified).toBe(1);
      expect(result.caseVerification.unverified).toBe(1);
      expect(result.caseVerification.inProgress).toBe(1);
    });

    /**
     * Verifies that detections created from scratch by a user do not count towards verification or non-verification.
     */
    it("handles user_created status (not counted as verified or unverified)", async () => {
      // Arrange: Insert a detection manually created by the user along with a confirmed one.
      await insertCaseWithDetections("clh9s0t1u0022vw3x4y5z6a7b", "cli0t1u2v0023wx4y5z6a7b8c", [
        "user_created",
        "user_confirmed",
      ]);

      // Act: Retrieve verification status.
      const result = await getVerificationStatus();

      // Assert: Verify only the confirmed prediction is counted in the verification bucket.
      expect(result.detectionVerification.verified).toBe(1);
      expect(result.detectionVerification.unverified).toBe(0);
    });
  });

  /**
   * Test suite for validating the temporal filtering of verification data.
   */
  describe("date filtering", () => {
    /**
     * Ensures a valid user session is active for date filter testing.
     */
    beforeEach(() => {
      // Arrange: Mock the `auth` response for identity verification.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that cases occurring before the provided `startDate` are excluded.
     */
    it("filters cases by startDate", async () => {
      // Arrange: Setup data spanning different years.
      await insertCaseWithDetections(
        "clj1u2v3w0024xy5z6a7b8c9d",
        "clk2v3w4x0025yz6a7b8c9d0e",
        ["user_confirmed"],
        new Date("2024-01-01")
      );

      await insertCaseWithDetections(
        "cll3w4x5y0026za7b8c9d0e1f",
        "clm4x5y6z0027ab8c9d0e1f2g",
        ["model_generated"],
        new Date("2025-06-01")
      );

      // Act: Filter for verification status starting in 2025.
      const result = await getVerificationStatus(new Date("2025-01-01"));

      // Assert: Verify only the 2025 data is captured.
      expect(result.caseVerification.verified).toBe(0);
      expect(result.caseVerification.unverified).toBe(1);
    });

    /**
     * Verifies that cases occurring after the provided `endDate` are excluded.
     */
    it("filters cases by endDate", async () => {
      // Arrange: Setup cases across the 2025 timeline.
      await insertCaseWithDetections(
        "cln5y6z7a0028bc9d0e1f2g3h",
        "clo6z7a8b0029cd0e1f2g3h4i",
        ["user_confirmed"],
        new Date("2025-03-01")
      );

      await insertCaseWithDetections(
        "clp7a8b9c0030de1f2g3h4i5j",
        "clq8b9c0d0031ef2g3h4i5j6k",
        ["model_generated"],
        new Date("2025-12-01")
      );

      // Act: Filter for verification status ending by mid-2025.
      const result = await getVerificationStatus(undefined, new Date("2025-06-01"));

      // Assert: Verify only the early 2025 data is captured.
      expect(result.caseVerification.verified).toBe(1);
      expect(result.caseVerification.unverified).toBe(0);
    });

    /**
     * Verifies that both date bounds are applied simultaneously to the status query.
     */
    it("applies both startDate and endDate filters", async () => {
      // Arrange: Setup an in-progress case falling within the target window.
      await insertCaseWithDetections(
        "clr9c0d1e0032fg3h4i5j6k7l",
        "cls0d1e2f0033gh4i5j6k7l8m",
        ["user_confirmed", "model_generated"],
        new Date("2025-06-15")
      );

      // Act: Filter using a bounded 2025 window.
      const result = await getVerificationStatus(new Date("2025-01-01"), new Date("2025-12-31"));

      // Assert: Confirm the case is correctly identified in the filtered set.
      expect(result.caseVerification.inProgress).toBe(1);
    });
  });
});
