"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  mockCases,
  mockIds,
  mockLocations,
  mockUploads,
  mockUsers,
} from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, uploads, users } from "@/db/schema";
import { requestImageExport } from "@/features/export/actions/request-image-export";

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

// Mock the logging utility to verify that user actions and errors are recorded.
vi.mock("@/lib/logger", () => ({
  exportLogger: {},
  logError: vi.fn(),
  logUserAction: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Helper function to seed a test case into the database for referential integrity.
 */
const insertTestCase = async () => {
  await db.insert(cases).values({
    id: mockIds.firstCase,
    userId: mockUsers.primaryUser.id,
    caseName: mockCases.firstCase.caseName,
    temperatureCelsius: mockCases.firstCase.temperatureCelsius,
    ...mockLocations.firstLocation,
    caseDate: new Date("2025-01-15"),
  });
};

/**
 * Helper function to seed an upload record associated with a user and case.
 */
const insertTestUpload = async (overrides?: {
  id?: string;
  caseId?: string | null;
  userId?: string;
}) => {
  await db.insert(uploads).values({
    id: overrides?.id ?? mockIds.firstUpload,
    key: mockUploads.firstUpload.key,
    name: mockUploads.firstUpload.name,
    url: mockUploads.firstUpload.url,
    size: mockUploads.firstUpload.size,
    type: mockUploads.firstUpload.type,
    width: mockUploads.firstUpload.width,
    height: mockUploads.firstUpload.height,
    userId: overrides?.userId ?? mockUsers.primaryUser.id,
    caseId: overrides?.caseId === undefined ? mockIds.firstCase : overrides.caseId,
  });
};

/**
 * Integration test suite for the `requestImageExport` server action.
 */
describe("requestImageExport (integration)", () => {
  const validRawDataInput = {
    uploadId: mockIds.firstUpload,
    format: "raw_data" as const,
  };

  const validLabelledImagesInput = {
    uploadId: mockIds.firstUpload,
    format: "labelled_images" as const,
    resolution: "1920x1080" as const,
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

    // Arrange: Create a case record to associate with images and exports.
    await insertTestCase();
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

      // Act: Attempt to request an image export.
      const result = await requestImageExport(validRawDataInput);

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

      // Act: Attempt to request an image export.
      const result = await requestImageExport(validRawDataInput);

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
    it("returns error for invalid uploadId", async () => {
      // Act: Call the action with a non-standard identifier string.
      const result = await requestImageExport({
        uploadId: "invalid-id",
        format: "raw_data",
      } as never);

      // Assert: Verify that the validation error message is returned.
      expect(result).toEqual({ success: false, error: "Invalid input provided." });
    });
  });

  /**
   * Test suite for verifying data ownership and record existence.
   */
  describe("image lookup", () => {
    /**
     * Configures a valid authenticated session before lookup tests.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies the error response when the requested upload ID does not exist in the database.
     */
    it("returns error when image not found", async () => {
      // Act: Attempt to request an export for a non-existent upload record.
      const result = await requestImageExport(validRawDataInput);

      // Assert: Verify the generic not found or permission denied message.
      expect(result).toEqual({
        success: false,
        error: "Image not found or permission denied.",
      });
    });

    /**
     * Verifies that images not linked to a specific case cannot be exported.
     */
    it("returns error when image has no caseId", async () => {
      // Arrange: Insert an upload record where the `caseId` is set to null.
      await insertTestUpload({ caseId: null });

      // Act: Attempt to request an export for the orphaned upload.
      const result = await requestImageExport(validRawDataInput);

      // Assert: Verify the error response.
      expect(result).toEqual({
        success: false,
        error: "Image not found or permission denied.",
      });
    });

    /**
     * Verifies that the action prevents users from exporting images belonging to others.
     */
    it("returns error when image belongs to different user", async () => {
      // Arrange: Create a second user and an upload record associated with them.
      await db.insert(users).values({
        id: mockIds.secondUser,
        email: mockUsers.secondaryUser.email,
        name: mockUsers.secondaryUser.name,
      });

      await insertTestUpload({ userId: mockIds.secondUser });

      // Act: Attempt to request an export for the foreign upload record.
      const result = await requestImageExport(validRawDataInput);

      // Assert: Verify the security error response.
      expect(result).toEqual({
        success: false,
        error: "Image not found or permission denied.",
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

      await insertTestUpload();
    });

    /**
     * Verifies that a `raw_data` export record is successfully initialized.
     */
    it("creates raw_data export and returns exportId", async () => {
      // Act: Invoke the export request for raw data.
      const result = await requestImageExport(validRawDataInput);

      // Assert: Verify the success status and the presence of a generated export identifier.
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("exportId");
        expect(typeof result.data!.exportId).toBe("string");
      }
    });

    /**
     * Verifies that a `labelled_images` export record supports resolution parameters.
     */
    it("creates labelled_images export with resolution", async () => {
      // Act: Invoke the export request for labelled images with a specific resolution.
      const result = await requestImageExport(validLabelledImagesInput);

      // Assert: Verify that the operation returns a success response and data.
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty("exportId");
        expect(typeof result.data!.exportId).toBe("string");
      }
    });

    /**
     * Verifies that the background worker event is dispatched with expected payload.
     */
    it("sends Inngest event with correct data", async () => {
      // Arrange: Import the mocked Inngest client.
      const { inngest } = await import("@/lib/inngest");

      // Act: Initiate the export request.
      const result = await requestImageExport(validRawDataInput);

      // Assert: Verify that the event name and data payload are correctly constructed.
      expect(result.success).toBe(true);
      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "export/image.data.requested",
          data: expect.objectContaining({
            exportId: expect.any(String),
            userId: mockUsers.primaryUser.id,
            uploadId: mockIds.firstUpload,
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
      await requestImageExport(validRawDataInput);

      // Assert: Verify the specific path for the case results is targeted for revalidation.
      expect(revalidatePath).toHaveBeenCalledWith(`/results/${mockIds.firstCase}`);
    });

    /**
     * Verifies that the audit log utility records the user activity.
     */
    it("logs user action on successful export request", async () => {
      // Arrange: Import the mocked logging utility.
      const { logUserAction } = await import("@/lib/logger");

      // Act: Initiate the export request.
      const result = await requestImageExport(validRawDataInput);

      // Assert: Verify that the action type, user ID, and metadata are passed to the logger.
      expect(result.success).toBe(true);
      expect(logUserAction).toHaveBeenCalledWith(
        expect.anything(),
        "image_export_requested",
        mockUsers.primaryUser.id,
        expect.objectContaining({
          exportId: expect.any(String),
          caseId: mockIds.firstCase,
        })
      );
    });
  });

  /**
   * Test suite for verifying security features like password protection.
   */
  describe("password protection", () => {
    /**
     * Configures authentication and seeds an upload for password tests.
     */
    beforeEach(async () => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      await insertTestUpload();
    });

    /**
     * Verifies that the action processes requests containing password configuration.
     */
    it("handles password protected export request", async () => {
      // Arrange: Prepare an input payload with password protection enabled.
      const inputWithPassword = {
        ...validRawDataInput,
        passwordProtection: {
          enabled: true,
          password: "securepassword123",
        },
      };

      // Act: Invoke the action with the password payload.
      const result = await requestImageExport(inputWithPassword);

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
      // Arrange: Spy on the database query and force it to reject with an error.
      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db.query.uploads, "findFirst").mockRejectedValue(
        new Error("Database error")
      );

      // Act: Attempt to request an export during the database outage.
      const result = await requestImageExport(validRawDataInput);

      // Assert: Verify that a generic error response is returned to the client.
      expect(result).toEqual({
        success: false,
        error: "An unexpected error occurred. Please try again later.",
      });
    });

    /**
     * Verifies that failed operations are reported to the error logging system.
     */
    it("logs error when export fails", async () => {
      // Arrange: Import logging and database modules to setup a failure scenario.
      const { logError } = await import("@/lib/logger");
      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db.query.uploads, "findFirst").mockRejectedValue(
        new Error("Database error")
      );

      // Act: Attempt to request an export.
      await requestImageExport(validRawDataInput);

      // Assert: Verify that `logError` was called with the stack trace and user context.
      expect(logError).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining("Failed to initiate image export"),
        expect.any(Error),
        expect.objectContaining({
          userId: mockUsers.primaryUser.id,
        })
      );
    });
  });
});
