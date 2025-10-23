"use server";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockIds, mockLocations, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { cases, users } from "@/db/schema";
import { getCaseName } from "@/features/results/actions/get-case-name";

/**
 * Utility function to seed a test case into the database for name retrieval.
 */
const insertTestCase = async (caseName: string) => {
  // Arrange: Insert a record into the `cases` table with the specified name.
  await db.insert(cases).values({
    id: mockIds.firstCase,
    userId: mockUsers.primaryUser.id,
    caseName,
    temperatureCelsius: mockCases.firstCase.temperatureCelsius,
    ...mockLocations.firstLocation,
    caseDate: new Date("2025-01-15"),
  });
};

/**
 * Integration test suite for the `getCaseName` server action.
 */
describe("getCaseName (integration)", () => {
  /**
   * Resets the environment and prepares a test user before each test execution.
   */
  beforeEach(async () => {
    // Arrange: Clear mock call history and reset the database state.
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
   * Test suite for verifying the retrieval of various case name formats.
   */
  describe("case name retrieval", () => {
    /**
     * Test case to verify that an existing case name is correctly returned.
     */
    it("returns case name when case exists", async () => {
      // Arrange: Seed a case with the name `Case Name`.
      await insertTestCase("Case Name");

      // Act: Retrieve the name using the seeded `mockIds.firstCase`.
      const result = await getCaseName(mockIds.firstCase);

      // Assert: Verify that the returned name matches the seeded value.
      expect(result).toBe("Case Name");
    });

    /**
     * Test case to verify the response when a non-existent ID is queried.
     */
    it("returns null when case does not exist", async () => {
      // Act: Attempt to retrieve a name for a `caseId` that does not exist.
      const result = await getCaseName("non-existent-id");

      // Assert: Verify that the function returns `null`.
      expect(result).toBeNull();
    });

    /**
     * Test case to ensure empty string names are handled as valid values.
     */
    it("handles empty string case name", async () => {
      // Arrange: Seed a case with an empty string for the `caseName`.
      await insertTestCase("");

      // Act: Retrieve the name for the seeded case.
      const result = await getCaseName(mockIds.firstCase);

      // Assert: Verify that an empty string is returned.
      expect(result).toBe("");
    });

    /**
     * Test case to verify support for special characters in the name field.
     */
    it("handles special characters in case name", async () => {
      // Arrange: Seed a name containing symbols and punctuation.
      await insertTestCase("Case #123 - Test & Trial");

      // Act: Retrieve the name for the seeded case.
      const result = await getCaseName(mockIds.firstCase);

      // Assert: Verify the special characters are preserved.
      expect(result).toBe("Case #123 - Test & Trial");
    });

    /**
     * Test case to verify support for international or non-ASCII characters.
     */
    it("handles unicode characters in case name", async () => {
      // Arrange: Seed a name using Japanese Unicode characters.
      await insertTestCase("案件 #001");

      // Act: Retrieve the name for the seeded case.
      const result = await getCaseName(mockIds.firstCase);

      // Assert: Verify the Unicode characters are correctly retrieved.
      expect(result).toBe("案件 #001");
    });
  });

  /**
   * Test suite for verifying robust behavior during database failures.
   */
  describe("error handling", () => {
    /**
     * Test case to verify that exceptions are caught and logged during retrieval.
     */
    it("returns null and logs error when database query fails", async () => {
      // Arrange: Spy on `console.error` and force a query failure in the database module.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db.query.cases, "findFirst").mockRejectedValue(
        new Error("Database connection failed")
      );

      // Act: Attempt to retrieve a name while the database is unresponsive.
      const result = await getCaseName(mockIds.firstCase);

      // Assert: Verify the function fails gracefully by returning `null` and logging the error.
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to fetch case name:", expect.any(Error));
    });
  });
});
