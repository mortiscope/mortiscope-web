import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { createCase } from "@/features/cases/actions/create-case";

// Mock the authentication utility to control user session state.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client to intercept insert operations.
vi.mock("@/db", () => ({
  db: {
    insert: vi.fn(),
  },
}));

// Mock the logger utilities.
vi.mock("@/lib/logger", () => ({
  caseLogger: {},
  logUserAction: vi.fn(),
  logError: vi.fn(),
}));

// Mock the database schema reference for the `cases` table.
vi.mock("@/db/schema", () => ({
  cases: {},
}));

/**
 * Test suite for the `createCase` server action.
 */
describe("createCase Server Action", () => {
  // Arrange: Define a valid data object to be used for case creation tests.
  const validFormData = {
    caseName: "Test Case",
    temperature: { value: 25, unit: "C" as const },
    location: {
      region: { code: "R1", name: "Region 1" },
      province: { code: "P1", name: "Province 1" },
      city: { code: "C1", name: "City 1" },
      barangay: { code: "B1", name: "Barangay 1" },
    },
    caseDate: new Date("2025-01-01"),
    notes: "Optional notes",
  };

  // Mock functions for the database insert chain: `returning`, `values`, and `insert`.
  const mockReturning = vi.fn();
  const mockValues = vi.fn();
  const mockInsert = vi.fn();

  // Set up common mock behavior before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    // Arrange: Mock the end of the chain to resolve with a successful case ID.
    mockReturning.mockResolvedValue([{ id: "new-case-123" }]);
    // Arrange: Mock the `values` step to return the `returning` mock for chaining.
    mockValues.mockReturnValue({ returning: mockReturning });
    // Arrange: Mock the `insert` step to return the `values` mock for chaining.
    mockInsert.mockReturnValue({ values: mockValues });
    vi.mocked(db.insert).mockImplementation(mockInsert);

    // Arrange: Default authentication is set to a valid session.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: "user-123" } });
  });

  /**
   * Test case to ensure the action is rejected if no authenticated user session is found.
   */
  it("returns unauthorized error if user is not logged in", async () => {
    // Arrange: Mock the authentication function to return null.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Act: Execute the `createCase` action.
    const result = await createCase(validFormData);

    // Assert: Verify that the result indicates an "Unauthorized" error.
    expect(result).toEqual({ success: false, error: "Unauthorized" });
    // Assert: Verify that no database interaction was attempted.
    expect(db.insert).not.toHaveBeenCalled();
  });

  /**
   * Test case to ensure input validation is performed and fails for invalid data, such as a too-short case name.
   */
  it("returns validation error if input data is invalid", async () => {
    // Arrange: Define invalid data that violates the schema constraints.
    const invalidData = { ...validFormData, caseName: "Short" };

    // Act: Execute the `createCase` action.
    const result = await createCase(invalidData);

    // Assert: Verify that the action failed due to validation.
    expect(result.success).toBe(false);
    // Assert: Verify the generic input error message.
    expect(result.error).toBe("Invalid input.");
    // Assert: Verify that detailed validation errors are provided.
    expect(result.details).toBeDefined();
    // Assert: Verify that no database interaction was attempted.
    expect(db.insert).not.toHaveBeenCalled();
  });

  /**
   * Test case for successful case creation when the input temperature is already in Celsius.
   */
  it("successfully creates a case with Celsius temperature", async () => {
    // Act: Execute the `createCase` action with valid Celsius data.
    const result = await createCase(validFormData);

    // Assert: Verify that the action succeeded and returned the new case ID.
    expect(result).toEqual({ success: true, data: { caseId: "new-case-123" } });

    // Assert: Verify that the database `values` mock was called with the correct and transformed data.
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-123",
        caseName: "Test Case",
        temperatureCelsius: 25,
        locationCity: "City 1",
        status: "draft",
      })
    );
  });

  /**
   * Test case for successful case creation, including conversion of Fahrenheit temperature to Celsius.
   */
  it("successfully creates a case converting Fahrenheit to Celsius", async () => {
    // Arrange: Define input data with temperature in Fahrenheit (77°F = 25°C).
    const fahrenheitData = {
      ...validFormData,
      temperature: { value: 77, unit: "F" as const },
    };

    // Act: Execute the `createCase` action.
    const result = await createCase(fahrenheitData);

    // Assert: Verify that the action succeeded.
    expect(result.success).toBe(true);

    // Assert: Verify that the database received the temperature correctly converted to Celsius (25).
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        temperatureCelsius: 25,
      })
    );
  });

  /**
   * Test case to ensure that general database errors are caught and handled gracefully.
   */
  it("handles database errors gracefully", async () => {
    // Arrange: Mock the database execution to reject with a generic error.
    mockReturning.mockRejectedValue(new Error("DB Connection Failed"));

    // Act: Execute the `createCase` action.
    const result = await createCase(validFormData);

    // Assert: Verify that a generic internal server error message is returned.
    expect(result).toEqual({
      success: false,
      error: "An internal server error occurred while creating the case.",
    });
  });

  /**
   * Test case to ensure the schema validation detects missing required nested fields like `city`.
   */
  it("detects missing location fields (caught by schema validation)", async () => {
    // Arrange: Define invalid data where a required location field is missing.
    const badLocationData = {
      ...validFormData,
      location: { ...validFormData.location, city: null },
    } as unknown as typeof validFormData;

    // Act: Execute the `createCase` action.
    const result = await createCase(badLocationData);

    // Assert: Verify that validation failed.
    expect(result.success).toBe(false);
    expect(result.error).toBe("Invalid input.");
    // Assert: Verify that the specific validation message for the missing field is present in details.
    expect(result.details?.[0].message).toBe("City/Municipality is required.");
  });

  /**
   * Test case to handle specific PostgreSQL error code for unique constraint violation (duplicate case name).
   */
  it("handles duplicate case name error (code 23505)", async () => {
    // Arrange: Create a mock database error object with the unique constraint code `23505`.
    const duplicateError = new Error("Duplicate key");
    (duplicateError as unknown as { cause: { code: string } }).cause = { code: "23505" };
    // Arrange: Mock the database execution to reject with the duplicate key error.
    mockReturning.mockRejectedValue(duplicateError);

    // Act: Execute the `createCase` action.
    const result = await createCase(validFormData);

    // Assert: Verify that a specific, user-friendly error message for duplication is returned.
    expect(result).toEqual({
      success: false,
      error: "A case with this name already exists.",
    });
  });

  /**
   * Test case to ensure the action handles unexpected behavior where the database insert succeeds but returns no data.
   */
  it("throws error if database does not return a new case ID", async () => {
    // Arrange: Mock the database execution to resolve with an empty array.
    mockReturning.mockResolvedValue([]);

    // Act: Execute the `createCase` action.
    const result = await createCase(validFormData);

    // Assert: Verify that a generic internal server error message is returned due to the missing ID.
    expect(result).toEqual({
      success: false,
      error: "An internal server error occurred while creating the case.",
    });
  });
});
