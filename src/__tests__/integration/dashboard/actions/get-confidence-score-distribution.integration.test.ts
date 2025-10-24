"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, detections, uploads, users } from "@/db/schema";
import { getConfidenceScoreDistribution } from "@/features/dashboard/actions/get-confidence-score-distribution";

// Mock the authentication module to simulate user identity and sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `getConfidenceScoreDistribution` server action.
 */
describe("getConfidenceScoreDistribution (integration)", () => {
  const testUserId = mockUsers.primaryUser.id;

  /**
   * Resets the environment and seeds the primary test user before each test execution.
   */
  beforeEach(async () => {
    // Arrange: Reset the mock database and clear all active mocks.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Insert the global test user required for foreign key constraints.
    await db.insert(users).values({
      id: testUserId,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Helper function to construct a full case hierarchy including uploads and multiple detections.
   */
  const insertCaseWithDetections = async (
    caseId: string,
    uploadId: string,
    detectionIds: string[],
    confidenceValues: (number | null)[]
  ) => {
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
      caseDate: new Date(),
    });

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

    for (let i = 0; i < confidenceValues.length; i++) {
      await db.insert(detections).values({
        id: detectionIds[i],
        uploadId: uploadId,
        originalConfidence: confidenceValues[i],
        label: "test-class",
        originalLabel: "test-class",
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
   * Test suite for verifying authentication security boundaries.
   */
  describe("authentication", () => {
    /**
     * Verifies that the action throws an error when no session is present.
     */
    it("throws error when user is not authenticated", async () => {
      // Arrange: Set auth mock to return null.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act & Assert: Verify that the call is rejected with the correct message.
      await expect(getConfidenceScoreDistribution()).rejects.toThrow("User not authenticated");
    });

    /**
     * Verifies that sessions missing identity data are treated as unauthenticated.
     */
    it("throws error when session has no user id", async () => {
      // Arrange: Return an empty session object.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act & Assert: Verify that the call is rejected.
      await expect(getConfidenceScoreDistribution()).rejects.toThrow("User not authenticated");
    });
  });

  /**
   * Test suite for the core histogram logic and bucket assignment.
   */
  describe("confidence distribution calculation", () => {
    /**
     * Configures a valid authenticated session for distribution tests.
     */
    beforeEach(() => {
      // Arrange: Set auth mock to return the standard test user ID.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that the system returns a zeroed structure when no data is available.
     */
    it("returns all 10 buckets with zero counts when no cases exist", async () => {
      // Act: Invoke the distribution calculation for an empty user.
      const result = await getConfidenceScoreDistribution();

      // Assert: Confirm the presence of 10 buckets all initialized to zero.
      expect(result).toHaveLength(10);
      expect(result.every((b) => b.count === 0)).toBe(true);
    });

    /**
     * Verifies that decimal confidence scores are correctly assigned to 10% percentage intervals.
     */
    it("correctly buckets confidence scores in 0-1 range", async () => {
      // Arrange: Seed detections with various low and high decimal scores.
      await insertCaseWithDetections(
        "clfx7ab2k0000qw8r5g9h2j1m",
        "clgm4np8q0001xz7t2v3w8y6r",
        [
          "clhn5oq9r0002ab8u3w4x9z7s",
          "clhn5oq9r0003bc9v4x5y0a8t",
          "clhn5oq9r0004cd0w5y6z1b9u",
          "clhn5oq9r0005de1x6z7a2c0v",
        ],
        [0.05, 0.15, 0.95, 0.99]
      );

      // Act: Retrieve the calculated distribution.
      const result = await getConfidenceScoreDistribution();

      // Assert: Verify counts for individual percentage buckets.
      expect(result.find((b) => b.name === "0-10%")?.count).toBe(1);
      expect(result.find((b) => b.name === "10-20%")?.count).toBe(1);
      expect(result.find((b) => b.name === "90-100%")?.count).toBe(2);
    });

    /**
     * Verifies that integer scores (0-100) are normalized into the 0-1 range for bucketing.
     */
    it("normalizes confidence values > 1 (0-100 scale)", async () => {
      // Arrange: Seed detections using a 0-100 integer scale.
      await insertCaseWithDetections(
        "clkr9st4u0006fg3a8c1d5e2h",
        "cllw0uv5w0007gh4b9d2e6f3i",
        ["clmx1vw6x0008hi5c0e3f7g4j", "clmx1vw6x0009ij6d1f4g8h5k"],
        [55, 75]
      );

      // Act: Retrieve the distribution.
      const result = await getConfidenceScoreDistribution();

      // Assert: Verify that integers were mapped to the correct percentage buckets.
      expect(result.find((b) => b.name === "50-60%")?.count).toBe(1);
      expect(result.find((b) => b.name === "70-80%")?.count).toBe(1);
    });

    /**
     * Verifies that perfect 1.0 or 100 values are handled at the upper boundary.
     */
    it("handles 100% confidence (edge case)", async () => {
      // Arrange: Seed detections with maximum possible confidence values.
      await insertCaseWithDetections(
        "clny2wx7y0010jk7e2g5h9i6l",
        "cloz3xy8z0011kl8f3h6i0j7m",
        ["clpa4yz9a0012lm9g4i7j1k8n", "clpa4yz9a0013mn0h5j8k2l9o"],
        [1, 100]
      );

      // Act: Retrieve the distribution.
      const result = await getConfidenceScoreDistribution();

      // Assert: Confirm both maximum values fall into the highest bucket.
      expect(result.find((b) => b.name === "90-100%")?.count).toBe(2);
    });

    /**
     * Verifies that detections without recorded confidence scores are skipped.
     */
    it("ignores detections with null confidence", async () => {
      // Arrange: Seed a valid detection and one with a null confidence score.
      await insertCaseWithDetections(
        "clqb5za0b0014no1i6k9l3m0p",
        "clrc6ab1c0015op2j7l0m4n1q",
        ["clsd7bc2d0016pq3k8m1n5o2r", "clsd7bc2d0017qr4l9n2o6p3s"],
        [null, 0.85]
      );

      // Act: Retrieve the distribution.
      const result = await getConfidenceScoreDistribution();
      const totalCount = result.reduce((sum, b) => sum + b.count, 0);

      // Assert: Ensure only the valid record is counted.
      expect(totalCount).toBe(1);
      expect(result.find((b) => b.name === "80-90%")?.count).toBe(1);
    });

    /**
     * Verifies that mathematically invalid confidence scores are excluded from the total.
     */
    it("handles invalid bucket index gracefully (negative confidence)", async () => {
      // Arrange: Seed a detection with a negative confidence value.
      await insertCaseWithDetections(
        "clte8cd3e0018rs5m0o3p7q4t",
        "cluf9de4f0019st6n1p4q8r5u",
        ["clvg0ef5g0020tu7o2q5r9s6v", "clvg0ef5g0021uv8p3r6s0t7w"],
        [-0.1, 0.5]
      );

      // Act: Retrieve the distribution.
      const result = await getConfidenceScoreDistribution();
      const totalCount = result.reduce((sum, b) => sum + b.count, 0);

      // Assert: Ensure the negative value did not crash the logic and was excluded.
      expect(totalCount).toBe(1);
      expect(result.find((b) => b.name === "50-60%")?.count).toBe(1);
    });

    /**
     * Verifies the aggregation logic across disparate data nodes (cases and uploads).
     */
    it("aggregates detections across multiple cases and uploads", async () => {
      // Arrange: Insert data into various different cases and upload records.
      await insertCaseWithDetections(
        "clwh1fg6h0022vw9q4s7t1u8x",
        "clxi2gh7i0023wx0r5t8u2v9y",
        ["clyj3hi8j0024xy1s6u9v3w0z"],
        [0.25]
      );

      await db.insert(cases).values({
        id: "clzk4ij9k0025yz2t7v0w4x1a",
        userId: testUserId,
        caseName: "Multi Upload Case",
        status: "active",
        temperatureCelsius: 25,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
      });

      await db.insert(uploads).values({
        id: "clal5jk0l0026za3u8w1x5y2b",
        caseId: "clzk4ij9k0025yz2t7v0w4x1a",
        userId: testUserId,
        name: "multi-upload-a.jpg",
        key: "uploads/clal5jk0l0026za3u8w1x5y2b",
        url: "https://example.com/uploads/clal5jk0l0026za3u8w1x5y2b",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      await db.insert(uploads).values({
        id: "clbm6kl1m0027ab4v9x2y6z3c",
        caseId: "clzk4ij9k0025yz2t7v0w4x1a",
        userId: testUserId,
        name: "multi-upload-b.jpg",
        key: "uploads/clbm6kl1m0027ab4v9x2y6z3c",
        url: "https://example.com/uploads/clbm6kl1m0027ab4v9x2y6z3c",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      await db.insert(detections).values({
        id: "clcn7lm2n0028bc5w0y3z7a4d",
        uploadId: "clal5jk0l0026za3u8w1x5y2b",
        originalConfidence: 0.45,
        label: "test",
        originalLabel: "test",
        xMin: 0,
        yMin: 0,
        xMax: 100,
        yMax: 100,
        createdById: testUserId,
        deletedAt: null,
      });

      await db.insert(detections).values({
        id: "cldo8mn3o0029cd6x1z4a8b5e",
        uploadId: "clbm6kl1m0027ab4v9x2y6z3c",
        originalConfidence: 0.65,
        label: "test",
        originalLabel: "test",
        xMin: 0,
        yMin: 0,
        xMax: 100,
        yMax: 100,
        createdById: testUserId,
        deletedAt: null,
      });

      // Act: Retrieve the aggregate distribution.
      const result = await getConfidenceScoreDistribution();

      // Assert: Verify detections from all sources were included in the buckets.
      expect(result.find((b) => b.name === "20-30%")?.count).toBe(1);
      expect(result.find((b) => b.name === "40-50%")?.count).toBe(1);
      expect(result.find((b) => b.name === "60-70%")?.count).toBe(1);
    });
  });

  /**
   * Test suite for temporal filtering based on the case occurrence date.
   */
  describe("date filtering", () => {
    /**
     * Configures a valid authenticated session for date filtering tests.
     */
    beforeEach(() => {
      // Arrange: Set auth mock to return the standard test user ID.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Helper function to insert a single detection associated with a specific case date.
     */
    const insertCaseWithDate = async (
      caseId: string,
      uploadId: string,
      detectionId: string,
      caseDate: Date,
      confidence: number
    ) => {
      await db.insert(cases).values({
        id: caseId,
        userId: testUserId,
        caseName: `Date Filter Case`,
        status: "active",
        temperatureCelsius: 25,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: caseDate,
      });

      await db.insert(uploads).values({
        id: uploadId,
        caseId: caseId,
        userId: testUserId,
        name: `date-filter-image.jpg`,
        key: `uploads/${uploadId}`,
        url: `https://example.com/uploads/${uploadId}`,
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      await db.insert(detections).values({
        id: detectionId,
        uploadId: uploadId,
        originalConfidence: confidence,
        label: "test",
        originalLabel: "test",
        xMin: 0,
        yMin: 0,
        xMax: 100,
        yMax: 100,
        createdById: testUserId,
        deletedAt: null,
      });
    };

    /**
     * Verifies that the distribution only includes detections from cases after the start date.
     */
    it("filters cases by startDate", async () => {
      // Arrange: Seed cases on either side of the start date boundary.
      await insertCaseWithDate(
        "clep9no4p0030de7y2a5b9c6f",
        "clfq0op5q0031ef8z3b6c0d7g",
        "clgr1pq6r0032fg9a4c7d1e8h",
        new Date("2024-01-01"),
        0.5
      );
      await insertCaseWithDate(
        "clhs2qr7s0033gh0b5d8e2f9i",
        "clit3rs8t0034hi1c6e9f3g0j",
        "clju4st9u0035ij2d7f0g4h1k",
        new Date("2025-06-01"),
        0.75
      );

      // Act: Filter for cases from 2025 onwards.
      const result = await getConfidenceScoreDistribution(new Date("2025-01-01"));
      const totalCount = result.reduce((sum, b) => sum + b.count, 0);

      // Assert: Verify only the 2025 case detection is included.
      expect(totalCount).toBe(1);
      expect(result.find((b) => b.name === "70-80%")?.count).toBe(1);
    });

    /**
     * Verifies that the distribution only includes detections from cases before the end date.
     */
    it("filters cases by endDate", async () => {
      // Arrange: Seed cases on either side of the end date boundary.
      await insertCaseWithDate(
        "clkv5tu0v0036jk3e8g1h5i2l",
        "cllw6uv1w0037kl4f9h2i6j3m",
        "clmx7vw2x0038lm5g0i3j7k4n",
        new Date("2025-03-01"),
        0.35
      );
      await insertCaseWithDate(
        "clny8wx3y0039mn6h1j4k8l5o",
        "cloz9xy4z0040no7i2k5l9m6p",
        "clpa0yz5a0041op8j3l6m0n7q",
        new Date("2025-12-01"),
        0.95
      );

      // Act: Filter for cases up to mid-2025.
      const result = await getConfidenceScoreDistribution(undefined, new Date("2025-06-01"));
      const totalCount = result.reduce((sum, b) => sum + b.count, 0);

      // Assert: Verify only the March case detection is included.
      expect(totalCount).toBe(1);
      expect(result.find((b) => b.name === "30-40%")?.count).toBe(1);
    });

    /**
     * Verifies the simultaneous application of both date boundaries.
     */
    it("applies both startDate and endDate filters", async () => {
      // Arrange: Seed a case within the bounded range.
      await insertCaseWithDate(
        "clqb1za6b0042pq9k4m7n1o8r",
        "clrc2ab7c0043qr0l5n8o2p9s",
        "clsd3bc8d0044rs1m6o9p3q0t",
        new Date("2025-06-15"),
        0.65
      );

      // Act: Apply both start and end date filters for the year 2025.
      const result = await getConfidenceScoreDistribution(
        new Date("2025-01-01"),
        new Date("2025-12-31")
      );
      const totalCount = result.reduce((sum, b) => sum + b.count, 0);

      // Assert: Verify that the case within the range is captured.
      expect(totalCount).toBe(1);
      expect(result.find((b) => b.name === "60-70%")?.count).toBe(1);
    });
  });

  /**
   * Test suite for logical filtering of individual detection records.
   */
  describe("detection filtering", () => {
    /**
     * Configures a valid authenticated session for record filtering tests.
     */
    beforeEach(() => {
      // Arrange: Set auth mock to return the standard test user ID.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that detections marked as deleted are ignored in the calculation.
     */
    it("excludes soft-deleted detections", async () => {
      // Arrange: Seed one active case and upload.
      await db.insert(cases).values({
        id: "clte4cd9e0045st2n7p0q4r1u",
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
        id: "cluf5de0f0046tu3o8q1r5s2v",
        caseId: "clte4cd9e0045st2n7p0q4r1u",
        userId: testUserId,
        name: "soft-delete-test.jpg",
        key: "uploads/cluf5de0f0046tu3o8q1r5s2v",
        url: "https://example.com/uploads/cluf5de0f0046tu3o8q1r5s2v",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      // Arrange: Insert one active detection and one soft-deleted detection.
      await db.insert(detections).values({
        id: "clvg6ef1g0047uv4p9r2s6t3w",
        uploadId: "cluf5de0f0046tu3o8q1r5s2v",
        originalConfidence: 0.45,
        label: "test",
        originalLabel: "test",
        xMin: 0,
        yMin: 0,
        xMax: 100,
        yMax: 100,
        createdById: testUserId,
        deletedAt: null,
      });

      await db.insert(detections).values({
        id: "clwh7fg2h0048vw5q0s3t7u4x",
        uploadId: "cluf5de0f0046tu3o8q1r5s2v",
        originalConfidence: 0.85,
        label: "test",
        originalLabel: "test",
        xMin: 0,
        yMin: 0,
        xMax: 100,
        yMax: 100,
        createdById: testUserId,
        deletedAt: new Date(),
      });

      // Act: Retrieve the distribution.
      const result = await getConfidenceScoreDistribution();
      const totalCount = result.reduce((sum, b) => sum + b.count, 0);

      // Assert: Verify only the active detection is counted.
      expect(totalCount).toBe(1);
      expect(result.find((b) => b.name === "40-50%")?.count).toBe(1);
      expect(result.find((b) => b.name === "80-90%")?.count).toBe(0);
    });

    /**
     * Verifies that the internal database query correctly implements the soft-delete filter.
     */
    it("constructs where clause to filter soft-deleted detections and null confidence", async () => {
      // Arrange: Spy on the database query engine to inspect internal arguments.
      const dbModule = await import("@/db");
      const findManySpy = vi.spyOn(dbModule.db.query.cases, "findMany");

      // Act: Invoke the action.
      await getConfidenceScoreDistribution();

      // Assert: Inspect the nested query parameters for the `detections` relation.
      const findManyCall = findManySpy.mock.calls[0];
      const queryOptions = findManyCall[0] as unknown as {
        with: {
          uploads: {
            with: {
              detections: {
                where: (
                  schema: Record<string, unknown>,
                  utils: { isNull: (col: unknown) => unknown; and: (...args: unknown[]) => unknown }
                ) => unknown;
              };
            };
          };
        };
      };

      const whereFn = queryOptions.with.uploads.with.detections.where;

      const isNullMock = vi.fn().mockReturnValue("isNullResult");
      const andMock = vi.fn().mockReturnValue("andResult");

      const mockDetections = {
        deletedAt: "deletedAtCol",
        originalConfidence: "confidenceCol",
      };

      // Assert: Execute the query builder function to verify it calls the correct filters.
      const result = whereFn(mockDetections, {
        isNull: isNullMock,
        and: andMock,
      });

      expect(isNullMock).toHaveBeenCalledWith("deletedAtCol");
      expect(andMock).toHaveBeenCalled();
      expect(result).toBe("andResult");

      findManySpy.mockRestore();
    });
  });
});
