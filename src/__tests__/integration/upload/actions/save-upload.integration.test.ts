"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { saveUpload } from "@/features/upload/actions/save-upload";

// Mock the authentication module to simulate user identity and session availability.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the logger module to intercept and verify error reporting.
vi.mock("@/lib/logger", () => ({
  uploadLogger: {},
  logError: vi.fn(),
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Integration test suite for the `saveUpload` server action.
 */
describe("saveUpload (integration)", () => {
  // Define a set of valid upload parameters used across multiple test cases.
  const validInput = {
    id: "upload-123",
    key: "uploads/user-123/case-456/test-image.jpg",
    name: "test-image.jpg",
    size: 1024 * 1024,
    type: "image/jpeg",
    width: 1920,
    height: 1080,
    caseId: mockCases.firstCase.id,
  };

  /**
   * Cleans the environment and initializes the test database state before each test.
   */
  beforeEach(async () => {
    // Arrange: Reset mock call history and clear the in-memory database.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Insert a primary user into the `users` table to satisfy foreign key constraints.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Test suite for verifying session-based access control.
   */
  describe("authentication", () => {
    /**
     * Verifies that the action is blocked when no active session is found.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Simulate a null response from the authentication handler.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Attempt to save the upload metadata.
      const result = await saveUpload(validInput);

      // Assert: Verify that the response returns an unauthorized error.
      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });

    /**
     * Verifies that the action is blocked when the session is malformed.
     */
    it("returns error when session has no user id", async () => {
      // Arrange: Simulate a session that lacks a valid user identifier.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Attempt to save the upload metadata.
      const result = await saveUpload(validInput);

      // Assert: Verify that the response returns an unauthorized error.
      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });
  });

  /**
   * Test suite for verifying schema validation and required fields.
   */
  describe("input validation", () => {
    /**
     * Sets up an authenticated session for validation test cases.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that the action rejects metadata missing a case identifier.
     */
    it("returns error for empty caseId", async () => {
      // Act: Provide an empty string for the `caseId` field.
      const result = await saveUpload({ ...validInput, caseId: "" });

      // Assert: Ensure the return value matches the expected validation error message.
      expect(result).toEqual({
        success: false,
        error: "Invalid input provided for saving upload.",
      });
    });

    /**
     * Verifies that the action fails when all required metadata fields are missing.
     */
    it("returns error for missing required fields", async () => {
      // Act: Invoke the action with an object containing empty or zeroed values.
      const result = await saveUpload({
        id: "",
        key: "",
        name: "",
        size: 0,
        type: "",
        width: 0,
        height: 0,
        caseId: "",
      });

      // Assert: Confirm that the success flag is set to false.
      expect(result.success).toBe(false);
    });
  });

  /**
   * Test suite for verifying the successful persistence of upload data.
   */
  describe("successful save", () => {
    /**
     * Configures a valid authenticated user before successful save tests.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that valid metadata is correctly inserted and the URL is returned.
     */
    it("successfully saves upload metadata and returns URL", async () => {
      // Act: Invoke the `saveUpload` action with correct data.
      const result = await saveUpload(validInput);

      // Assert: Confirm success and verify the returned `url` contains the object `key`.
      expect(result.success).toBe(true);
      expect(result.data?.url).toContain(validInput.key);
    });

    /**
     * Verifies that the generated URL follows the expected S3 public access format.
     */
    it("constructs correct S3 URL format", async () => {
      // Act: Perform a successful save operation.
      const result = await saveUpload(validInput);

      // Assert: Ensure the returned URL matches the standard S3 endpoint pattern.
      expect(result.success).toBe(true);
      expect(result.data?.url).toMatch(/^https:\/\/.*\.s3\..*\.amazonaws\.com\//);
    });
  });

  /**
   * Test suite for verifying response integrity during system failures.
   */
  describe("error handling", () => {
    /**
     * Configures a valid authenticated session for error handling tests.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that database-level failures result in a user-friendly error message.
     */
    it("handles database insert errors gracefully", async () => {
      // Arrange: Force the `db.insert` method to throw an error.
      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db, "insert").mockImplementation(() => {
        throw new Error("Database insert failed");
      });

      // Act: Attempt to save the upload.
      const result = await saveUpload(validInput);

      // Assert: Verify the response contains the specific error message for database failures.
      expect(result).toEqual({
        success: false,
        error: "Failed to save upload details to the database.",
      });
    });

    /**
     * Verifies that a database failure triggers a diagnostic log event.
     */
    it("logs error when database insert fails", async () => {
      // Arrange: Mock the logger and simulate a database failure.
      const { logError } = await import("@/lib/logger");
      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db, "insert").mockImplementation(() => {
        throw new Error("Database insert failed");
      });

      // Act: Trigger the failed save operation.
      await saveUpload(validInput);

      // Assert: Confirm that `logError` was called with relevant context including `userId` and `key`.
      expect(logError).toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining("Error saving upload metadata"),
        expect.any(Error),
        expect.objectContaining({
          userId: mockUsers.primaryUser.id,
          uploadId: validInput.id,
          key: validInput.key,
          caseId: validInput.caseId,
        })
      );
    });
  });

  /**
   * Test suite for verifying environmental configuration requirements.
   */
  describe("environment variable validation", () => {
    /**
     * Verifies that the module throws an error if the S3 bucket name is missing.
     */
    it("throws error when AWS_BUCKET_NAME is missing", async () => {
      // Arrange: Temporarily remove the bucket name from environment variables.
      const originalBucketName = process.env.AWS_BUCKET_NAME;
      delete process.env.AWS_BUCKET_NAME;
      vi.resetModules();

      // Act & Assert: Verify that importing the action module causes a configuration throw.
      await expect(async () => {
        await import("@/features/upload/actions/save-upload");
      }).rejects.toThrow("Environment validation failed:");

      // Arrange: Restore the environment variable for subsequent tests.
      process.env.AWS_BUCKET_NAME = originalBucketName;
    });

    /**
     * Verifies that the module throws an error if the S3 bucket region is missing.
     */
    it("throws error when AWS_BUCKET_REGION is missing", async () => {
      // Arrange: Temporarily remove the bucket region from environment variables.
      const originalBucketRegion = process.env.AWS_BUCKET_REGION;
      delete process.env.AWS_BUCKET_REGION;
      vi.resetModules();

      // Act & Assert: Verify that importing the action module causes a configuration throw.
      await expect(async () => {
        await import("@/features/upload/actions/save-upload");
      }).rejects.toThrow("Environment validation failed:");

      // Arrange: Restore the environment variable for subsequent tests.
      process.env.AWS_BUCKET_REGION = originalBucketRegion;
    });
  });
});
