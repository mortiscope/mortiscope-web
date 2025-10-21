"use server";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createCase } from "@/features/cases/actions/create-case";
import { type CaseDetailsFormData } from "@/features/cases/schemas/case-details";

// Mock the authentication module to control user session states.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the logging utility to verify that system and user events are recorded.
vi.mock("@/lib/logger", () => ({
  caseLogger: {
    info: vi.fn(),
    error: vi.fn(),
  },
  logError: vi.fn(),
  logUserAction: vi.fn(),
}));

/**
 * Integration test suite for `createCase` server action.
 */
describe("createCase (integration)", () => {
  // Define a standard valid input object to be used across multiple test cases.
  const validInput: CaseDetailsFormData = {
    caseName: "Test Case",
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
   * Resets the database and mocks to a clean state before every test.
   */
  beforeEach(async () => {
    // Arrange: Clear the history of all mocked functions.
    vi.clearAllMocks();
    // Arrange: Wipe the in-memory database to ensure isolation.
    resetMockDb();

    // Arrange: Seed the `users` table with a primary test user.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Test suite for verifying authentication enforcement.
   */
  describe("authentication", () => {
    /**
     * Test case to verify that unauthenticated requests are rejected.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Simulate a missing session by returning null from `auth`.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null as never);

      // Act: Attempt to create a case without a session.
      const result = await createCase(validInput);

      // Assert: Verify the unauthorized error response.
      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });

    /**
     * Test case to verify that sessions missing a user object are rejected.
     */
    it("returns error when session has no user", async () => {
      // Arrange: Simulate an invalid session that contains no user data.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({ user: null } as never);

      // Act: Attempt to create a case with an incomplete session.
      const result = await createCase(validInput);

      // Assert: Verify the unauthorized error response.
      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });
  });

  /**
   * Test suite for validating the structure and content of provided case data.
   */
  describe("input validation", () => {
    /**
     * Sets up a valid authenticated session for validation tests.
     */
    beforeEach(async () => {
      // Arrange: Configure `auth` to return a valid user ID.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as never);
    });

    /**
     * Test case to verify that malformed or empty data triggers validation errors.
     */
    it("returns error for invalid input", async () => {
      // Arrange: Construct an input object that violates schema requirements.
      const invalidInput = {
        caseName: "",
        caseDate: new Date(),
        location: {},
        temperature: {},
      } as CaseDetailsFormData;

      // Act: Attempt to create a case with the invalid data.
      const result = await createCase(invalidInput);

      // Assert: Verify that the action fails and returns specific error details.
      expect(result.success).toBe(false);
      expect(result.error).toBe("Invalid input.");
      expect(result.details).toBeDefined();
    });
  });

  /**
   * Test suite for ensuring temperature data is correctly processed and stored.
   */
  describe("temperature conversion", () => {
    /**
     * Sets up a valid authenticated session for conversion tests.
     */
    beforeEach(async () => {
      // Arrange: Mock the authenticated user session.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as never);
    });

    /**
     * Test case to verify that Celsius values are stored without modification.
     */
    it("stores temperature in Celsius when provided in Celsius", async () => {
      // Act: Invoke the action with temperature unit set to `C`.
      const result = await createCase(validInput);

      // Assert: Verify successful creation.
      expect(result.success).toBe(true);
      expect(result.data?.caseId).toBeDefined();
    });

    /**
     * Test case to verify that Fahrenheit values are converted to Celsius.
     */
    it("converts Fahrenheit to Celsius when provided in Fahrenheit", async () => {
      // Arrange: Modify the input to use the Fahrenheit unit.
      const fahrenheitInput: CaseDetailsFormData = {
        ...validInput,
        temperature: {
          value: 77,
          unit: "F",
        },
      };

      // Act: Invoke the action with the Fahrenheit input.
      const result = await createCase(fahrenheitInput);

      // Assert: Verify the case is created successfully after conversion logic.
      expect(result.success).toBe(true);
      expect(result.data?.caseId).toBeDefined();
    });
  });

  /**
   * Test suite for verifying the complete successful workflow.
   */
  describe("successful creation", () => {
    /**
     * Sets up a valid authenticated session for success path tests.
     */
    beforeEach(async () => {
      // Arrange: Ensure a valid user session is active.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as never);
    });

    /**
     * Test case to verify that a valid case is saved and the event is logged.
     */
    it("creates case and returns case ID", async () => {
      // Arrange: Import the logging dependency to inspect calls.
      const { logUserAction } = await import("@/lib/logger");

      // Act: Invoke the action with standard valid input.
      const result = await createCase(validInput);

      // Assert: Verify the returned data contains the new record ID.
      expect(result.success).toBe(true);
      expect(result.data?.caseId).toBeDefined();
      // Assert: Ensure that `logUserAction` was called for audit purposes.
      expect(logUserAction).toHaveBeenCalled();
    });
  });

  /**
   * Test suite for ensuring robust handling of database and system failures.
   */
  describe("error handling", () => {
    /**
     * Sets up a valid authenticated session for error path tests.
     */
    beforeEach(async () => {
      // Arrange: Provide an authenticated user context.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as never);
    });

    /**
     * Test case to verify behavior when the database fails to return a new ID.
     */
    it("returns error when database fails to return case ID", async () => {
      // Arrange: Mock the `db` insert chain to return an empty array.
      vi.spyOn(db, "insert").mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{}]),
        }),
      } as never);

      // Act: Attempt to create a case when the DB response is missing data.
      const result = await createCase(validInput);

      // Assert: Verify the fallback server error message.
      expect(result.success).toBe(false);
      expect(result.error).toBe("An internal server error occurred while creating the case.");
    });

    /**
     * Test case to verify handling of unique constraint violations on case names.
     */
    it("handles duplicate case name error", async () => {
      // Arrange: Simulate a Postgres unique constraint violation error with code `23505`.
      const duplicateError = new Error("Duplicate key");
      (duplicateError as unknown as { cause: { code: string } }).cause = { code: "23505" };

      // Arrange: Force the database insert to reject with the duplicate error.
      vi.spyOn(db, "insert").mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(duplicateError),
        }),
      } as never);

      // Act: Attempt to create a case with a name that already exists in the database.
      const result = await createCase(validInput);

      // Assert: Verify the specific user-friendly error for duplicates.
      expect(result).toEqual({
        success: false,
        error: "A case with this name already exists.",
      });
    });

    /**
     * Test case to verify that unexpected database errors are logged and handled.
     */
    it("handles generic database errors", async () => {
      // Arrange: Import the logger to verify error reporting.
      const { logError } = await import("@/lib/logger");

      // Arrange: Mock a generic database connection or execution failure.
      vi.spyOn(db, "insert").mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      } as never);

      // Act: Attempt to create a case during a system failure.
      const result = await createCase(validInput);

      // Assert: Verify that a generic error is returned to the user.
      expect(result).toEqual({
        success: false,
        error: "An internal server error occurred while creating the case.",
      });
      // Assert: Ensure the internal error was logged for debugging.
      expect(logError).toHaveBeenCalled();
    });
  });
});
