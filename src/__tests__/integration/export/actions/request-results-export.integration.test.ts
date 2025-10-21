"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockIds, mockLocations, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, users } from "@/db/schema";
import { requestResultsExport } from "@/features/export/actions/request-results-export";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the Next.js cache module to track path revalidation calls.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock the Inngest client to verify that background jobs are correctly dispatched.
vi.mock("@/lib/inngest", () => ({
  inngest: {
    send: vi.fn().mockResolvedValue(undefined),
  },
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Helper function to seed a test case into the database for referential integrity.
 */
const insertTestCase = async (overrides?: { userId?: string }) => {
  await db.insert(cases).values({
    id: mockIds.firstCase,
    userId: overrides?.userId ?? mockUsers.primaryUser.id,
    caseName: mockCases.firstCase.caseName,
    temperatureCelsius: mockCases.firstCase.temperatureCelsius,
    ...mockLocations.firstLocation,
    caseDate: new Date("2025-01-15"),
  });
};

/**
 * Integration test suite for the `requestResultsExport` server action.
 */
describe("requestResultsExport (integration)", () => {
  const validRawDataInput = {
    caseId: mockIds.firstCase,
    format: "raw_data" as const,
  };

  const validLabelledImagesInput = {
    caseId: mockIds.firstCase,
    format: "labelled_images" as const,
    resolution: "1920x1080" as const,
  };

  const validPdfInput = {
    caseId: mockIds.firstCase,
    format: "pdf" as const,
    pageSize: "a4" as const,
    securityLevel: "standard" as const,
  };

  /**
   * Resets database state and populates shared test data before each test.
   */
  beforeEach(async () => {
    // Arrange: Reset mock history and database schema.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Create a primary test user in the `users` table.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Test suite for verifying authentication requirements.
   */
  describe("authentication", () => {
    /**
     * Verifies that the action returns an unauthorized error when no session is present.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Simulate a null session from the `auth` function.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Attempt to request a results export.
      const result = await requestResultsExport(validRawDataInput);

      // Assert: Verify the response matches the expected unauthorized error.
      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });

    /**
     * Verifies that sessions missing identity data are rejected.
     */
    it("returns error when session has no user id", async () => {
      // Arrange: Simulate a session object that contains no user identification.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Attempt to request a results export.
      const result = await requestResultsExport(validRawDataInput);

      // Assert: Verify the response matches the expected unauthorized error.
      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });
  });

  /**
   * Test suite for verifying schema validation of input parameters.
   */
  describe("input validation", () => {
    /**
     * Configures a valid authenticated session before validation tests.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that malformed identifiers are caught during validation.
     */
    it("returns error for invalid caseId", async () => {
      // Act: Call the action with a non-standard identifier string.
      const result = await requestResultsExport({
        caseId: "invalid-id",
        format: "raw_data",
      } as never);

      // Assert: Verify that the operation reports a failure.
      expect(result.success).toBe(false);
    });
  });

  /**
   * Test suite for verifying data ownership and record existence.
   */
  describe("case lookup", () => {
    /**
     * Configures a valid authenticated session before lookup tests.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies the error response when the requested case ID does not exist.
     */
    it("returns error when case not found", async () => {
      // Act: Attempt to request an export for a non-existent case record.
      const result = await requestResultsExport(validRawDataInput);

      // Assert: Verify the generic not found or permission denied message.
      expect(result).toEqual({
        success: false,
        error: "Case not found or permission denied.",
      });
    });

    /**
     * Verifies that the action prevents users from exporting cases belonging to others.
     */
    it("returns error when case belongs to different user", async () => {
      // Arrange: Create a second user and a case record associated with them.
      await db.insert(users).values({
        id: mockIds.secondUser,
        email: mockUsers.secondaryUser.email,
        name: mockUsers.secondaryUser.name,
      });

      await insertTestCase({ userId: mockIds.secondUser });

      // Act: Attempt to request an export for the foreign case record.
      const result = await requestResultsExport(validRawDataInput);

      // Assert: Verify the security error response.
      expect(result).toEqual({
        success: false,
        error: "Case not found or permission denied.",
      });
    });
  });

  /**
   * Test suite for verifying side effects and data creation on successful requests.
   */
  describe("successful export request", () => {
    /**
     * Configures authentication and seeds required data for success scenarios.
     */
    beforeEach(async () => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      await insertTestCase();
    });

    /**
     * Verifies that a `raw_data` export record is successfully initialized.
     */
    it("creates raw_data export and returns exportId", async () => {
      // Act: Invoke the export request for raw data.
      const result = await requestResultsExport(validRawDataInput);

      // Assert: Verify the success status and the presence of a generated export identifier.
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("exportId");
        expect(typeof result.data!.exportId).toBe("string");
      }
    });

    /**
     * Verifies that a `labelled_images` export record is successfully initialized.
     */
    it("creates labelled_images export with resolution", async () => {
      // Act: Invoke the export request for labelled images.
      const result = await requestResultsExport(validLabelledImagesInput);

      // Assert: Verify the success status and the presence of a generated export identifier.
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("exportId");
        expect(typeof result.data!.exportId).toBe("string");
      }
    });

    /**
     * Verifies that a `pdf` export record is successfully initialized.
     */
    it("creates pdf export", async () => {
      // Act: Invoke the export request for a PDF report.
      const result = await requestResultsExport(validPdfInput);

      // Assert: Verify the success status and the presence of a generated export identifier.
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("exportId");
        expect(typeof result.data!.exportId).toBe("string");
      }
    });

    /**
     * Verifies that the background worker event is dispatched with the expected payload.
     */
    it("sends Inngest event with correct data", async () => {
      // Arrange: Import the mocked Inngest client.
      const { inngest } = await import("@/lib/inngest");

      // Act: Initiate the export request.
      const result = await requestResultsExport(validRawDataInput);

      // Assert: Verify that the event name and data payload are correctly constructed.
      expect(result.success).toBe(true);
      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "export/case.data.requested",
          data: expect.objectContaining({
            exportId: expect.any(String),
            userId: mockUsers.primaryUser.id,
            caseId: mockIds.firstCase,
          }),
        })
      );
    });

    /**
     * Verifies that the UI cache for the relevant results page is revalidated.
     */
    it("calls revalidatePath with correct case path", async () => {
      // Arrange: Import the mocked revalidatePath utility.
      const { revalidatePath } = await import("next/cache");

      // Act: Initiate the export request.
      await requestResultsExport(validRawDataInput);

      // Assert: Verify the specific path for the case results is targeted for revalidation.
      expect(revalidatePath).toHaveBeenCalledWith(`/results/${mockIds.firstCase}`);
    });
  });

  /**
   * Test suite for verifying security features across different export formats.
   */
  describe("password protection", () => {
    /**
     * Configures authentication and seeds a case for security tests.
     */
    beforeEach(async () => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      await insertTestCase();
    });

    /**
     * Verifies that raw data requests support optional password encryption.
     */
    it("handles raw_data with password protection enabled", async () => {
      // Arrange: Prepare an input payload with password protection enabled.
      const inputWithPassword = {
        ...validRawDataInput,
        passwordProtection: {
          enabled: true,
          password: "securepassword123",
        },
      };

      // Act: Invoke the action with the password payload.
      const result = await requestResultsExport(inputWithPassword);

      // Assert: Verify that the request is accepted.
      expect(result.success).toBe(true);
    });

    /**
     * Verifies that raw data requests can explicitly disable password protection.
     */
    it("handles raw_data with password protection disabled", async () => {
      // Arrange: Prepare an input payload where protection is explicitly set to false.
      const inputWithPasswordDisabled = {
        ...validRawDataInput,
        passwordProtection: {
          enabled: false,
        },
      };

      // Act: Invoke the action.
      const result = await requestResultsExport(inputWithPasswordDisabled);

      // Assert: Verify that the request is accepted.
      expect(result.success).toBe(true);
    });

    /**
     * Verifies that PDF reports support the view-level password security tier.
     */
    it("handles pdf with view_protected security", async () => {
      // Arrange: Prepare a PDF request requiring a password for opening.
      const pdfWithPassword = {
        caseId: mockIds.firstCase,
        format: "pdf" as const,
        pageSize: "a4" as const,
        securityLevel: "view_protected" as const,
        password: "securepassword123",
      };

      // Act: Invoke the action.
      const result = await requestResultsExport(pdfWithPassword);

      // Assert: Verify that the request is accepted.
      expect(result.success).toBe(true);
    });

    /**
     * Verifies that PDF reports support the permissions-level password security tier.
     */
    it("handles pdf with permissions_protected security", async () => {
      // Arrange: Prepare a PDF request requiring a password for permission changes.
      const pdfWithPermissions = {
        caseId: mockIds.firstCase,
        format: "pdf" as const,
        pageSize: "a4" as const,
        securityLevel: "permissions_protected" as const,
        password: "securepassword123",
      };

      // Act: Invoke the action.
      const result = await requestResultsExport(pdfWithPermissions);

      // Assert: Verify that the request is accepted.
      expect(result.success).toBe(true);
    });

    /**
     * Verifies that PDF reports support standard unencrypted generation.
     */
    it("handles pdf with standard security (no password)", async () => {
      // Arrange: Prepare a standard PDF request without password fields.
      const pdfStandard = {
        caseId: mockIds.firstCase,
        format: "pdf" as const,
        pageSize: "a4" as const,
        securityLevel: "standard" as const,
      };

      // Act: Invoke the action.
      const result = await requestResultsExport(pdfStandard);

      // Assert: Verify that the request is accepted.
      expect(result.success).toBe(true);
    });

    /**
     * Verifies that image exports function correctly without password properties.
     */
    it("handles labelled_images without password protection property", async () => {
      // Act: Invoke the action for labelled images.
      const result = await requestResultsExport(validLabelledImagesInput);

      // Assert: Verify that the request is accepted.
      expect(result.success).toBe(true);
    });
  });

  /**
   * Test suite for verifying robust error handling and failure reporting.
   */
  describe("error handling", () => {
    /**
     * Configures authentication for error scenario tests.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that internal database failures are caught and masked with a generic user message.
     */
    it("handles database errors gracefully", async () => {
      // Arrange: Spy on the error logger and database query to force a failure.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db.query.cases, "findFirst").mockRejectedValue(new Error("Database error"));

      // Act: Attempt to request an export during the database outage.
      const result = await requestResultsExport(validRawDataInput);

      // Assert: Verify that a generic error response is returned and the error is logged.
      expect(result).toEqual({
        success: false,
        error: "An unexpected error occurred. Please try again later.",
      });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
