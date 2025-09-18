import { createId } from "@paralleldrive/cuid2";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { updateCase } from "@/features/cases/actions/update-case";

// Mock the authentication utility to control user session state.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept query, update, and insert operations.
vi.mock("@/db", () => ({
  db: {
    query: {
      cases: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
    insert: vi.fn(),
  },
}));

// Mock the database schema references for the `cases` and `caseAuditLogs` tables.
vi.mock("@/db/schema", () => ({
  cases: { id: "cases_id", userId: "cases_userId" },
  caseAuditLogs: {},
}));

// Mock the CUID generator utility.
vi.mock("@paralleldrive/cuid2", () => ({
  createId: vi.fn(),
}));

// Mock the logger utilities.
vi.mock("@/lib/logger", () => ({
  caseLogger: {},
  logUserAction: vi.fn(),
  logError: vi.fn(),
}));

/**
 * Test suite for the `updateCase` server action.
 */
describe("updateCase Server Action", () => {
  // Define constants for user and case identification.
  const userId = "user-123";
  const caseId = "case-abc";

  // Arrange: Define the updated form data used in successful test cases.
  const validFormData = {
    caseName: "Updated Case Name",
    temperature: { value: 30, unit: "C" as const },
    location: {
      region: { code: "R1", name: "Region 1" },
      province: { code: "P1", name: "Province 1" },
      city: { code: "C1", name: "City 1" },
      barangay: { code: "B1", name: "Barangay 1" },
    },
    caseDate: new Date("2025-06-01"),
    notes: "Updated notes",
  };

  // Arrange: Define a mock object representing an existing case in draft status.
  const existingCaseDraft = {
    id: caseId,
    userId: userId,
    caseName: "Original Case Name",
    status: "draft" as const,
    temperatureCelsius: 25,
    locationRegion: "Region 1",
    locationProvince: "Province 1",
    locationCity: "City 1",
    locationBarangay: "Barangay 1",
    caseDate: new Date("2025-01-01"),
    notes: null,
    createdAt: new Date(),
    recalculationNeeded: false,
  };

  // Arrange: Define a mock object representing an existing case in active status.
  const existingCaseActive = {
    ...existingCaseDraft,
    status: "active" as const,
  };

  // Mock functions for the database update and insert chains.
  const mockSet = vi.fn();
  const mockWhere = vi.fn();
  const mockValues = vi.fn();

  // Set up common mock behavior before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    // Arrange: Default authentication is set to a valid session.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: userId } });

    // Arrange: Mock the CUID generator for audit log batch IDs.
    (createId as unknown as Mock).mockReturnValue("batch-id-123");

    // Arrange: Mock the update chain to simulate successful execution (1 affected row).
    mockWhere.mockResolvedValue({ rowCount: 1 });
    mockSet.mockReturnValue({ where: mockWhere });
    vi.mocked(db.update).mockReturnValue({ set: mockSet } as unknown as ReturnType<
      typeof db.update
    >);

    // Arrange: Mock the insert chain for audit logging to resolve successfully.
    mockValues.mockResolvedValue({});
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as unknown as ReturnType<
      typeof db.insert
    >);

    // Arrange: Default case query returns a draft case owned by the user.
    vi.mocked(db.query.cases.findFirst).mockResolvedValue(existingCaseDraft);
  });

  /**
   * Test case to ensure the action is rejected if no authenticated user session is found.
   */
  it("returns unauthorized error if user is not logged in", async () => {
    // Arrange: Mock the authentication function to return null.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Act: Execute the `updateCase` action.
    const result = await updateCase({ caseId, details: validFormData });

    // Assert: Verify that the result indicates an "Unauthorized" error.
    expect(result).toEqual({ success: false, error: "Unauthorized" });
    // Assert: Verify that no database update was attempted.
    expect(db.update).not.toHaveBeenCalled();
  });

  /**
   * Test case to ensure input validation is performed and fails for invalid data.
   */
  it("returns validation error if input data is invalid", async () => {
    // Arrange: Define invalid data that violates the schema constraints.
    const invalidData = { ...validFormData, caseName: "Short" };

    // Act: Execute the `updateCase` action.
    const result = await updateCase({ caseId, details: invalidData });

    // Assert: Verify that the action failed due to validation.
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid input.");
    // Assert: Verify that no database update was attempted.
    expect(db.update).not.toHaveBeenCalled();
  });

  /**
   * Test case to ensure the action fails if the case cannot be found or the authenticated user does not own it.
   */
  it("returns error if case does not exist or user is not owner", async () => {
    // Arrange: Mock the case query to return `undefined` (case not found or ownership mismatch).
    vi.mocked(db.query.cases.findFirst).mockResolvedValue(undefined);

    // Act: Execute the `updateCase` action.
    const result = await updateCase({ caseId, details: validFormData });

    // Assert: Verify that a "Case not found or access denied" error is returned.
    expect(result).toEqual({ success: false, error: "Case not found or access denied." });
    // Assert: Verify that no database update was attempted.
    expect(db.update).not.toHaveBeenCalled();
  });

  /**
   * Test case for successful case update in `draft` status, verifying data changes and recalculation trigger.
   */
  it("successfully updates a case (Draft status)", async () => {
    // Act: Execute the `updateCase` action.
    const result = await updateCase({ caseId, details: validFormData });

    // Assert: Verify successful completion and that recalculation was marked as triggered.
    expect(result).toEqual({ success: true, recalculationTriggered: true });

    // Assert: Verify that the database `set` operation was called with the updated and transformed fields.
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        caseName: "Updated Case Name",
        temperatureCelsius: 30,
        caseDate: validFormData.caseDate,
        notes: "Updated notes",
        recalculationNeeded: true,
      })
    );

    // Assert: Verify that no audit logs were created since the status is "draft".
    expect(db.insert).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that audit logs are generated for changes when the case is in `active` status.
   */
  it("creates audit logs when updating an active case", async () => {
    // Arrange: Mock the case query to return an active case.
    vi.mocked(db.query.cases.findFirst).mockResolvedValue(existingCaseActive);

    // Act: Execute the `updateCase` action.
    await updateCase({ caseId, details: validFormData });

    // Assert: Verify that an insertion (for audit logs) was called.
    expect(db.insert).toHaveBeenCalled();
    // Assert: Verify that the `values` mock was called with an array containing the changes.
    expect(mockValues).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          field: "caseName",
          oldValue: "Original Case Name",
          newValue: "Updated Case Name",
          batchId: "batch-id-123",
        }),
        expect.objectContaining({
          field: "temperatureCelsius",
          oldValue: 25,
          newValue: 30,
        }),
      ])
    );
  });

  /**
   * Test case to ensure the `recalculationNeeded` flag is not set if the temperature value remains the same.
   */
  it("does not trigger recalculationNeeded if temperature is unchanged", async () => {
    // Arrange: Define update data where the temperature is the same as the existing case (25°C).
    const sameTempData = {
      ...validFormData,
      temperature: { value: 25, unit: "C" as const },
    };

    // Act: Execute the `updateCase` action.
    const result = await updateCase({ caseId, details: sameTempData });

    // Assert: Verify successful completion and that recalculation was NOT triggered.
    expect(result).toEqual({ success: true, recalculationTriggered: false });

    // Assert: Check the update argument does not contain the `recalculationNeeded` flag.
    const updateArg = mockSet.mock.calls[0][0];
    expect(updateArg.recalculationNeeded).toBeUndefined();
  });

  /**
   * Test case to ensure the internal Zod schema validation catches missing nested fields that bypass TS.
   */
  it("detects missing location fields (runtime safety check)", async () => {
    // Arrange: Define invalid data where a required nested field is missing.
    const badLocationData = {
      ...validFormData,
      location: { ...validFormData.location, city: null },
    } as unknown as typeof validFormData;

    // Act: Execute the `updateCase` action.
    const result = await updateCase({ caseId, details: badLocationData });

    // Assert: Verify that validation failed and returns the correct error message.
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid input.");
  });

  /**
   * Test case to handle specific PostgreSQL error code for unique constraint violation (duplicate case name).
   */
  it("handles duplicate case name error", async () => {
    // Arrange: Create a mock database error object with the unique constraint code `23505`.
    const duplicateError = new Error("Duplicate key");
    (duplicateError as unknown as { cause: { code: string } }).cause = { code: "23505" };

    // Arrange: Mock the database update execution to reject with the duplicate key error.
    mockWhere.mockRejectedValue(duplicateError);

    // Act: Execute the `updateCase` action.
    const result = await updateCase({ caseId, details: validFormData });

    // Assert: Verify that a specific, user-friendly error message for duplication is returned.
    expect(result).toEqual({
      success: false,
      error: "A case with this name already exists.",
    });
  });

  /**
   * Test case to ensure generic database errors are caught and handled gracefully.
   */
  it("handles generic database errors", async () => {
    // Arrange: Mock the database update execution to reject with a general error.
    mockWhere.mockRejectedValue(new Error("Connection lost"));

    // Act: Execute the `updateCase` action.
    const result = await updateCase({ caseId, details: validFormData });

    // Assert: Verify that a generic internal server error message is returned.
    expect(result).toEqual({
      success: false,
      error: "An internal server error occurred while updating the case.",
    });
  });

  /**
   * Test case for successful update when temperature is provided in Fahrenheit (requires conversion).
   */
  it("successfully updates with Fahrenheit temperature", async () => {
    // Arrange: Define update data with temperature in Fahrenheit (86°F = 30°C).
    const fahrenheitData = {
      ...validFormData,
      temperature: { value: 86, unit: "F" as const },
    };

    // Act: Execute the `updateCase` action.
    const result = await updateCase({ caseId, details: fahrenheitData });

    // Assert: Verify successful completion and that recalculation was triggered.
    expect(result).toEqual({ success: true, recalculationTriggered: true });
    // Assert: Verify that the database received the temperature correctly converted to Celsius.
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        temperatureCelsius: 30,
      })
    );
  });

  /**
   * Test case to handle a scenario where the database update appears to succeed but affects zero rows.
   */
  it("returns error if update affects 0 rows (concurrent delete or permission loss)", async () => {
    // Arrange: Mock the database execution to return 0 affected rows.
    mockWhere.mockResolvedValue({ rowCount: 0 });

    // Act: Execute the `updateCase` action.
    const result = await updateCase({ caseId, details: validFormData });

    // Assert: Verify that an error indicating the case was not updated is returned.
    expect(result).toEqual({
      success: false,
      error: "Case not found or you do not have permission to edit it.",
    });
  });
});
