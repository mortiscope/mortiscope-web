import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { requestImageExport } from "@/features/export/actions/request-image-export";
import { inngest } from "@/lib/inngest";
import { logError, logUserAction } from "@/lib/logger";

// Mock Next.js cache function to prevent actual cache operations.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock authentication module to control user session state.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock database client to intercept queries and mutations.
vi.mock("@/db", () => ({
  db: {
    query: {
      uploads: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
  },
}));

// Mock Inngest client to verify event triggering.
vi.mock("@/lib/inngest", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

// Mock logger to verify error and action logging.
vi.mock("@/lib/logger", () => ({
  exportLogger: {},
  logUserAction: vi.fn(),
  logError: vi.fn(),
}));

/**
 * Test suite for the `requestImageExport` server action.
 */
describe("requestImageExport", () => {
  // Define mock data constants for test cases.
  const mockUserId = "user-123";
  const mockCaseId = "case-456";
  const mockUploadId = "tz4a98xxat96iws9zmbrgj3a";
  const mockExportId = "export-new-001";

  // Define a valid payload object for reuse.
  const validPayload = {
    uploadId: mockUploadId,
    format: "labelled_images" as const,
    resolution: "1920x1080" as const,
    passwordProtection: {
      enabled: false,
    },
  };

  // Reset all mocks before each test to ensure isolation.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Test case to verify that an error is returned when the user is not authenticated.
   */
  it("returns error if user is not authenticated", async () => {
    // Arrange: Mock the auth function to return null.
    vi.mocked(auth).mockResolvedValue(null as unknown as Awaited<ReturnType<typeof auth>>);

    // Act: Call the action with a valid payload.
    const result = await requestImageExport(validPayload);

    // Assert: Check for "Unauthorized" error and ensure the DB was not queried.
    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(db.query.uploads.findFirst).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that an error is returned when the input payload is invalid.
   */
  it("returns error if input validation fails (schema check)", async () => {
    // Arrange: Mock an authenticated user.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);

    // Act: Create an invalid payload and call the action.
    const invalidPayload = {
      format: "invalid-format",
    } as unknown as Parameters<typeof requestImageExport>[0];

    const result = await requestImageExport(invalidPayload);

    // Assert: Check for generic input validation error.
    expect(result).toEqual({ success: false, error: "Invalid input provided." });
    expect(db.query.uploads.findFirst).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify error handling when the requested image is not found or owned by the user.
   */
  it("returns error if the image is not found or does not belong to the user", async () => {
    // Arrange: Mock an authenticated user and simulate the database returning undefined for the image.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);
    vi.mocked(db.query.uploads.findFirst).mockResolvedValue(undefined);

    // Act: Call the action with a valid payload.
    const result = await requestImageExport(validPayload);

    // Assert: Check for specific error message and verify no insert operation occurred.
    expect(result).toEqual({ success: false, error: "Image not found or permission denied." });
    expect(db.query.uploads.findFirst).toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify the successful flow: database insert, event trigger, logging, and revalidation.
   */
  it("successfully creates export job, sends event, logs action, and revalidates path", async () => {
    // Arrange: Mock authenticated user, valid image in DB, and successful DB insertion.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);

    vi.mocked(db.query.uploads.findFirst).mockResolvedValue({
      id: mockUploadId,
      caseId: mockCaseId,
    } as unknown as Awaited<ReturnType<typeof db.query.uploads.findFirst>>);

    const mockReturning = vi.fn().mockResolvedValue([{ id: mockExportId }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as unknown as ReturnType<
      typeof db.insert
    >);

    // Act: Call the action with a valid payload.
    const result = await requestImageExport(validPayload);

    // Assert: Verify DB query logic.
    expect(db.query.uploads.findFirst).toHaveBeenCalled();

    // Assert: Verify DB insert was called with correct parameters.
    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({
      caseId: mockCaseId,
      userId: mockUserId,
      format: "labelled_images",
      status: "pending",
      passwordProtected: false,
    });

    // Assert: Verify Inngest event was sent.
    expect(inngest.send).toHaveBeenCalledWith({
      name: "export/image.data.requested",
      data: {
        ...validPayload,
        exportId: mockExportId,
        userId: mockUserId,
      },
    });

    // Assert: Verify user action was logged.
    expect(logUserAction).toHaveBeenCalledWith(
      expect.anything(),
      "image_export_requested",
      mockUserId,
      expect.objectContaining({
        exportId: mockExportId,
        caseId: mockCaseId,
      })
    );

    // Assert: Verify path revalidation and success response.
    expect(revalidatePath).toHaveBeenCalledWith(`/results/${mockCaseId}`);

    expect(result).toEqual({ success: true, data: { exportId: mockExportId } });
  });

  /**
   * Test case to verify that password protection settings are correctly saved to the database.
   */
  it("handles password protection flag correctly", async () => {
    // Arrange: Mock authenticated user and database responses.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);
    vi.mocked(db.query.uploads.findFirst).mockResolvedValue({
      id: mockUploadId,
      caseId: mockCaseId,
    } as unknown as Awaited<ReturnType<typeof db.query.uploads.findFirst>>);

    const mockReturning = vi.fn().mockResolvedValue([{ id: mockExportId }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as unknown as ReturnType<
      typeof db.insert
    >);

    // Act: Create payload with password enabled and call the action.
    const payloadWithPassword = {
      ...validPayload,
      passwordProtection: {
        enabled: true,
        password: "secure-password",
      },
    };

    await requestImageExport(payloadWithPassword);

    // Assert: Verify that the `passwordProtected` flag is true in the DB insert.
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordProtected: true,
      })
    );
  });

  /**
   * Test case to verify that password protection defaults to false if the object is missing.
   */
  it("handles missing passwordProtection object correctly (defaults to false)", async () => {
    // Arrange: Mock authenticated user and database responses.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);
    vi.mocked(db.query.uploads.findFirst).mockResolvedValue({
      id: mockUploadId,
      caseId: mockCaseId,
    } as unknown as Awaited<ReturnType<typeof db.query.uploads.findFirst>>);

    const mockReturning = vi.fn().mockResolvedValue([{ id: mockExportId }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as unknown as ReturnType<
      typeof db.insert
    >);

    // Act: Create payload without passwordProtection and call the action.
    const payloadWithoutProtection = {
      uploadId: mockUploadId,
      format: "labelled_images" as const,
      resolution: "1920x1080" as const,
    };

    await requestImageExport(payloadWithoutProtection);

    // Assert: Verify that the `passwordProtected` flag is false in the DB insert.
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordProtected: false,
      })
    );
  });

  /**
   * Test case to verify that unexpected errors are caught, logged, and returned as a generic error message.
   */
  it("returns generic error and logs exception if an unexpected error occurs", async () => {
    // Arrange: Mock authenticated user but simulate a database failure.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);
    vi.mocked(db.query.uploads.findFirst).mockRejectedValue(new Error("DB connection failed"));

    // Act: Call the action.
    const result = await requestImageExport(validPayload);

    // Assert: Verify that the error was logged and a friendly error message was returned.
    expect(logError).toHaveBeenCalledWith(
      expect.anything(),
      "Failed to initiate image export process",
      expect.any(Error),
      expect.objectContaining({ userId: mockUserId })
    );
    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred. Please try again later.",
    });
  });
});
