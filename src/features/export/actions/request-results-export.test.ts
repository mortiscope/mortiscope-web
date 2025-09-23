import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { requestResultsExport } from "@/features/export/actions/request-results-export";
import { inngest } from "@/lib/inngest";

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
      cases: {
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

/**
 * Test suite for the `requestResultsExport` server action.
 */
describe("requestResultsExport", () => {
  // Define mock data constants for test cases.
  const mockUserId = "user-123";
  const mockCaseId = "tz4a98xxat96iws9zmbrgj3a";
  const mockExportId = "export-789";

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

    const payload = {
      caseId: mockCaseId,
      format: "raw_data" as const,
    };

    // Act: Call the action with the payload.
    const result = await requestResultsExport(payload);

    // Assert: Check for "Unauthorized" error and ensure the DB was not queried.
    expect(result).toEqual({ success: false, error: "Unauthorized" });
    expect(db.query.cases.findFirst).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that an error is returned when input validation fails.
   */
  it("returns error if input validation fails", async () => {
    // Arrange: Mock an authenticated user.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);

    const payload = {
      caseId: "",
      format: "raw_data" as const,
    };

    // Act: Call the action with an invalid payload (empty caseId).
    const result = await requestResultsExport(payload);

    // Assert: Check that the operation failed and DB was not queried.
    expect(result.success).toBe(false);
    expect(db.query.cases.findFirst).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify error handling when the case is not found or permission is denied.
   */
  it("returns error if case is not found or permission denied", async () => {
    // Arrange: Mock an authenticated user and simulate the database returning undefined.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);
    vi.mocked(db.query.cases.findFirst).mockResolvedValue(undefined);

    const payload = {
      caseId: mockCaseId,
      format: "raw_data" as const,
      passwordProtection: { enabled: false },
    };

    // Act: Call the action with a valid payload.
    const result = await requestResultsExport(payload);

    // Assert: Check for specific error message and verify no insert operation occurred.
    expect(result).toEqual({ success: false, error: "Case not found or permission denied." });
    expect(db.insert).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify successful creation of a raw data export job.
   */
  it("successfully creates raw_data export and sends event", async () => {
    // Arrange: Mock authenticated user, valid case in DB, and successful DB insertion.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);
    vi.mocked(db.query.cases.findFirst).mockResolvedValue({ id: mockCaseId } as unknown as Awaited<
      ReturnType<typeof db.query.cases.findFirst>
    >);

    const mockReturning = vi.fn().mockResolvedValue([{ id: mockExportId }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as unknown as ReturnType<
      typeof db.insert
    >);

    const payload = {
      caseId: mockCaseId,
      format: "raw_data" as const,
      passwordProtection: { enabled: true, password: "secure-password" },
    };

    // Act: Call the action with a valid payload.
    const result = await requestResultsExport(payload);

    // Assert: Verify DB insert was called with correct parameters.
    expect(db.insert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({
      caseId: mockCaseId,
      userId: mockUserId,
      format: "raw_data",
      status: "pending",
      passwordProtected: true,
    });

    // Assert: Verify Inngest event was sent with correct data.
    expect(inngest.send).toHaveBeenCalledWith({
      name: "export/case.data.requested",
      data: expect.objectContaining({
        exportId: mockExportId,
        userId: mockUserId,
        caseId: mockCaseId,
      }),
    });

    // Assert: Verify path revalidation and success response.
    expect(revalidatePath).toHaveBeenCalledWith(`/results/${mockCaseId}`);
    expect(result).toEqual({ success: true, data: { exportId: mockExportId } });
  });

  /**
   * Test case to verify that the password protection flag is set correctly for protected PDF exports.
   */
  it("correctly handles passwordProtected logic for PDF exports with view_protected security", async () => {
    // Arrange: Mock authenticated user and database responses.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);
    vi.mocked(db.query.cases.findFirst).mockResolvedValue({ id: mockCaseId } as unknown as Awaited<
      ReturnType<typeof db.query.cases.findFirst>
    >);

    const mockReturning = vi.fn().mockResolvedValue([{ id: mockExportId }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as unknown as ReturnType<
      typeof db.insert
    >);

    const payload = {
      caseId: mockCaseId,
      format: "pdf" as const,
      pageSize: "a4" as const,
      securityLevel: "view_protected" as const,
      password: "secure-pdf-password",
      includeImages: true,
    };

    // Act: Call the action with a protected PDF payload.
    await requestResultsExport(payload);

    // Assert: Verify that the `passwordProtected` flag is true in the DB insert.
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordProtected: true,
      })
    );
  });

  /**
   * Test case to verify that the password protection flag is false when no password is provided.
   */
  it("correctly sets passwordProtected to false for PDF if no password provided", async () => {
    // Arrange: Mock authenticated user and database responses.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);
    vi.mocked(db.query.cases.findFirst).mockResolvedValue({ id: mockCaseId } as unknown as Awaited<
      ReturnType<typeof db.query.cases.findFirst>
    >);

    const mockReturning = vi.fn().mockResolvedValue([{ id: mockExportId }]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    vi.mocked(db.insert).mockReturnValue({ values: mockValues } as unknown as ReturnType<
      typeof db.insert
    >);

    const payload = {
      caseId: mockCaseId,
      format: "pdf" as const,
      pageSize: "a4" as const,
      securityLevel: "standard" as const,
      includeImages: true,
    };

    // Act: Call the action with a standard PDF payload.
    await requestResultsExport(payload);

    // Assert: Verify that the `passwordProtected` flag is false in the DB insert.
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordProtected: false,
      })
    );
  });

  /**
   * Test case to verify that generic errors are returned for unexpected exceptions.
   */
  it("returns generic error on unexpected exception", async () => {
    // Arrange: Mock authenticated user but simulate a database failure.
    vi.mocked(auth).mockResolvedValue({ user: { id: mockUserId } } as unknown as Awaited<
      ReturnType<typeof auth>
    >);
    vi.mocked(db.query.cases.findFirst).mockRejectedValue(new Error("DB Error"));

    const payload = {
      caseId: mockCaseId,
      format: "raw_data" as const,
    };

    // Act: Call the action.
    const result = await requestResultsExport(payload);

    // Assert: Verify that a generic error message is returned.
    expect(result).toEqual({
      success: false,
      error: "An unexpected error occurred. Please try again later.",
    });
  });
});
