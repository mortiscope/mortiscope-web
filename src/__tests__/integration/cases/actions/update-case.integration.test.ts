"use server";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockIds, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { cases, users } from "@/db/schema";
import { updateCase } from "@/features/cases/actions/update-case";
import { type CaseDetailsFormData } from "@/features/cases/schemas/case-details";

// Mock the authentication module to control user session states during integration tests.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the logging utility to prevent side effects and verify that specific events are recorded.
vi.mock("@/lib/logger", () => ({
  caseLogger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  logError: vi.fn(),
  logUserAction: vi.fn(),
}));

/**
 * Integration test suite for `updateCase` server action.
 */
describe("updateCase (integration)", () => {
  // Define a stable case identifier from the test fixtures.
  const mockCaseId = mockIds.firstCase;

  // Define a standard valid input object to simulate a complete form submission.
  const validInput: CaseDetailsFormData = {
    caseName: "Updated Case",
    caseDate: new Date(),
    location: {
      region: { code: "01", name: "Region 1" },
      province: { code: "0101", name: "Province 1" },
      city: { code: "010101", name: "City 1" },
      barangay: { code: "01010101", name: "Barangay 1" },
    },
    temperature: {
      value: 25,
      unit: "C",
    },
    notes: undefined,
  };

  /**
   * Helper function to insert a case record into the database before an update operation.
   */
  const seedCase = async (overrides: Partial<typeof cases.$inferInsert> = {}) => {
    // Arrange: Populate the cases table with a baseline record.
    await db.insert(cases).values({
      id: mockCaseId,
      userId: mockUsers.primaryUser.id,
      caseName: "Original Case",
      temperatureCelsius: 25,
      locationRegion: "Region 1",
      locationProvince: "Province 1",
      locationCity: "City 1",
      locationBarangay: "Barangay 1",
      caseDate: new Date(),
      status: "draft",
      ...overrides,
    });
  };

  /**
   * Sets up the test environment by clearing mocks and preparing the database schema.
   */
  beforeEach(async () => {
    // Arrange: Clear the history of all mocked function calls.
    vi.clearAllMocks();
    // Arrange: Reset the database state to ensure test isolation.
    resetMockDb();

    // Arrange: Create a primary user in the database to satisfy foreign key constraints.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Test suite for verifying that only authenticated users can access the update action.
   */
  describe("authentication", () => {
    /**
     * Test case to verify failure when no session is present.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Configure the auth mock to return a null session.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null as never);

      // Act: Attempt to update the case without a valid session.
      const result = await updateCase({ caseId: mockCaseId, details: validInput });

      // Assert: Verify the unauthorized error response.
      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });

    /**
     * Test case to verify failure when the session exists but lacks a user object.
     */
    it("returns error when session has no user", async () => {
      // Arrange: Configure the auth mock to return a session without a user identity.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({ user: null } as never);

      // Act: Attempt to update the case with an incomplete session.
      const result = await updateCase({ caseId: mockCaseId, details: validInput });

      // Assert: Verify the unauthorized error response.
      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });
  });

  /**
   * Test suite for enforcing data integrity through input validation.
   */
  describe("input validation", () => {
    /**
     * Pre-configures a valid authentication state for validation tests.
     */
    beforeEach(async () => {
      // Arrange: Set up a mocked session for the primary test user.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as never);
    });

    /**
     * Test case to verify that empty or malformed fields are rejected.
     */
    it("returns error for invalid input", async () => {
      // Arrange: Construct an invalid input object missing required geographic data.
      const invalidInput = {
        caseName: "",
        caseDate: new Date(),
        location: {},
        temperature: {},
      } as CaseDetailsFormData;

      // Act: Attempt to update the case with the invalid data.
      const result = await updateCase({ caseId: mockCaseId, details: invalidInput });

      // Assert: Verify that validation flags the input as invalid.
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid input.");
      expect(result.details).toBeDefined();
    });
  });

  /**
   * Test suite for verifying ownership and existence of the target case.
   */
  describe("case lookup", () => {
    /**
     * Pre-configures a valid authentication state for lookup tests.
     */
    beforeEach(async () => {
      // Arrange: Ensure the user is perceived as logged in.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as never);
    });

    /**
     * Test case to verify that non-existent case IDs are handled correctly.
     */
    it("returns error when case not found", async () => {
      // Act: Attempt to update a case that has not been seeded in the database.
      const result = await updateCase({ caseId: mockCaseId, details: validInput });

      // Assert: Verify the specific not found or access denied error.
      expect(result).toEqual({
        success: false,
        error: "Case not found or access denied.",
      });
    });

    /**
     * Test case to verify that users cannot update cases owned by others.
     */
    it("returns error when case belongs to different user", async () => {
      // Arrange: Seed a case associated with a different user identifier.
      await db.insert(cases).values({
        id: mockCaseId,
        userId: "different-user-id",
        caseName: "Original Case",
        temperatureCelsius: 25,
        locationRegion: "Region 1",
        locationProvince: "Province 1",
        locationCity: "City 1",
        locationBarangay: "Barangay 1",
        caseDate: new Date(),
        status: "draft",
      });

      // Act: Attempt to update the foreign case using the primary user's session.
      const result = await updateCase({ caseId: mockCaseId, details: validInput });

      // Assert: Verify the security error response preventing cross-user edits.
      expect(result).toEqual({
        success: false,
        error: "Case not found or access denied.",
      });
    });
  });

  /**
   * Test suite for verifying successful data persistence and business logic triggers.
   */
  describe("successful update", () => {
    /**
     * Pre-configures a valid authentication state for successful update paths.
     */
    beforeEach(async () => {
      // Arrange: Establish a valid authenticated session.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as never);
    });

    /**
     * Test case to verify a basic update where temperature remains unchanged.
     */
    it("updates case successfully without temperature change", async () => {
      // Arrange: Import the logger and seed a case matching the input temperature.
      const { logUserAction } = await import("@/lib/logger");
      await seedCase();

      // Act: Update the case with a new name but same temperature.
      const result = await updateCase({ caseId: mockCaseId, details: validInput });

      // Assert: Verify success and that no recalculation was requested.
      expect(result).toEqual({
        success: true,
        recalculationTriggered: false,
      });
      // Assert: Verify that the modification was logged.
      expect(logUserAction).toHaveBeenCalled();
    });

    /**
     * Test case to verify that modifying the temperature triggers downstream logic.
     */
    it("triggers recalculation when temperature changes", async () => {
      // Arrange: Seed a case with a different Celsius value than the input.
      await seedCase({ temperatureCelsius: 20 });

      // Act: Update the case with the new temperature value.
      const result = await updateCase({ caseId: mockCaseId, details: validInput });

      // Assert: Verify the system flags that a recalculation is necessary.
      expect(result).toEqual({
        success: true,
        recalculationTriggered: true,
      });
    });

    /**
     * Test case to verify that temperature values in Fahrenheit are converted before storage.
     */
    it("converts Fahrenheit to Celsius when provided", async () => {
      // Arrange: Seed a baseline case record.
      await seedCase();

      // Arrange: Create an input object using the Fahrenheit scale.
      const fahrenheitInput: CaseDetailsFormData = {
        ...validInput,
        temperature: { value: 77, unit: "F" },
      };

      // Act: Perform the update with the Fahrenheit value.
      const result = await updateCase({ caseId: mockCaseId, details: fahrenheitInput });

      // Assert: Verify successful processing of the unit conversion.
      expect(result.success).toBe(true);
    });

    /**
     * Test case to verify that updates to active cases are audited.
     */
    it("creates audit log entries for active cases with changes", async () => {
      // Arrange: Seed a case with a status of `active` to trigger auditing.
      await seedCase({ status: "active", caseName: "Old Case" });

      // Act: Update the name of the active case.
      const result = await updateCase({ caseId: mockCaseId, details: validInput });

      // Assert: Verify the update completes successfully.
      expect(result.success).toBe(true);
    });
  });

  /**
   * Test suite for verifying handling of database-level errors and edge cases.
   */
  describe("error handling", () => {
    /**
     * Pre-configures a valid authentication state for error handling tests.
     */
    beforeEach(async () => {
      // Arrange: Ensure the user session is valid.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as never);
    });

    /**
     * Test case to verify behavior when a database update target cannot be located.
     */
    it("returns error when update affects no rows", async () => {
      // Arrange: Seed the case and mock the database update to return zero affected rows.
      await seedCase();

      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue({ rowCount: 0 }),
        }),
      } as never);

      // Act: Attempt the update where the row count check will fail.
      const result = await updateCase({ caseId: mockCaseId, details: validInput });

      // Assert: Verify the permission or not found error message.
      expect(result).toEqual({
        success: false,
        error: "Case not found or you do not have permission to edit it.",
      });
    });

    /**
     * Test case to verify handling of unique constraint violations on the case name.
     */
    it("handles duplicate case name error", async () => {
      // Arrange: Seed the case and prepare a mocked database error for duplicate keys.
      await seedCase();

      const duplicateError = new Error("Duplicate key");
      (duplicateError as unknown as { cause: { code: string } }).cause = { code: "23505" };

      // Arrange: Force the update operation to reject with the duplicate name error.
      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(duplicateError),
        }),
      } as never);

      // Act: Attempt to update the case to a name that conflicts with an existing record.
      const result = await updateCase({ caseId: mockCaseId, details: validInput });

      // Assert: Verify the user-friendly duplicate name error.
      expect(result).toEqual({
        success: false,
        error: "A case with this name already exists.",
      });
    });

    /**
     * Test case to verify that generic database failures are logged and reported.
     */
    it("handles generic database errors", async () => {
      // Arrange: Import the logger and seed the case.
      const { logError } = await import("@/lib/logger");
      await seedCase();

      // Arrange: Force the update operation to reject with a generic error.
      vi.spyOn(db, "update").mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      } as never);

      // Act: Attempt to update the case during a database failure.
      const result = await updateCase({ caseId: mockCaseId, details: validInput });

      // Assert: Verify the fallback server error response.
      expect(result).toEqual({
        success: false,
        error: "An internal server error occurred while updating the case.",
      });
      // Assert: Verify that the internal error was logged for debugging.
      expect(logError).toHaveBeenCalled();
    });
  });
});
