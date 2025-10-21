"use server";

import { type Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockCases, mockIds, mockLocations, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { auth } from "@/auth";
import { db } from "@/db";
import { cases, exports, users } from "@/db/schema";
import { getRecentExports } from "@/features/export/actions/get-recent-exports";

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
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  s3Key?: string | null;
  failureReason?: string | null;
  userId?: string;
  createdAt?: Date;
}) => {
  await db.insert(exports).values({
    id: overrides.id,
    caseId: mockIds.firstCase,
    userId: overrides.userId ?? mockUsers.primaryUser.id,
    status: overrides.status,
    format: "raw_data",
    s3Key: overrides.s3Key ?? null,
    failureReason: overrides.failureReason ?? null,
    createdAt: overrides.createdAt ?? new Date(),
  });
};

/**
 * Integration test suite for the `getRecentExports` action.
 */
describe("getRecentExports (integration)", () => {
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
     * Verifies that unauthenticated requests return an empty list.
     */
    it("returns empty array when user is not authenticated", async () => {
      // Arrange: Simulate a null session from the `auth` module.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue(null);

      // Act: Invoke the action to retrieve recent exports.
      const result = await getRecentExports();

      // Assert: Verify that the result is an empty array for unauthenticated users.
      expect(result).toEqual([]);
    });

    /**
     * Verifies that sessions missing a user ID result in an empty list.
     */
    it("returns empty array when session has no user id", async () => {
      // Arrange: Simulate a session object that lacks a `user.id` property.
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: {},
      } as Session);

      // Act: Invoke the action to retrieve recent exports.
      const result = await getRecentExports();

      // Assert: Verify that the missing user identity results in an empty array.
      expect(result).toEqual([]);
    });
  });

  /**
   * Test suite for verifying database lookup logic and filtering.
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
     * Verifies that an empty array is returned when no exports exist for the user.
     */
    it("returns empty array when no recent exports exist", async () => {
      // Act: Retrieve exports when the `exports` table is empty for the user.
      const result = await getRecentExports();

      // Assert: Verify the result is an empty array.
      expect(result).toEqual([]);
    });

    /**
     * Verifies that the action filters out records belonging to other users.
     */
    it("does not return exports belonging to a different user", async () => {
      // Arrange: Create a second user and an export associated with that user.
      await db.insert(users).values({
        id: mockIds.secondUser,
        email: mockUsers.secondaryUser.email,
        name: mockUsers.secondaryUser.name,
      });

      await insertTestExport({
        id: mockIds.firstExport,
        status: "completed",
        s3Key: "exports/other/file.zip",
        userId: mockIds.secondUser,
      });

      // Act: Attempt to retrieve recent exports as the primary user.
      const result = await getRecentExports();

      // Assert: Verify that the foreign record is not included in the results.
      expect(result).toEqual([]);
    });

    /**
     * Verifies that exports with a failed status are excluded from the recent list.
     */
    it("does not return failed exports", async () => {
      // Arrange: Seed an export record with `failed` status.
      await insertTestExport({
        id: mockIds.firstExport,
        status: "failed",
        failureReason: "Some error occurred",
      });

      // Act: Retrieve recent exports.
      const result = await getRecentExports();

      // Assert: Verify that the failed export is filtered out.
      expect(result).toEqual([]);
    });
  });

  /**
   * Test suite for validating the behavior of successfully completed exports.
   */
  describe("completed exports", () => {
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
     * Verifies that completed exports include a generated download URL.
     */
    it("returns download URL for completed export with s3Key", async () => {
      // Arrange: Seed a completed export record with a valid `s3Key`.
      await insertTestExport({
        id: mockIds.firstExport,
        status: "completed",
        s3Key: "exports/user/export-file.zip",
      });

      // Act: Retrieve the recent exports.
      const result = await getRecentExports();

      // Assert: Verify the response contains the ID, status, and the mocked presigned URL.
      expect(result).toEqual([
        {
          id: mockIds.firstExport,
          status: "completed",
          url: "https://s3.example.com/presigned-download-url",
        },
      ]);
    });
  });

  /**
   * Test suite for validating behavior while exports are in progress.
   */
  describe("pending/processing exports", () => {
    /**
     * Configures authentication for in-progress status tests.
     */
    beforeEach(() => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);
    });

    /**
     * Verifies the reporting of exports in the pending state.
     */
    it("returns status for pending export", async () => {
      // Arrange: Seed a record with `pending` status.
      await insertTestExport({
        id: mockIds.firstExport,
        status: "pending",
      });

      // Act: Retrieve the recent exports.
      const result = await getRecentExports();

      // Assert: Verify the record is returned with the correct status and no failure reason.
      expect(result).toEqual([
        {
          id: mockIds.firstExport,
          status: "pending",
          failureReason: null,
        },
      ]);
    });

    /**
     * Verifies the reporting of exports in the processing state.
     */
    it("returns status for processing export", async () => {
      // Arrange: Seed a record with `processing` status.
      await insertTestExport({
        id: mockIds.secondExport,
        status: "processing",
      });

      // Act: Retrieve the recent exports.
      const result = await getRecentExports();

      // Assert: Verify the record is returned with the processing status.
      expect(result).toEqual([
        {
          id: mockIds.secondExport,
          status: "processing",
          failureReason: null,
        },
      ]);
    });
  });

  /**
   * Test suite for validating the aggregation of multiple export records.
   */
  describe("multiple exports", () => {
    /**
     * Configures authentication and S3 mocks for multi-record tests.
     */
    beforeEach(async () => {
      vi.mocked(auth as unknown as AuthMock).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as Session);

      const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
      vi.mocked(getSignedUrl).mockResolvedValue("https://s3.example.com/presigned-download-url");
    });

    /**
     * Verifies that the action correctly processes a mix of different export statuses.
     */
    it("handles multiple exports with different statuses", async () => {
      // Arrange: Seed multiple records with varying statuses.
      await insertTestExport({
        id: mockIds.firstExport,
        status: "completed",
        s3Key: "exports/file1.zip",
      });

      await insertTestExport({
        id: mockIds.secondExport,
        status: "pending",
      });

      await insertTestExport({
        id: mockIds.thirdExport,
        status: "processing",
      });

      // Act: Retrieve the list of all recent exports.
      const result = await getRecentExports();

      // Assert: Verify that all three non-failed records are returned.
      expect(result).toHaveLength(3);

      // Assert: Confirm each specific record contains its expected data structure.
      const completedExport = result.find((e) => e.id === mockIds.firstExport);
      const pendingExport = result.find((e) => e.id === mockIds.secondExport);
      const processingExport = result.find((e) => e.id === mockIds.thirdExport);

      expect(completedExport).toEqual({
        id: mockIds.firstExport,
        status: "completed",
        url: "https://s3.example.com/presigned-download-url",
      });
      expect(pendingExport).toEqual({
        id: mockIds.secondExport,
        status: "pending",
        failureReason: null,
      });
      expect(processingExport).toEqual({
        id: mockIds.thirdExport,
        status: "processing",
        failureReason: null,
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
     * Verifies that completed records lacking S3 metadata are handled without throwing errors.
     */
    it("returns status without URL when completed but missing s3Key", async () => {
      // Arrange: Seed a record marked as `completed` but with a null `s3Key`.
      await insertTestExport({
        id: mockIds.firstExport,
        status: "completed",
        s3Key: null,
      });

      // Act: Retrieve the recent exports.
      const result = await getRecentExports();

      // Assert: Verify the result reports the status without an associated URL.
      expect(result).toEqual([
        {
          id: mockIds.firstExport,
          status: "completed",
          failureReason: null,
        },
      ]);
    });
  });
});
