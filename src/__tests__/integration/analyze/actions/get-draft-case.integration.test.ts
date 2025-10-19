"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, users } from "@/db/schema";
import { getDraftCase } from "@/features/analyze/actions/get-draft-case";

// Mock the authentication module to control user session state.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Define a type for the mocked authentication function for type safety.
type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `getDraftCase` server action.
 */
describe("getDraftCase (integration)", () => {
  /**
   * Resets the testing environment and seeds a primary user before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear mock history and reset the in-memory database.
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
   * Test suite for verifying authentication-based access control.
   */
  describe("authentication", () => {
    /**
     * Test case to verify that unauthenticated users receive a null result.
     */
    it("returns null when user is not authenticated", async () => {
      // Arrange: Force the `auth` function to return a null session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Attempt to fetch a draft case without authentication.
      const result = await getDraftCase();

      // Assert: Verify that the result is null.
      expect(result).toBeNull();
    });

    /**
     * Test case to verify that sessions without a user ID are treated as unauthenticated.
     */
    it("returns null when session has no user id", async () => {
      // Arrange: Force the `auth` function to return a session with an empty user object.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Attempt to fetch a draft case with an incomplete session.
      const result = await getDraftCase();

      // Assert: Verify that the result is null.
      expect(result).toBeNull();
    });
  });

  /**
   * Test suite for verifying successful draft retrieval and prioritization logic.
   */
  describe("successful fetch", () => {
    /**
     * Establishes a valid authentication session before each success path test.
     */
    beforeEach(() => {
      // Arrange: Mock a successful authentication session for the primary user.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify that only the most recent draft belonging to the user is returned.
     */
    it("returns the most recent draft case when one exists", async () => {
      // Arrange: Define timestamps to test chronological sorting.
      const olderDate = new Date("2024-01-01");
      const newerDate = new Date("2024-01-02");

      // Arrange: Seed an older draft case for the primary user.
      await db.insert(cases).values({
        id: "case-old-draft",
        userId: mockUsers.primaryUser.id,
        caseName: "Older Draft Case",
        status: "draft",
        temperatureCelsius: 20,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
        createdAt: olderDate,
      });

      // Arrange: Seed a newer draft case for the primary user.
      await db.insert(cases).values({
        id: mockCases.firstCase.id,
        userId: mockUsers.primaryUser.id,
        caseName: "Draft Case",
        status: "draft",
        temperatureCelsius: 20,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
        createdAt: newerDate,
      });

      // Arrange: Seed an active case to verify it is ignored by the draft filter.
      await db.insert(cases).values({
        id: "case-active",
        userId: mockUsers.primaryUser.id,
        caseName: "Active Case",
        status: "active",
        temperatureCelsius: 20,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
        createdAt: new Date(),
      });

      // Arrange: Seed a draft case for a different user to verify isolation.
      await db.insert(cases).values({
        id: "case-other-user",
        userId: "other-user-id",
        caseName: "Other User Draft",
        status: "draft",
        temperatureCelsius: 20,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
        createdAt: new Date(),
      });

      // Act: Fetch the draft case for the authenticated user.
      const result = await getDraftCase();

      // Assert: Verify the result is the correct, newer draft case.
      expect(result).not.toBeNull();
      expect(result!.id).toBe(mockCases.firstCase.id);
      expect(result!.status).toBe("draft");
    });

    /**
     * Test case to verify that null is returned if the user has no cases with a draft status.
     */
    it("returns null when no draft case exists", async () => {
      // Arrange: Seed only an active case for the user.
      await db.insert(cases).values({
        id: "case-active",
        userId: mockUsers.primaryUser.id,
        caseName: "Active Case",
        status: "active",
        temperatureCelsius: 20,
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        caseDate: new Date(),
      });

      // Act: Attempt to fetch a draft case.
      const result = await getDraftCase();

      // Assert: Verify that no draft case was found.
      expect(result).toBeNull();
    });
  });

  /**
   * Test suite for verifying system resilience during database failures.
   */
  describe("error handling", () => {
    /**
     * Configures a valid session prior to testing error scenarios.
     */
    beforeEach(() => {
      // Arrange: Mock a successful authentication session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Test case to verify that database exceptions are caught and logged appropriately.
     */
    it("returns null and logs error on database failure", async () => {
      // Arrange: Spy on `console.error` and force a database rejection.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db.query.cases, "findFirst").mockRejectedValue(
        new Error("Database connection failed")
      );

      // Act: Attempt to fetch a draft case while the database is failing.
      const result = await getDraftCase();

      // Assert: Verify a null return and that the specific error message was logged.
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching draft case:", expect.any(Error));
    });
  });
});
