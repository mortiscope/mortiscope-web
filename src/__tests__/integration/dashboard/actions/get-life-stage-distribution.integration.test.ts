"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, detections, uploads, users } from "@/db/schema";
import { getLifeStageDistribution } from "@/features/dashboard/actions/get-life-stage-distribution";

// Mock the authentication module to simulate user sessions and identity.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `getLifeStageDistribution` server action.
 */
describe("getLifeStageDistribution (integration)", () => {
  const testUserId = mockUsers.primaryUser.id;

  /**
   * Resets the database state and initializes a test user before each test execution.
   */
  beforeEach(async () => {
    // Arrange: Clear all existing mock call records.
    vi.clearAllMocks();
    // Arrange: Wipe the in-memory database to ensure test isolation.
    resetMockDb();

    // Arrange: Insert the primary test user into the `users` table.
    await db.insert(users).values({
      id: testUserId,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Helper function to populate the database with a case, an upload, and multiple detections.
   */
  const insertCaseWithDetections = async (
    caseId: string,
    uploadId: string,
    labels: string[],
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

    // Arrange: Insert a detection record for every provided label.
    for (let i = 0; i < labels.length; i++) {
      await db.insert(detections).values({
        id: `${caseId}-det-${i}`,
        uploadId: uploadId,
        label: labels[i],
        originalLabel: labels[i],
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
   * Test suite for verifying authentication security on the action.
   */
  describe("authentication", () => {
    /**
     * Confirms that the action rejects requests when no session is present.
     */
    it("throws error when user is not authenticated", async () => {
      // Arrange: Set the authentication mock to return null.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act & Assert: Execute the action and expect an authentication rejection.
      await expect(getLifeStageDistribution()).rejects.toThrow("User not authenticated");
    });

    /**
     * Confirms that the action rejects requests if the session is malformed.
     */
    it("throws error when session has no user id", async () => {
      // Arrange: Set the authentication mock to return a session lacking user details.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act & Assert: Execute the action and expect an authentication rejection.
      await expect(getLifeStageDistribution()).rejects.toThrow("User not authenticated");
    });
  });

  /**
   * Test suite for the aggregation and calculation logic of life stage data.
   */
  describe("life stage distribution calculation", () => {
    /**
     * Sets a default authenticated session for calculation tests.
     */
    beforeEach(() => {
      // Arrange: Configure the `auth` mock to provide the `testUserId`.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that the distribution contains all categories even with no data.
     */
    it("returns all life stages with zero counts when no cases exist", async () => {
      // Act: Fetch the distribution for a user without cases.
      const result = await getLifeStageDistribution();

      // Assert: Verify that 5 canonical life stages are returned with 0 quantity.
      expect(result).toHaveLength(5);
      expect(result.every((stage) => stage.quantity === 0)).toBe(true);
    });

    /**
     * Verifies that detections are correctly mapped to their specific life stage categories.
     */
    it("correctly counts detections by life stage", async () => {
      // Arrange: Insert a case with a specific mix of insect life stages.
      await insertCaseWithDetections("clm8x9y0z0001ab2c3d4e5f6g", "cln9y0z1a0002bc3d4e5f6g7h", [
        "instar_1",
        "instar_1",
        "instar_2",
        "adult",
      ]);

      // Act: Retrieve the life stage distribution.
      const result = await getLifeStageDistribution();

      // Assert: Verify individual counts for each expected life stage.
      expect(result.find((s) => s.name === "instar_1")?.quantity).toBe(2);
      expect(result.find((s) => s.name === "instar_2")?.quantity).toBe(1);
      expect(result.find((s) => s.name === "adult")?.quantity).toBe(1);
      expect(result.find((s) => s.name === "instar_3")?.quantity).toBe(0);
      expect(result.find((s) => s.name === "pupa")?.quantity).toBe(0);
    });

    /**
     * Verifies that the logic correctly sums detections from multiple sources.
     */
    it("aggregates detections across multiple cases and uploads", async () => {
      // Arrange: Create first case and its primary upload.
      await insertCaseWithDetections("clo0z1a2b0003cd4e5f6g7h8i", "clp1a2b3c0004de5f6g7h8i9j", [
        "instar_1",
        "pupa",
      ]);

      // Arrange: Add a second upload to the first case.
      await db.insert(uploads).values({
        id: "clq2b3c4d0005ef6g7h8i9j0k",
        caseId: "clo0z1a2b0003cd4e5f6g7h8i",
        userId: testUserId,
        name: "second-upload.jpg",
        key: "uploads/clq2b3c4d0005ef6g7h8i9j0k",
        url: "https://example.com/uploads/clq2b3c4d0005ef6g7h8i9j0k",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      // Arrange: Add a detection to the second upload.
      await db.insert(detections).values({
        id: "clr3c4d5e0006fg7h8i9j0k1l",
        uploadId: "clq2b3c4d0005ef6g7h8i9j0k",
        label: "instar_2",
        originalLabel: "instar_2",
        confidence: 0.9,
        originalConfidence: 0.9,
        xMin: 0,
        yMin: 0,
        xMax: 100,
        yMax: 100,
        createdById: testUserId,
        deletedAt: null,
      });

      // Arrange: Create a second independent case with more detections.
      await insertCaseWithDetections("cls4d5e6f0007gh8i9j0k1l2m", "clt5e6f7g0008hi9j0k1l2m3n", [
        "instar_1",
        "adult",
      ]);

      // Act: Retrieve the combined distribution.
      const result = await getLifeStageDistribution();

      // Assert: Verify that the totals reflect detections from all uploads and cases.
      expect(result.find((s) => s.name === "instar_1")?.quantity).toBe(2);
      expect(result.find((s) => s.name === "instar_2")?.quantity).toBe(1);
      expect(result.find((s) => s.name === "pupa")?.quantity).toBe(1);
      expect(result.find((s) => s.name === "adult")?.quantity).toBe(1);
    });

    /**
     * Verifies that cases or uploads with zero detections are handled gracefully.
     */
    it("handles cases with no detections", async () => {
      // Arrange: Insert cases and uploads without adding any associated records to the `detections` table.
      await db.insert(cases).values({
        id: "clu6f7g8h0009ij0k1l2m3n4o",
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
        id: "clv7g8h9i0010jk1l2m3n4o5p",
        caseId: "clu6f7g8h0009ij0k1l2m3n4o",
        userId: testUserId,
        name: "empty.jpg",
        key: "uploads/clv7g8h9i0010jk1l2m3n4o5p",
        url: "https://example.com/uploads/clv7g8h9i0010jk1l2m3n4o5p",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      await db.insert(cases).values({
        id: "clw8h9i0j0011kl2m3n4o5p6q",
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

      // Act: Retrieve the distribution.
      const result = await getLifeStageDistribution();

      // Assert: Confirm that all categories remain at zero.
      expect(result.every((stage) => stage.quantity === 0)).toBe(true);
    });

    /**
     * Verifies that the output array follows the predefined chronological order of life stages.
     */
    it("returns stages in canonical order", async () => {
      // Arrange: Insert detections in a non-canonical order.
      await insertCaseWithDetections("clx9i0j1k0012lm3n4o5p6q7r", "cly0j1k2l0013mn4o5p6q7r8s", [
        "adult",
        "instar_3",
        "pupa",
      ]);

      // Act: Retrieve the distribution.
      const result = await getLifeStageDistribution();

      // Assert: Confirm the array indices match the expected life cycle sequence.
      expect(result[0].name).toBe("instar_1");
      expect(result[1].name).toBe("instar_2");
      expect(result[2].name).toBe("instar_3");
      expect(result[3].name).toBe("pupa");
      expect(result[4].name).toBe("adult");
    });
  });

  /**
   * Test suite for date-range filtering of the distribution data.
   */
  describe("date filtering", () => {
    /**
     * Ensures an active authenticated session for filtering tests.
     */
    beforeEach(() => {
      // Arrange: Mock the `auth` function to return a valid test user session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that cases dated before the `startDate` are excluded from the results.
     */
    it("filters cases by startDate", async () => {
      // Arrange: Insert one case in 2024 and another in mid-2025.
      await insertCaseWithDetections(
        "clz1k2l3m0014no5p6q7r8s9t",
        "cla2l3m4n0015op6q7r8s9t0u",
        ["instar_1"],
        new Date("2024-01-01")
      );

      await insertCaseWithDetections(
        "clb3m4n5o0016pq7r8s9t0u1v",
        "clc4n5o6p0017qr8s9t0u1v2w",
        ["adult"],
        new Date("2025-06-01")
      );

      // Act: Request the distribution starting from the year 2025.
      const result = await getLifeStageDistribution(new Date("2025-01-01"));

      // Assert: Confirm the 2024 detection is ignored and the 2025 detection is counted.
      expect(result.find((s) => s.name === "instar_1")?.quantity).toBe(0);
      expect(result.find((s) => s.name === "adult")?.quantity).toBe(1);
    });

    /**
     * Verifies that cases dated after the `endDate` are excluded from the results.
     */
    it("filters cases by endDate", async () => {
      // Arrange: Insert one case in March 2025 and another in December 2025.
      await insertCaseWithDetections(
        "cld5o6p7q0018rs9t0u1v2w3x",
        "cle6p7q8r0019st0u1v2w3x4y",
        ["pupa"],
        new Date("2025-03-01")
      );

      await insertCaseWithDetections(
        "clf7q8r9s0020tu1v2w3x4y5z",
        "clg8r9s0t0021uv2w3x4y5z6a",
        ["instar_3"],
        new Date("2025-12-01")
      );

      // Act: Request the distribution ending in June 2025.
      const result = await getLifeStageDistribution(undefined, new Date("2025-06-01"));

      // Assert: Confirm the March detection is counted and the December detection is ignored.
      expect(result.find((s) => s.name === "pupa")?.quantity).toBe(1);
      expect(result.find((s) => s.name === "instar_3")?.quantity).toBe(0);
    });

    /**
     * Verifies that the distribution logic respects a specific date window.
     */
    it("applies both startDate and endDate filters", async () => {
      // Arrange: Insert a case that falls within the specified 2025 calendar year.
      await insertCaseWithDetections(
        "clh9s0t1u0022vw3x4y5z6a7b",
        "cli0t1u2v0023wx4y5z6a7b8c",
        ["instar_2"],
        new Date("2025-06-15")
      );

      // Act: Fetch the distribution for the range of Jan 2025 to Dec 2025.
      const result = await getLifeStageDistribution(new Date("2025-01-01"), new Date("2025-12-31"));

      // Assert: Confirm the detection within the range is correctly aggregated.
      expect(result.find((s) => s.name === "instar_2")?.quantity).toBe(1);
    });
  });

  /**
   * Test suite for detection-level visibility filters, such as soft deletion.
   */
  describe("detection filtering", () => {
    /**
     * Prepares an authenticated environment for detection filtering tests.
     */
    beforeEach(() => {
      // Arrange: Mock the `auth` function for user identity.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that detections with a non-null `deletedAt` field are ignored in calculations.
     */
    it("excludes soft-deleted detections", async () => {
      // Arrange: Set up a case and upload for deletion testing.
      await db.insert(cases).values({
        id: "clj1u2v3w0024xy5z6a7b8c9d",
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
        id: "clk2v3w4x0025yz6a7b8c9d0e",
        caseId: "clj1u2v3w0024xy5z6a7b8c9d",
        userId: testUserId,
        name: "delete-test.jpg",
        key: "uploads/clk2v3w4x0025yz6a7b8c9d0e",
        url: "https://example.com/uploads/clk2v3w4x0025yz6a7b8c9d0e",
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
      });

      // Arrange: Insert one active detection.
      await db.insert(detections).values({
        id: "cll3w4x5y0026za7b8c9d0e1f",
        uploadId: "clk2v3w4x0025yz6a7b8c9d0e",
        label: "instar_1",
        originalLabel: "instar_1",
        confidence: 0.9,
        originalConfidence: 0.9,
        xMin: 0,
        yMin: 0,
        xMax: 100,
        yMax: 100,
        createdById: testUserId,
        deletedAt: null,
      });

      // Arrange: Insert one soft-deleted detection.
      await db.insert(detections).values({
        id: "clm4x5y6z0027ab8c9d0e1f2g",
        uploadId: "clk2v3w4x0025yz6a7b8c9d0e",
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

      // Act: Retrieve the distribution.
      const result = await getLifeStageDistribution();

      // Assert: Verify that only the active `instar_1` is counted.
      expect(result.find((s) => s.name === "instar_1")?.quantity).toBe(1);
      expect(result.find((s) => s.name === "adult")?.quantity).toBe(0);
    });

    /**
     * Verifies that the database query correctly includes a `where` clause for `deletedAt`.
     */
    it("constructs where clause to filter soft-deleted detections", async () => {
      // Arrange: Import the database module and spy on the `findMany` method of the `cases` table.
      const dbModule = await import("@/db");
      const findManySpy = vi.spyOn(dbModule.db.query.cases, "findMany");

      // Act: Execute the distribution action to trigger the database query.
      await getLifeStageDistribution();

      // Assert: Inspect the first call to `findMany` to verify the structure of the nested query.
      const findManyCall = findManySpy.mock.calls[0];
      const queryOptions = findManyCall[0] as unknown as {
        with: {
          uploads: {
            with: {
              detections: {
                where: (
                  schema: Record<string, unknown>,
                  utils: { isNull: (col: unknown) => unknown }
                ) => unknown;
              };
            };
          };
        };
      };

      // Assert: Extract and validate the logic inside the `detections` filter.
      const whereFn = queryOptions.with.uploads.with.detections.where;

      const isNullMock = vi.fn().mockReturnValue("isNullResult");
      const mockDetections = { deletedAt: "deletedAtCol" };

      const result = whereFn(mockDetections, { isNull: isNullMock });

      // Assert: Verify that `isNull` was called on the `deletedAt` column.
      expect(isNullMock).toHaveBeenCalledWith("deletedAtCol");
      expect(result).toBe("isNullResult");

      // Assert: Clean up the spy.
      findManySpy.mockRestore();
    });
  });
});
