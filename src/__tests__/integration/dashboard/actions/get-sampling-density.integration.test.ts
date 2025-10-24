"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, uploads, users } from "@/db/schema";
import { getSamplingDensity } from "@/features/dashboard/actions/get-sampling-density";

// Mock the authentication module to simulate user session states.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `getSamplingDensity` server action.
 */
describe("getSamplingDensity (integration)", () => {
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
   * Helper function to insert a case and its associated upload records into the database.
   */
  const insertCaseWithUploads = async (
    caseId: string,
    uploadCount: number,
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

    // Arrange: Populate the `uploads` table with the specified number of file records.
    for (let i = 0; i < uploadCount; i++) {
      await db.insert(uploads).values({
        id: `${caseId}-upload-${i}`,
        caseId: caseId,
        userId: testUserId,
        name: `image-${i}.jpg`,
        key: `uploads/${caseId}-upload-${i}`,
        url: `https://example.com/uploads/${caseId}-upload-${i}`,
        size: 1024,
        type: "image/jpeg",
        width: 1920,
        height: 1080,
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
      await expect(getSamplingDensity()).rejects.toThrow("User not authenticated");
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
      await expect(getSamplingDensity()).rejects.toThrow("User not authenticated");
    });
  });

  /**
   * Tests verifying the logic for bucketing case counts based on the number of associated uploads.
   */
  describe("sampling density calculation", () => {
    /**
     * Configures a valid authenticated session before each density test.
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
    it("returns all ranges with zero counts when no cases exist", async () => {
      // Act: Retrieve the density metrics without any seeded cases.
      const result = await getSamplingDensity();

      // Assert: Verify that five ranges are returned and all have a `quantity` of zero.
      expect(result).toHaveLength(5);
      expect(result.every((range) => range.quantity === 0)).toBe(true);
    });

    /**
     * Verifies that cases with one to four images are counted in the first bucket.
     */
    it("buckets cases with 1-4 images correctly", async () => {
      // Arrange: Insert cases with one and four associated uploads.
      await insertCaseWithUploads("clm8x9y0z0001ab2c3d4e5f6g", 1);
      await insertCaseWithUploads("cln9y0z1a0002bc3d4e5f6g7h", 4);

      // Act: Invoke the density calculation.
      const result = await getSamplingDensity();

      // Assert: Confirm the `1_to_4` bucket contains exactly two items.
      expect(result.find((r) => r.name === "1_to_4")?.quantity).toBe(2);
    });

    /**
     * Verifies that cases with five to eight images are counted correctly.
     */
    it("buckets cases with 5-8 images correctly", async () => {
      // Arrange: Insert cases with five and eight associated uploads.
      await insertCaseWithUploads("clo0z1a2b0003cd4e5f6g7h8i", 5);
      await insertCaseWithUploads("clp1a2b3c0004de5f6g7h8i9j", 8);

      // Act: Invoke the density calculation.
      const result = await getSamplingDensity();

      // Assert: Confirm the `5_to_8` bucket contains exactly two items.
      expect(result.find((r) => r.name === "5_to_8")?.quantity).toBe(2);
    });

    /**
     * Verifies that cases with nine to twelve images are counted correctly.
     */
    it("buckets cases with 9-12 images correctly", async () => {
      // Arrange: Insert a case with ten associated uploads.
      await insertCaseWithUploads("clq2b3c4d0005ef6g7h8i9j0k", 10);

      // Act: Invoke the density calculation.
      const result = await getSamplingDensity();

      // Assert: Confirm the `9_to_12` bucket contains exactly one item.
      expect(result.find((r) => r.name === "9_to_12")?.quantity).toBe(1);
    });

    /**
     * Verifies that cases with thirteen to sixteen images are counted correctly.
     */
    it("buckets cases with 13-16 images correctly", async () => {
      // Arrange: Insert a case with fifteen associated uploads.
      await insertCaseWithUploads("clr3c4d5e0006fg7h8i9j0k1l", 15);

      // Act: Invoke the density calculation.
      const result = await getSamplingDensity();

      // Assert: Confirm the `13_to_16` bucket contains exactly one item.
      expect(result.find((r) => r.name === "13_to_16")?.quantity).toBe(1);
    });

    /**
     * Verifies that cases with seventeen to twenty images are counted correctly.
     */
    it("buckets cases with 17-20 images correctly", async () => {
      // Arrange: Insert a case with twenty associated uploads.
      await insertCaseWithUploads("cls4d5e6f0007gh8i9j0k1l2m", 20);

      // Act: Invoke the density calculation.
      const result = await getSamplingDensity();

      // Assert: Confirm the `17_to_20` bucket contains exactly one item.
      expect(result.find((r) => r.name === "17_to_20")?.quantity).toBe(1);
    });

    /**
     * Verifies that cases with no uploads are excluded from the distribution metrics.
     */
    it("ignores cases with 0 images", async () => {
      // Arrange: Insert one case with zero uploads and one case with three uploads.
      await insertCaseWithUploads("clt5e6f7g0008hi9j0k1l2m3n", 0);
      await insertCaseWithUploads("clu6f7g8h0009ij0k1l2m3n4o", 3);

      // Act: Invoke the density calculation.
      const result = await getSamplingDensity();
      const totalCount = result.reduce((sum, r) => sum + r.quantity, 0);

      // Assert: Confirm that only the case with three uploads was counted.
      expect(totalCount).toBe(1);
    });

    /**
     * Verifies that cases exceeding the maximum threshold are excluded from the results.
     */
    it("ignores cases with more than 20 images", async () => {
      // Arrange: Insert one case with twenty-five uploads and one with five uploads.
      await insertCaseWithUploads("clv7g8h9i0010jk1l2m3n4o5p", 25);
      await insertCaseWithUploads("clw8h9i0j0011kl2m3n4o5p6q", 5);

      // Act: Invoke the density calculation.
      const result = await getSamplingDensity();
      const totalCount = result.reduce((sum, r) => sum + r.quantity, 0);

      // Assert: Confirm that only the case with five uploads was counted.
      expect(totalCount).toBe(1);
      expect(result.find((r) => r.name === "5_to_8")?.quantity).toBe(1);
    });

    /**
     * Verifies that multiple cases are distributed across different buckets simultaneously.
     */
    it("distributes cases across multiple buckets correctly", async () => {
      // Arrange: Seed cases that fall into every available bucket range.
      await insertCaseWithUploads("clx9i0j1k0012lm3n4o5p6q7r", 2);
      await insertCaseWithUploads("cly0j1k2l0013mn4o5p6q7r8s", 6);
      await insertCaseWithUploads("clz1k2l3m0014no5p6q7r8s9t", 11);
      await insertCaseWithUploads("cla2l3m4n0015op6q7r8s9t0u", 14);
      await insertCaseWithUploads("clb3m4n5o0016pq7r8s9t0u1v", 18);

      // Act: Invoke the density calculation.
      const result = await getSamplingDensity();

      // Assert: Verify each bucket contains exactly one case count.
      expect(result.find((r) => r.name === "1_to_4")?.quantity).toBe(1);
      expect(result.find((r) => r.name === "5_to_8")?.quantity).toBe(1);
      expect(result.find((r) => r.name === "9_to_12")?.quantity).toBe(1);
      expect(result.find((r) => r.name === "13_to_16")?.quantity).toBe(1);
      expect(result.find((r) => r.name === "17_to_20")?.quantity).toBe(1);
    });

    /**
     * Verifies that the returned array follows the intended bucket order.
     */
    it("returns ranges in correct order", async () => {
      // Act: Retrieve the density distribution.
      const result = await getSamplingDensity();

      // Assert: Confirm that each array index corresponds to the expected interval label.
      expect(result[0].name).toBe("1_to_4");
      expect(result[1].name).toBe("5_to_8");
      expect(result[2].name).toBe("9_to_12");
      expect(result[3].name).toBe("13_to_16");
      expect(result[4].name).toBe("17_to_20");
    });
  });

  /**
   * Tests verifying that density distribution can be filtered by specific date ranges.
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
      await insertCaseWithUploads("clc4n5o6p0017qr8s9t0u1v2w", 3, new Date("2024-01-01"));
      await insertCaseWithUploads("cld5o6p7q0018rs9t0u1v2w3x", 7, new Date("2025-06-01"));

      // Act: Request density distribution starting from 2025-01-01.
      const result = await getSamplingDensity(new Date("2025-01-01"));
      const totalCount = result.reduce((sum, r) => sum + r.quantity, 0);

      // Assert: Verify only the 2025 case is included.
      expect(totalCount).toBe(1);
      expect(result.find((r) => r.name === "5_to_8")?.quantity).toBe(1);
    });

    /**
     * Verifies that cases occurring after the `endDate` are excluded.
     */
    it("filters cases by endDate", async () => {
      // Arrange: Insert one case inside the range and one after the range.
      await insertCaseWithUploads("cle6p7q8r0019st0u1v2w3x4y", 10, new Date("2025-03-01"));
      await insertCaseWithUploads("clf7q8r9s0020tu1v2w3x4y5z", 15, new Date("2025-12-01"));

      // Act: Request density distribution ending at 2025-06-01.
      const result = await getSamplingDensity(undefined, new Date("2025-06-01"));
      const totalCount = result.reduce((sum, r) => sum + r.quantity, 0);

      // Assert: Verify only the early 2025 case is included.
      expect(totalCount).toBe(1);
      expect(result.find((r) => r.name === "9_to_12")?.quantity).toBe(1);
    });

    /**
     * Verifies that density distribution correctly applies both a start and end boundary.
     */
    it("applies both startDate and endDate filters", async () => {
      // Arrange: Insert a case that falls within a narrow date window.
      await insertCaseWithUploads("clg8r9s0t0021uv2w3x4y5z6a", 18, new Date("2025-06-15"));

      // Act: Request density distribution for the full year of 2025.
      const result = await getSamplingDensity(new Date("2025-01-01"), new Date("2025-12-31"));
      const totalCount = result.reduce((sum, r) => sum + r.quantity, 0);

      // Assert: Confirm the case within the window is counted correctly.
      expect(totalCount).toBe(1);
      expect(result.find((r) => r.name === "17_to_20")?.quantity).toBe(1);
    });
  });
});
