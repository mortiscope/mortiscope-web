"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockIds, mockUploads, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { uploads, users } from "@/db/schema";
import { updateUpload } from "@/features/upload/actions/update-upload";

// Mock the authentication module to simulate user sessions and identity.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the logger module to verify error tracking without producing actual logs.
vi.mock("@/lib/logger", () => ({
  uploadLogger: {},
  logError: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Utility function to populate the database with a test upload record.
 */
const insertTestUpload = async (overrides?: { id?: string; userId?: string }) => {
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
    caseId: null,
  });
};

/**
 * Integration test suite for the `updateUpload` server action.
 */
describe("updateUpload (integration)", () => {
  // Define standard valid input parameters for the update action.
  const validInput = {
    id: mockIds.firstUpload,
    name: "updated-image.jpg",
  };

  /**
   * Sets up the test environment by resetting the database and seeding a primary user.
   */
  beforeEach(async () => {
    // Arrange: Clear mock histories and reset the database to a clean state.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Seed the primary test user in the `users` table.
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
     * Verifies that the action fails when no session is present.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Configure the `auth` mock to return no session.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Attempt to invoke the `updateUpload` action.
      const result = await updateUpload(validInput);

      // Assert: Check that the response returns an unauthorized error.
      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });

    /**
     * Verifies that the action fails if the session object is missing user details.
     */
    it("returns error when session has no user id", async () => {
      // Arrange: Configure the `auth` mock to return a session without a user ID.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Attempt to invoke the `updateUpload` action.
      const result = await updateUpload(validInput);

      // Assert: Check that the response returns an unauthorized error.
      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });
  });

  /**
   * Test suite for validating incoming request payloads.
   */
  describe("input validation", () => {
    /**
     * Ensures an authenticated session is active before testing validation logic.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that malformed identifiers are caught by the validation schema.
     */
    it("returns error for invalid id format", async () => {
      // Act: Pass an improperly formatted string as the `id`.
      const result = await updateUpload({ id: "invalid-id", name: "test" });

      // Assert: Ensure the response contains the expected validation error message.
      expect(result).toEqual({
        success: false,
        error: "Invalid input provided for updating upload.",
      });
    });

    /**
     * Verifies that the action requires at least one field to update.
     */
    it("returns error when no update data provided", async () => {
      // Act: Pass only the `id` without any fields to modify.
      const result = await updateUpload({ id: mockIds.firstUpload });

      // Assert: Ensure the response indicates that no update data was provided.
      expect(result).toEqual({
        success: false,
        error: "No update data provided.",
      });
    });

    /**
     * Verifies that the URL field must conform to standard URL formatting.
     */
    it("returns error for invalid url format", async () => {
      // Act: Pass an invalid string to the `url` field.
      const result = await updateUpload({
        id: mockIds.firstUpload,
        url: "not-a-valid-url",
      });

      // Assert: Ensure the response indicates a validation failure for the input.
      expect(result).toEqual({
        success: false,
        error: "Invalid input provided for updating upload.",
      });
    });
  });

  /**
   * Test suite for verifying resource ownership and access control.
   */
  describe("ownership verification", () => {
    /**
     * Ensures an authenticated session is active before testing ownership logic.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that attempting to update a non-existent record returns a not found error.
     */
    it("returns error when upload not found", async () => {
      // Act: Attempt to update an ID that has not been inserted into the `uploads` table.
      const result = await updateUpload(validInput);

      // Assert: Verify the response returns an upload not found error.
      expect(result).toEqual({
        success: false,
        error: "Upload not found.",
      });
    });

    /**
     * Verifies that users cannot modify uploads belonging to other accounts.
     */
    it("returns forbidden error when upload belongs to another user", async () => {
      // Arrange: Seed a secondary user and an upload record associated with that user.
      await db.insert(users).values({
        id: mockIds.secondUser,
        email: mockUsers.secondaryUser.email,
        name: mockUsers.secondaryUser.name,
      });

      await insertTestUpload({ userId: mockIds.secondUser });

      // Act: Attempt to update the secondary user's upload using the primary user's session.
      const result = await updateUpload(validInput);

      // Assert: Verify the response returns a forbidden ownership error.
      expect(result).toEqual({
        success: false,
        error: "Forbidden: You do not own this upload.",
      });
    });
  });

  /**
   * Test suite for validating successful database update operations.
   */
  describe("successful update", () => {
    /**
     * Configures a valid session and an existing record before each successful test.
     */
    beforeEach(async () => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      await insertTestUpload();
    });

    /**
     * Verifies that the record name can be successfully changed.
     */
    it("successfully updates upload name", async () => {
      // Act: Request an update for the `name` field.
      const result = await updateUpload({
        id: mockIds.firstUpload,
        name: "new-name.jpg",
      });

      // Assert: Verify the action returns a successful status.
      expect(result).toEqual({ success: true });
    });

    /**
     * Verifies that multiple fields can be modified in a single operation.
     */
    it("successfully updates multiple fields", async () => {
      // Act: Request updates for `name`, `size`, and `type` simultaneously.
      const result = await updateUpload({
        id: mockIds.firstUpload,
        name: "new-name.jpg",
        size: 2048,
        type: "image/png",
      });

      // Assert: Verify the action returns a successful status.
      expect(result).toEqual({ success: true });
    });

    /**
     * Verifies that the URL associated with an upload can be successfully changed.
     */
    it("successfully updates url", async () => {
      // Act: Request an update for the `url` field.
      const result = await updateUpload({
        id: mockIds.firstUpload,
        url: "https://example.com/new-image.jpg",
      });

      // Assert: Verify the action returns a successful status.
      expect(result).toEqual({ success: true });
    });
  });

  /**
   * Test suite for verifying robust handling of database and system failures.
   */
  describe("error handling", () => {
    /**
     * Ensures an authenticated session is active before testing error scenarios.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that failures during the initial record retrieval are caught.
     */
    it("handles database query errors gracefully", async () => {
      // Arrange: Force the database query for the upload record to reject.
      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db.query.uploads, "findFirst").mockRejectedValue(
        new Error("Database query failed")
      );

      // Act: Attempt to update the upload.
      const result = await updateUpload(validInput);

      // Assert: Ensure the response contains a localized database error message.
      expect(result).toEqual({
        success: false,
        error: "Failed to update upload details in the database.",
      });
    });

    /**
     * Verifies that failures during the write operation are caught.
     */
    it("handles database update errors gracefully", async () => {
      // Arrange: Insert the target record and force the update command to throw an error.
      await insertTestUpload();

      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db, "update").mockImplementation(() => {
        throw new Error("Database update failed");
      });

      // Act: Attempt to update the upload.
      const result = await updateUpload(validInput);

      // Assert: Ensure the response contains a localized database error message.
      expect(result).toEqual({
        success: false,
        error: "Failed to update upload details in the database.",
      });
    });

    /**
     * Verifies that failed operations trigger the internal logging system.
     */
    it("logs error when database operation fails", async () => {
      // Arrange: Mock the logger and force a database failure.
      const { logError } = await import("@/lib/logger");
      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db.query.uploads, "findFirst").mockRejectedValue(
        new Error("Database error")
      );

      // Act: Attempt to update the upload.
      await updateUpload(validInput);

      // Assert: Check that `logError` was called with the correct context and error details.
      expect(logError).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining("Error updating upload metadata"),
        expect.any(Error),
        expect.objectContaining({
          userId: mockUsers.primaryUser.id,
          uploadId: mockIds.firstUpload,
        })
      );
    });
  });
});
