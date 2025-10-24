"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { analysisResults, cases, users } from "@/db/schema";
import { getPmiDistribution } from "@/features/dashboard/actions/get-pmi-distribution";

// Mock the authentication module to control user session states.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `getPmiDistribution` server action.
 */
describe("getPmiDistribution (integration)", () => {
  // Define a constant identifier for the primary test user.
  const testUserId = mockUsers.primaryUser.id;

  /**
   * Cleans the database and sets up the primary test user before each test case.
   */
  beforeEach(async () => {
    // Arrange: Reset mock call history.
    vi.clearAllMocks();
    // Arrange: Restore the database to a clean state.
    resetMockDb();

    // Arrange: Seed the database with a test user record in the `users` table.
    await db.insert(users).values({
      id: testUserId,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Helper function to insert a case and its associated analysis result into the database.
   */
  const insertCaseWithPmi = async (
    caseId: string,
    pmiHours: number | null,
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

    // Arrange: Conditionally insert a record into the `analysisResults` table if a PMI value is provided.
    if (pmiHours !== null) {
      await db.insert(analysisResults).values({
        caseId: caseId,
        status: "completed",
        pmiHours: pmiHours,
      });
    }
  };

  /**
   * Tests focused on authentication and authorization requirements.
   */
  describe("authentication", () => {
    /**
     * Verifies that the action rejects requests when no session exists.
     */
    it("throws error when user is not authenticated", async () => {
      // Arrange: Simulate a null session response from `auth`.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act & Assert: Execute the action and verify the authentication error is thrown.
      await expect(getPmiDistribution()).rejects.toThrow("User not authenticated");
    });

    /**
     * Verifies that the action rejects requests if the session lacks a user identifier.
     */
    it("throws error when session has no user id", async () => {
      // Arrange: Simulate a session object that contains an empty user object.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act & Assert: Execute the action and verify the authentication error is thrown.
      await expect(getPmiDistribution()).rejects.toThrow("User not authenticated");
    });
  });

  /**
   * Tests verifying the logic for bucketing PMI hours into specific time intervals.
   */
  describe("PMI distribution calculation", () => {
    /**
     * Configures a valid authenticated session before each distribution test.
     */
    beforeEach(() => {
      // Arrange: Set up a successful authentication mock for `testUserId`.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies the response structure when the database is empty.
     */
    it("returns all intervals with zero counts when no cases exist", async () => {
      // Act: Retrieve the distribution without any seeded cases.
      const result = await getPmiDistribution();

      // Assert: Verify that seven intervals are returned and all have a `quantity` of zero.
      expect(result).toHaveLength(7);
      expect(result.every((interval) => interval.quantity === 0)).toBe(true);
    });

    /**
     * Verifies that PMI values under 12 hours are counted in the first bucket.
     */
    it("buckets PMI into less than 12h correctly", async () => {
      // Arrange: Insert cases with PMI values of 5 and 11 hours.
      await insertCaseWithPmi("clm8x9y0z0001ab2c3d4e5f6g", 5);
      await insertCaseWithPmi("cln9y0z1a0002bc3d4e5f6g7h", 11);

      // Act: Invoke the distribution calculation.
      const result = await getPmiDistribution();

      // Assert: Confirm the `less_than_12h` bucket contains exactly two items.
      expect(result.find((i) => i.name === "less_than_12h")?.quantity).toBe(2);
    });

    /**
     * Verifies that PMI values between 12 and 24 hours are counted correctly.
     */
    it("buckets PMI into 12 to 24h correctly", async () => {
      // Arrange: Insert cases with PMI values of 12 and 23 hours.
      await insertCaseWithPmi("clo0z1a2b0003cd4e5f6g7h8i", 12);
      await insertCaseWithPmi("clp1a2b3c0004de5f6g7h8i9j", 23);

      // Act: Invoke the distribution calculation.
      const result = await getPmiDistribution();

      // Assert: Confirm the `12_to_24h` bucket contains exactly two items.
      expect(result.find((i) => i.name === "12_to_24h")?.quantity).toBe(2);
    });

    /**
     * Verifies that PMI values between 24 and 36 hours are counted correctly.
     */
    it("buckets PMI into 24 to 36h correctly", async () => {
      // Arrange: Insert a case with a PMI value of 30 hours.
      await insertCaseWithPmi("clq2b3c4d0005ef6g7h8i9j0k", 30);

      // Act: Invoke the distribution calculation.
      const result = await getPmiDistribution();

      // Assert: Confirm the `24_to_36h` bucket contains exactly one item.
      expect(result.find((i) => i.name === "24_to_36h")?.quantity).toBe(1);
    });

    /**
     * Verifies that PMI values between 36 and 48 hours are counted correctly.
     */
    it("buckets PMI into 36 to 48h correctly", async () => {
      // Arrange: Insert a case with a PMI value of 42 hours.
      await insertCaseWithPmi("clr3c4d5e0006fg7h8i9j0k1l", 42);

      // Act: Invoke the distribution calculation.
      const result = await getPmiDistribution();

      // Assert: Confirm the `36_to_48h` bucket contains exactly one item.
      expect(result.find((i) => i.name === "36_to_48h")?.quantity).toBe(1);
    });

    /**
     * Verifies that PMI values between 48 and 60 hours are counted correctly.
     */
    it("buckets PMI into 48 to 60h correctly", async () => {
      // Arrange: Insert a case with a PMI value of 55 hours.
      await insertCaseWithPmi("cls4d5e6f0007gh8i9j0k1l2m", 55);

      // Act: Invoke the distribution calculation.
      const result = await getPmiDistribution();

      // Assert: Confirm the `48_to_60h` bucket contains exactly one item.
      expect(result.find((i) => i.name === "48_to_60h")?.quantity).toBe(1);
    });

    /**
     * Verifies that PMI values between 60 and 72 hours are counted correctly.
     */
    it("buckets PMI into 60 to 72h correctly", async () => {
      // Arrange: Insert a case with a PMI value of 68 hours.
      await insertCaseWithPmi("clt5e6f7g0008hi9j0k1l2m3n", 68);

      // Act: Invoke the distribution calculation.
      const result = await getPmiDistribution();

      // Assert: Confirm the `60_to_72h` bucket contains exactly one item.
      expect(result.find((i) => i.name === "60_to_72h")?.quantity).toBe(1);
    });

    /**
     * Verifies that PMI values of 72 hours or greater are counted in the final bucket.
     */
    it("buckets PMI into more than 72h correctly", async () => {
      // Arrange: Insert cases with PMI values of 72 and 100 hours.
      await insertCaseWithPmi("clu6f7g8h0009ij0k1l2m3n4o", 72);
      await insertCaseWithPmi("clv7g8h9i0010jk1l2m3n4o5p", 100);

      // Act: Invoke the distribution calculation.
      const result = await getPmiDistribution();

      // Assert: Confirm the `more_than_72h` bucket contains exactly two items.
      expect(result.find((i) => i.name === "more_than_72h")?.quantity).toBe(2);
    });

    /**
     * Verifies that cases with no PMI value associated are excluded from the results.
     */
    it("ignores cases with null PMI", async () => {
      // Arrange: Insert a case and a corresponding analysis result with a null `pmiHours`.
      await db.insert(cases).values({
        id: "clw8h9i0j0011kl2m3n4o5p6q",
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

      await db.insert(analysisResults).values({
        caseId: "clw8h9i0j0011kl2m3n4o5p6q",
        status: "completed",
        pmiHours: null,
      });

      // Arrange: Insert a valid case with 10 PMI hours.
      await insertCaseWithPmi("clx9i0j1k0012lm3n4o5p6q7r", 10);

      // Act: Calculate the distribution.
      const result = await getPmiDistribution();
      const totalCount = result.reduce((sum, i) => sum + i.quantity, 0);

      // Assert: Verify that only the valid case was counted.
      expect(totalCount).toBe(1);
    });

    /**
     * Verifies that cases without any analysis result record are excluded.
     */
    it("ignores cases with null analysisResult", async () => {
      // Arrange: Insert a case record without an accompanying record in `analysisResults`.
      await db.insert(cases).values({
        id: "cly0j1k2l0013mn4o5p6q7r8s",
        userId: testUserId,
        caseName: "No Analysis Case",
        status: "active",
        temperatureCelsius: 25,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
      });

      // Arrange: Insert a valid case with 15 PMI hours.
      await insertCaseWithPmi("clz1k2l3m0014no5p6q7r8s9t", 15);

      // Act: Calculate the distribution.
      const result = await getPmiDistribution();
      const totalCount = result.reduce((sum, i) => sum + i.quantity, 0);

      // Assert: Verify that only the case with an analysis result was counted.
      expect(totalCount).toBe(1);
    });

    /**
     * Verifies that data with invalid negative PMI hours are filtered out.
     */
    it("ignores negative PMI values", async () => {
      // Arrange: Insert one case with negative PMI and one with valid positive PMI.
      await insertCaseWithPmi("cla2l3m4n0015op6q7r8s9t0u", -5);
      await insertCaseWithPmi("clb3m4n5o0016pq7r8s9t0u1v", 20);

      // Act: Calculate the distribution.
      const result = await getPmiDistribution();
      const totalCount = result.reduce((sum, i) => sum + i.quantity, 0);

      // Assert: Verify that the negative value was ignored.
      expect(totalCount).toBe(1);
    });

    /**
     * Verifies that the lower boundary of zero hours is correctly bucketed.
     */
    it("handles edge case of PMI exactly at 0", async () => {
      // Arrange: Insert a case with a PMI value of exactly 0 hours.
      await insertCaseWithPmi("clc4n5o6p0017qr8s9t0u1v2w", 0);

      // Act: Calculate the distribution.
      const result = await getPmiDistribution();

      // Assert: Verify the 0 value is captured in the `less_than_12h` bucket.
      expect(result.find((i) => i.name === "less_than_12h")?.quantity).toBe(1);
    });

    /**
     * Verifies that the returned array follows the chronological bucket order.
     */
    it("returns intervals in correct order", async () => {
      // Act: Retrieve the distribution.
      const result = await getPmiDistribution();

      // Assert: Check that each array index corresponds to the expected interval label.
      expect(result[0].name).toBe("less_than_12h");
      expect(result[1].name).toBe("12_to_24h");
      expect(result[2].name).toBe("24_to_36h");
      expect(result[3].name).toBe("36_to_48h");
      expect(result[4].name).toBe("48_to_60h");
      expect(result[5].name).toBe("60_to_72h");
      expect(result[6].name).toBe("more_than_72h");
    });
  });

  /**
   * Tests verifying that distribution can be filtered by specific date ranges.
   */
  describe("date filtering", () => {
    /**
     * Configures a valid authenticated session before each date filtering test.
     */
    beforeEach(() => {
      // Arrange: Set up a successful authentication mock for `testUserId`.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: testUserId },
      } as Session);
    });

    /**
     * Verifies that cases occurring before the `startDate` are excluded.
     */
    it("filters cases by startDate", async () => {
      // Arrange: Insert one case outside the range and one inside the range.
      await insertCaseWithPmi("cld5o6p7q0018rs9t0u1v2w3x", 5, new Date("2024-01-01"));
      await insertCaseWithPmi("cle6p7q8r0019st0u1v2w3x4y", 15, new Date("2025-06-01"));

      // Act: Request distribution starting from 2025-01-01.
      const result = await getPmiDistribution(new Date("2025-01-01"));
      const totalCount = result.reduce((sum, i) => sum + i.quantity, 0);

      // Assert: Verify only the 2025 case is included.
      expect(totalCount).toBe(1);
      expect(result.find((i) => i.name === "12_to_24h")?.quantity).toBe(1);
    });

    /**
     * Verifies that cases occurring after the `endDate` are excluded.
     */
    it("filters cases by endDate", async () => {
      // Arrange: Insert one case inside the range and one after the range.
      await insertCaseWithPmi("clf7q8r9s0020tu1v2w3x4y5z", 30, new Date("2025-03-01"));
      await insertCaseWithPmi("clg8r9s0t0021uv2w3x4y5z6a", 50, new Date("2025-12-01"));

      // Act: Request distribution ending at 2025-06-01.
      const result = await getPmiDistribution(undefined, new Date("2025-06-01"));
      const totalCount = result.reduce((sum, i) => sum + i.quantity, 0);

      // Assert: Verify only the early 2025 case is included.
      expect(totalCount).toBe(1);
      expect(result.find((i) => i.name === "24_to_36h")?.quantity).toBe(1);
    });

    /**
     * Verifies that distribution correctly applies both a start and end boundary.
     */
    it("applies both startDate and endDate filters", async () => {
      // Arrange: Insert a case that falls within a narrow date window.
      await insertCaseWithPmi("clh9s0t1u0022vw3x4y5z6a7b", 45, new Date("2025-06-15"));

      // Act: Request distribution for the full year of 2025.
      const result = await getPmiDistribution(new Date("2025-01-01"), new Date("2025-12-31"));
      const totalCount = result.reduce((sum, i) => sum + i.quantity, 0);

      // Assert: Confirm the case within the window is counted correctly.
      expect(totalCount).toBe(1);
      expect(result.find((i) => i.name === "36_to_48h")?.quantity).toBe(1);
    });
  });
});
