"use server";

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockIds, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { cases, detections, uploads, users } from "@/db/schema";
import { getEditorImage } from "@/features/annotation/actions/get-editor-image";

// Mock the authentication module to control user session states during testing.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

/**
 * Integration test suite for the `getEditorImage` server action.
 */
describe("getEditorImage (integration)", () => {
  // Define shared identifiers for image and case records.
  const mockImageId = mockIds.firstUpload;
  const mockResultsId = mockIds.firstCase;

  /**
   * Cleans the environment and seeds the database with a primary user before each test.
   */
  beforeEach(async () => {
    // Arrange: Reset all mocks and clear the in-memory database.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Seed the `users` table with the primary test user.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Test suite for verifying authentication-related access controls.
   */
  describe("authentication", () => {
    /**
     * Test case to verify that an unauthenticated user cannot access the image.
     */
    it("returns null when user is not authenticated", async () => {
      // Arrange: Mock the `auth` function to return a null session.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null as never);

      // Act: Attempt to fetch the editor image without authentication.
      const result = await getEditorImage(mockImageId, mockResultsId);

      // Assert: Verify that the result is null.
      expect(result).toBeNull();
    });

    /**
     * Test case to verify behavior when the session exists but lacks a user object.
     */
    it("returns null when session has no user", async () => {
      // Arrange: Mock the `auth` function to return a session without a user.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({ user: null } as never);

      // Act: Attempt to fetch the editor image with an invalid session.
      const result = await getEditorImage(mockImageId, mockResultsId);

      // Assert: Verify that the result is null.
      expect(result).toBeNull();
    });

    /**
     * Test case to verify behavior when the session user is missing an ID.
     */
    it("returns null when session user has no id", async () => {
      // Arrange: Mock the `auth` function to return a session with an undefined user ID.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({ user: { id: undefined } } as never);

      // Act: Attempt to fetch the editor image with a missing user identifier.
      const result = await getEditorImage(mockImageId, mockResultsId);

      // Assert: Verify that the result is null.
      expect(result).toBeNull();
    });
  });

  /**
   * Test suite for validating the status and existence of the parent case.
   */
  describe("case validation", () => {
    /**
     * Sets up a valid authentication session for case validation tests.
     */
    beforeEach(async () => {
      // Arrange: Mock a successful authentication session for the primary user.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as never);
    });

    /**
     * Test case to verify behavior when the requested case does not exist in the database.
     */
    it("returns null when case not found", async () => {
      // Act: Attempt to fetch an image for a non-existent `caseId`.
      const result = await getEditorImage(mockImageId, mockResultsId);

      // Assert: Verify that the result is null.
      expect(result).toBeNull();
    });

    /**
     * Test case to ensure that draft cases are excluded from image fetching.
     */
    it("returns null when case is a draft", async () => {
      // Arrange: Insert a record into the `cases` table with a status of draft.
      await db.insert(cases).values({
        id: mockResultsId,
        userId: mockUsers.primaryUser.id,
        caseName: "Test Case",
        status: "draft",
        caseDate: new Date(),
        createdAt: new Date(),
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        temperatureCelsius: 25,
      });

      // Act: Attempt to fetch an image associated with the draft case.
      const result = await getEditorImage(mockImageId, mockResultsId);

      // Assert: Verify that the result is null.
      expect(result).toBeNull();
    });
  });

  /**
   * Test suite for verifying image record retrieval logic.
   */
  describe("image lookup", () => {
    /**
     * Sets up a valid session and an active case for image lookup tests.
     */
    beforeEach(async () => {
      // Arrange: Mock a successful authentication session.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as never);

      // Arrange: Insert an active case record into the `cases` table.
      await db.insert(cases).values({
        id: mockResultsId,
        userId: mockUsers.primaryUser.id,
        caseName: "Test Case",
        status: "active",
        caseDate: new Date(),
        createdAt: new Date(),
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        temperatureCelsius: 25,
      });
    });

    /**
     * Test case to verify behavior when the case exists but the specific image does not.
     */
    it("returns null when image not found", async () => {
      // Act: Attempt to fetch a non-existent image record.
      const result = await getEditorImage(mockImageId, mockResultsId);

      // Assert: Verify that the result is null.
      expect(result).toBeNull();
    });
  });

  /**
   * Test suite for successful data retrieval scenarios.
   */
  describe("successful fetch", () => {
    /**
     * Prepares the database with a user, an active case, and an uploaded image.
     */
    beforeEach(async () => {
      // Arrange: Mock a successful authentication session.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as never);

      // Arrange: Seed an active case record.
      await db.insert(cases).values({
        id: mockResultsId,
        userId: mockUsers.primaryUser.id,
        caseName: "Test Case",
        status: "active",
        caseDate: new Date(),
        createdAt: new Date(),
        locationRegion: "Region",
        locationProvince: "Province",
        locationCity: "City",
        locationBarangay: "Barangay",
        temperatureCelsius: 25,
      });

      // Arrange: Seed an upload record into the `uploads` table.
      await db.insert(uploads).values({
        id: mockImageId,
        userId: mockUsers.primaryUser.id,
        caseId: mockResultsId,
        key: "test-key",
        url: "https://example.com/test-image.jpg",
        name: "test-image.jpg",
        size: 1024,
        type: "image/jpeg",
        width: 100,
        height: 100,
        createdAt: new Date(),
      });
    });

    /**
     * Test case to verify that the returned image data includes only active (non-deleted) detections.
     */
    it("returns image data with active detections only", async () => {
      // Arrange: Insert a mix of active and soft-deleted records into the `detections` table.
      await db.insert(detections).values([
        {
          id: "det-1",
          uploadId: mockImageId,
          label: "adult",
          originalLabel: "adult",
          confidence: 0.9,
          originalConfidence: 0.9,
          xMin: 10,
          yMin: 10,
          xMax: 100,
          yMax: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          status: "model_generated",
          createdById: mockUsers.primaryUser.id,
        },
        {
          id: "det-2",
          uploadId: mockImageId,
          label: "instar_1",
          originalLabel: "instar_1",
          confidence: 0.8,
          originalConfidence: 0.8,
          xMin: 20,
          yMin: 20,
          xMax: 200,
          yMax: 200,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
          status: "model_generated",
          createdById: mockUsers.primaryUser.id,
        },
        {
          id: "det-3",
          uploadId: mockImageId,
          label: "adult",
          originalLabel: "adult",
          confidence: 0.7,
          originalConfidence: 0.7,
          xMin: 30,
          yMin: 30,
          xMax: 300,
          yMax: 300,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: new Date(),
          status: "model_generated",
          createdById: mockUsers.primaryUser.id,
        },
      ]);

      // Act: Fetch the image data including detections.
      const result = await getEditorImage(mockImageId, mockResultsId);

      // Assert: Verify the image is returned and contains only the two active detections.
      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockImageId);
      expect(result?.detections).toHaveLength(2);
      expect(result?.detections.map((d) => d.id).sort()).toEqual(["det-1", "det-2"]);
    });

    /**
     * Test case to ensure that detections with a `deletedAt` timestamp are excluded.
     */
    it("filters out soft-deleted detections", async () => {
      // Arrange: Insert a single soft-deleted detection record.
      await db.insert(detections).values({
        id: "det-deleted",
        uploadId: mockImageId,
        label: "adult",
        originalLabel: "adult",
        confidence: 0.9,
        originalConfidence: 0.9,
        xMin: 10,
        yMin: 10,
        xMax: 100,
        yMax: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
        status: "model_generated",
        createdById: mockUsers.primaryUser.id,
      });

      // Act: Fetch the image data.
      const result = await getEditorImage(mockImageId, mockResultsId);

      // Assert: Verify the image is returned but the `detections` array is empty.
      expect(result).not.toBeNull();
      expect(result?.detections).toHaveLength(0);
    });
  });

  /**
   * Test suite for verifying error handling and logging.
   */
  describe("error handling", () => {
    /**
     * Sets up a valid session for error handling tests.
     */
    beforeEach(async () => {
      // Arrange: Mock a successful authentication session.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as never);
    });

    /**
     * Test case to verify that database exceptions are caught and logged without crashing.
     */
    it("returns null and logs error on database failure", async () => {
      // Arrange: Spy on `console.error` to verify error logging.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Arrange: Force a rejection when the database attempts to find the case.
      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db.query.cases, "findFirst").mockRejectedValue(new Error("Database error"));

      // Act: Attempt to fetch the editor image during a database failure.
      const result = await getEditorImage(mockImageId, mockResultsId);

      // Assert: Verify that the result is null and the error was logged.
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
