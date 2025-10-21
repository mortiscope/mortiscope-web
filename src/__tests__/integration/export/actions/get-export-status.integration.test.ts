"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockIds, mockLocations, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, exports, users } from "@/db/schema";
import { getExportStatus } from "@/features/export/actions/get-export-status";

// Mock the authentication module to simulate user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the AWS S3 client to prevent actual network requests during testing.
vi.mock("@aws-sdk/client-s3", () => ({
  GetObjectCommand: vi.fn(),
}));

// Mock the S3 presigner to provide predictable download URLs for testing.
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://s3.example.com/presigned-download-url"),
}));

// Mock the AWS library internal client.
vi.mock("@/lib/aws", () => ({
  s3: {},
}));

// Mock the application configuration to provide a consistent bucket name.
vi.mock("@/lib/config", () => ({
  config: {
    aws: {
      s3BucketName: "mock-bucket",
    },
  },
}));

type AuthMock = () => Promise<Session | null>;

/**
 * Helper function to seed a test case into the database.
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
 * Helper function to seed an export record with specific status and metadata.
 */
const insertTestExport = async (overrides: {
  id?: string;
  status: "pending" | "processing" | "completed" | "failed";
  s3Key?: string | null;
  failureReason?: string | null;
  userId?: string;
}) => {
  await db.insert(exports).values({
    id: overrides.id ?? mockIds.firstExport,
    caseId: mockIds.firstCase,
    userId: overrides.userId ?? mockUsers.primaryUser.id,
    status: overrides.status,
    format: "raw_data",
    s3Key: overrides.s3Key ?? null,
    failureReason: overrides.failureReason ?? null,
  });
};

/**
 * Integration test suite for the `getExportStatus` action.
 */
describe("getExportStatus (integration)", () => {
  const validInput = {
    exportId: mockIds.firstExport,
  };

  /**
   * Resets database state and populates initial user and case data before each test.
   */
  beforeEach(async () => {
    // Arrange: Clear mock history and reset the database schema.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Create the primary test user in the `users` table.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });

    // Arrange: Create a valid case for the user to reference in exports.
    await insertTestCase();
  });

  /**
   * Test suite for verifying authentication and authorization rules.
   */
  describe("authentication", () => {
    /**
     * Verifies that unauthenticated requests are rejected.
     */
    it("throws error when user is not authenticated", async () => {
      // Arrange: Simulate a null session from the `auth` module.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act & Assert: Verify that calling the action without a session throws an error.
      await expect(getExportStatus(validInput)).rejects.toThrow("Unauthorized");
    });

    /**
     * Verifies that sessions missing a user ID are treated as unauthorized.
     */
    it("throws error when session has no user id", async () => {
      // Arrange: Simulate a session object that lacks a `user.id` property.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act & Assert: Verify that the missing user identity results in an error.
      await expect(getExportStatus(validInput)).rejects.toThrow("Unauthorized");
    });
  });

  /**
   * Test suite for verifying database lookup logic and ownership checks.
   */
  describe("export lookup", () => {
    /**
     * Configures a valid authenticated session before lookup tests.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that the action returns null when the ID does not exist.
     */
    it("returns null when export not found", async () => {
      // Act: Attempt to retrieve an export that has not been inserted.
      const result = await getExportStatus(validInput);

      // Assert: Verify the result is null.
      expect(result).toBeNull();
    });

    /**
     * Verifies that users cannot access exports belonging to others.
     */
    it("returns null when export belongs to a different user", async () => {
      // Arrange: Create a second user and an export associated with that user.
      await db.insert(users).values({
        id: mockIds.secondUser,
        email: mockUsers.secondaryUser.email,
        name: mockUsers.secondaryUser.name,
      });

      await insertTestExport({
        status: "completed",
        s3Key: "exports/other/file.zip",
        userId: mockIds.secondUser,
      });

      // Act: Attempt to retrieve the foreign export as the primary user.
      const result = await getExportStatus(validInput);

      // Assert: Verify that the record is not returned due to the ownership mismatch.
      expect(result).toBeNull();
    });
  });

  /**
   * Test suite for validating the behavior of successfully completed exports.
   */
  describe("completed export", () => {
    /**
     * Configures authentication and S3 mocks for completion scenarios.
     */
    beforeEach(async () => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      vi.mocked(getSignedUrl).mockResolvedValue("https://s3.example.com/presigned-download-url");
    });

    /**
     * Verifies that a signed URL is generated for completed exports.
     */
    it("returns status and download URL for completed export", async () => {
      // Arrange: Seed a completed export record with a valid `s3Key`.
      await insertTestExport({
        status: "completed",
        s3Key: "exports/user/export-file.zip",
      });

      // Act: Retrieve the status for the completed export.
      const result = await getExportStatus(validInput);

      // Assert: Verify the response contains the status and the mocked presigned URL.
      expect(result).toEqual({
        status: "completed",
        url: "https://s3.example.com/presigned-download-url",
      });
    });
  });

  /**
   * Test suite for validating behavior while exports are in progress.
   */
  describe("pending/processing export", () => {
    /**
     * Configures authentication for in-progress status tests.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies the response for exports in the pending state.
     */
    it("returns status for pending export", async () => {
      // Arrange: Seed a record with `pending` status.
      await insertTestExport({
        status: "pending",
      });

      // Act: Retrieve the status.
      const result = await getExportStatus(validInput);

      // Assert: Verify the state is correctly reported with no failure reason.
      expect(result).toEqual({
        status: "pending",
        failureReason: null,
      });
    });

    /**
     * Verifies the response for exports in the processing state.
     */
    it("returns status for processing export", async () => {
      // Arrange: Seed a record with `processing` status.
      await insertTestExport({
        status: "processing",
      });

      // Act: Retrieve the status.
      const result = await getExportStatus(validInput);

      // Assert: Verify the state is correctly reported.
      expect(result).toEqual({
        status: "processing",
        failureReason: null,
      });
    });
  });

  /**
   * Test suite for validating the reporting of export failures.
   */
  describe("failed export", () => {
    /**
     * Configures authentication for failure scenario tests.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that the failure reason is returned to the user.
     */
    it("returns status and failure reason for failed export", async () => {
      // Arrange: Seed a record with `failed` status and a specific reason string.
      await insertTestExport({
        status: "failed",
        failureReason: "Export generation failed due to memory error",
      });

      // Act: Retrieve the status.
      const result = await getExportStatus(validInput);

      // Assert: Verify the response includes the failure details.
      expect(result).toEqual({
        status: "failed",
        failureReason: "Export generation failed due to memory error",
      });
    });
  });

  /**
   * Test suite for validating behavior in unusual or edge conditions.
   */
  describe("edge cases", () => {
    /**
     * Configures authentication for edge case testing.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies that the action handles completed records that lack S3 metadata gracefully.
     */
    it("returns status without URL when completed but missing s3Key", async () => {
      // Arrange: Seed a record marked as `completed` but with a null `s3Key`.
      await insertTestExport({
        status: "completed",
        s3Key: null,
      });

      // Act: Retrieve the status.
      const result = await getExportStatus(validInput);

      // Assert: Verify that the result does not contain a URL and reports no failure.
      expect(result).toEqual({
        status: "completed",
        failureReason: null,
      });
    });
  });
});
