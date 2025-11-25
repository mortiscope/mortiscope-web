"use server";

import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockIds, mockUsers } from "@/__tests__/mocks/fixtures";
import { resetMockDb } from "@/__tests__/setup/setup";
import { db } from "@/db";
import { analysisResults, cases, detections, uploads, users } from "@/db/schema";
import {
  type DetectionChanges,
  saveDetections,
} from "@/features/annotation/actions/save-detections";

// Mock the authentication module to simulate verified user sessions.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

/**
 * Integration test suite for the `saveDetections` server action.
 */
describe("saveDetections (integration)", () => {
  // Define constant identifiers for testing consistency.
  const mockImageId = mockIds.firstUpload;
  const mockResultsId = mockIds.firstCase;

  // Define a baseline state with no changes for validation tests.
  const emptyChanges: DetectionChanges = {
    added: [],
    modified: [],
    deleted: [],
  };

  /**
   * Cleans the test environment and seeds a primary user before each test execution.
   */
  beforeEach(async () => {
    // Arrange: Reset mock state and clear the in-memory database.
    vi.clearAllMocks();
    resetMockDb();

    // Arrange: Insert the primary test user record into the `users` table.
    await db.insert(users).values({
      id: mockUsers.primaryUser.id,
      email: mockUsers.primaryUser.email,
      name: mockUsers.primaryUser.name,
    });
  });

  /**
   * Test suite for verifying access control and identity validation.
   */
  describe("authentication", () => {
    /**
     * Test case to ensure the action rejects unauthenticated requests.
     */
    it("returns error when user is not authenticated", async () => {
      // Arrange: Force the `auth` function to return a null session.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue(null as never);

      // Act: Attempt to save detections without an active session.
      const result = await saveDetections(mockImageId, mockResultsId, emptyChanges);

      // Assert: Verify the unauthorized error response.
      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });

    /**
     * Test case to ensure the action rejects sessions missing a user object.
     */
    it("returns error when session has no user", async () => {
      // Arrange: Force the `auth` function to return a session with a null user.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({ user: null } as never);

      // Act: Attempt to save detections with an invalid user object.
      const result = await saveDetections(mockImageId, mockResultsId, emptyChanges);

      // Assert: Verify the unauthorized error response.
      expect(result).toEqual({ success: false, error: "Unauthorized" });
    });
  });

  /**
   * Test suite for validating the existence and state of the case record.
   */
  describe("case validation", () => {
    /**
     * Sets up an authenticated session prior to case validation checks.
     */
    beforeEach(async () => {
      // Arrange: Mock a successful authentication for the primary user.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as never);
    });

    /**
     * Test case to verify failure when the target case does not exist.
     */
    it("returns error when case not found", async () => {
      // Act: Attempt to save detections to a non-existent case identifier.
      const result = await saveDetections(mockImageId, mockResultsId, emptyChanges);

      // Assert: Verify the case not found error message.
      expect(result).toEqual({ success: false, error: "Case not found or unauthorized." });
    });

    /**
     * Test case to ensure that draft cases cannot have detections saved.
     */
    it("returns error when case is a draft", async () => {
      // Arrange: Insert a case record with a status set to draft.
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

      // Act: Attempt to save detections for the draft case.
      const result = await saveDetections(mockImageId, mockResultsId, emptyChanges);

      // Assert: Verify the case is treated as unavailable for saving.
      expect(result).toEqual({ success: false, error: "Case not found or unauthorized." });
    });
  });

  /**
   * Test suite for validating the existence of the image record.
   */
  describe("image validation", () => {
    /**
     * Sets up an authenticated session and an active case for image lookup.
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
    });

    /**
     * Test case to verify behavior when the target image is missing from the database.
     */
    it("returns error when image not found", async () => {
      // Act: Attempt to save detections to a non-existent image record.
      const result = await saveDetections(mockImageId, mockResultsId, emptyChanges);

      // Assert: Verify the image not found error response.
      expect(result).toEqual({ success: false, error: "Image not found." });
    });
  });

  /**
   * Test suite for successful save operations involving additions, deletions, and modifications.
   */
  describe("successful save", () => {
    /**
     * Establishes a complete environment with a user, active case, upload, and analysis result.
     */
    beforeEach(async () => {
      // Arrange: Mock a successful authentication session.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as never);

      // Arrange: Seed the database with a valid case, upload, and analysis results record.
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

      await db.insert(uploads).values({
        id: mockImageId,
        userId: mockUsers.primaryUser.id,
        caseId: mockResultsId,
        key: "test-key",
        url: "https://example.com/test-image.jpg",
        name: "test-image.jpg",
        size: 1024,
        type: "image/jpeg",
        createdAt: new Date(),
        width: 100,
        height: 100,
      });

      await db.insert(analysisResults).values({
        caseId: mockResultsId,
        stageUsedForCalculation: null,
      });
    });

    /**
     * Test case to verify that passing empty change sets returns success.
     */
    it("saves with no changes successfully", async () => {
      // Act: Invoke the save action with no modifications.
      const result = await saveDetections(mockImageId, mockResultsId, emptyChanges);

      // Assert: Verify the success status.
      expect(result.success).toBe(true);
    });

    /**
     * Test case to verify that detections are soft-deleted when specified.
     */
    it("handles deletions", async () => {
      // Arrange: Insert an existing detection record into the `detections` table.
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
      ]);

      // Arrange: Prepare a change set containing the detection identifier to delete.
      const changes: DetectionChanges = {
        ...emptyChanges,
        deleted: ["det-1"],
      };

      // Act: Execute the save action with the deletion request.
      const result = await saveDetections(mockImageId, mockResultsId, changes);

      // Assert: Verify success and check that the record has a populated `deletedAt` field.
      expect(result.success).toBe(true);

      const deletedDetection = await db.query.detections.findFirst({
        where: eq(detections.id, "det-1"),
      });
      expect(deletedDetection).toBeDefined();
      expect(deletedDetection?.deletedAt).not.toBeNull();
    });

    /**
     * Test case to verify that new detections are correctly persisted.
     */
    it("handles additions", async () => {
      // Arrange: Prepare a change set containing a new detection object.
      const changes: DetectionChanges = {
        ...emptyChanges,
        added: [
          {
            uploadId: mockImageId,
            label: "adult",
            originalLabel: "adult",
            confidence: 0.95,
            originalConfidence: 0.95,
            xMin: 100,
            yMin: 100,
            xMax: 200,
            yMax: 200,
            status: "user_created",
          },
        ],
      };

      // Act: Execute the save action with the new detection.
      const result = await saveDetections(mockImageId, mockResultsId, changes);

      // Assert: Verify the detection was created with the correct status.
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.detections).toHaveLength(1);
        expect(result.detections[0].label).toBe("adult");
        expect(result.detections[0].status).toBe("user_created");
      }
    });

    /**
     * Test case to verify that existing detections are updated with modified fields.
     */
    it("handles modifications", async () => {
      // Arrange: Insert a detection record to be modified.
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
      ]);

      // Arrange: Prepare a change set with updated labels and coordinates.
      const changes: DetectionChanges = {
        ...emptyChanges,
        modified: [
          {
            id: "det-1",
            label: "instar_1",
            confidence: 0.9,
            xMin: 110,
            yMin: 110,
            xMax: 210,
            yMax: 210,
            status: "user_edited",
          },
        ],
      };

      // Act: Execute the save action with the modification.
      const result = await saveDetections(mockImageId, mockResultsId, changes);

      // Assert: Verify the record in the database reflects the changes.
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.detections).toHaveLength(1);
        expect(result.detections[0].label).toBe("instar_1");
        expect(result.detections[0].status).toBe("user_edited");
      }
    });

    /**
     * Test case to verify that adding a detection triggers a recalculation flag on the case.
     */
    it("triggers recalculation when stage changes", async () => {
      // Arrange: Prepare a change set with a new larval stage detection.
      const changes: DetectionChanges = {
        ...emptyChanges,
        added: [
          {
            uploadId: mockImageId,
            label: "instar_1",
            originalLabel: "instar_1",
            confidence: 0.95,
            originalConfidence: 0.95,
            xMin: 100,
            yMin: 100,
            xMax: 200,
            yMax: 200,
            status: "user_created",
          },
        ],
      };

      // Act: Execute the save action.
      const result = await saveDetections(mockImageId, mockResultsId, changes);
      expect(result.success).toBe(true);

      // Assert: Verify that the `recalculationNeeded` field is set to true for the case.
      const updatedCase = await db.query.cases.findFirst({
        where: eq(cases.id, mockResultsId),
      });
      expect(updatedCase?.recalculationNeeded).toBe(true);
    });

    /**
     * Test case to ensure the logic correctly identifies the oldest stage for recalculation.
     */
    it("finds oldest stage correctly when multiple immature stages exist", async () => {
      // Arrange: Add multiple stages to verify the hierarchy logic.
      const changes: DetectionChanges = {
        ...emptyChanges,
        added: [
          {
            uploadId: mockImageId,
            label: "instar_1",
            originalLabel: "instar_1",
            confidence: 0.9,
            originalConfidence: 0.9,
            xMin: 10,
            yMin: 10,
            xMax: 50,
            yMax: 50,
            status: "user_created",
          },
          {
            uploadId: mockImageId,
            label: "pupa",
            originalLabel: "pupa",
            confidence: 0.95,
            originalConfidence: 0.95,
            xMin: 100,
            yMin: 100,
            xMax: 150,
            yMax: 150,
            status: "user_created",
          },
        ],
      };

      // Act: Execute the save action.
      const result = await saveDetections(mockImageId, mockResultsId, changes);
      expect(result.success).toBe(true);

      // Assert: Confirm that recalculation is triggered based on the stage hierarchy.
      const updatedCase = await db.query.cases.findFirst({
        where: eq(cases.id, mockResultsId),
      });
      expect(updatedCase?.recalculationNeeded).toBe(true);
    });

    /**
     * Test case to verify status updates when a user confirms a detection without moving it.
     */
    it("handles modification with user_confirmed status without coordinate changes", async () => {
      // Arrange: Seed a model-generated detection.
      await db.insert(detections).values([
        {
          id: "det-confirm",
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
      ]);

      // Arrange: Prepare a modification that updates status to confirmed.
      const changes: DetectionChanges = {
        ...emptyChanges,
        modified: [
          {
            id: "det-confirm",
            label: "adult",
            confidence: 0.9,
            xMin: 10,
            yMin: 10,
            xMax: 100,
            yMax: 100,
            status: "user_confirmed",
          },
        ],
      };

      // Act: Execute the save action.
      const result = await saveDetections(mockImageId, mockResultsId, changes);

      // Assert: Verify the status transition to confirmed.
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.detections).toHaveLength(1);
        expect(result.detections[0].status).toBe("user_confirmed");
      }
    });

    /**
     * Test case to verify status remains `user_edited` when data is modified without moving coordinates.
     */
    it("handles modification with user_edited status without coordinate changes", async () => {
      // Arrange: Seed a model-generated detection.
      await db.insert(detections).values([
        {
          id: "det-no-edit",
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
      ]);

      // Arrange: Prepare a modification update status to edited.
      const changes: DetectionChanges = {
        ...emptyChanges,
        modified: [
          {
            id: "det-no-edit",
            label: "adult",
            confidence: 0.9,
            xMin: 10,
            yMin: 10,
            xMax: 100,
            yMax: 100,
            status: "user_edited",
          },
        ],
      };

      // Act: Execute the save action.
      const result = await saveDetections(mockImageId, mockResultsId, changes);

      // Assert: Verify the final status.
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.detections).toHaveLength(1);
        expect(result.detections[0].status).toBe("user_edited");
      }
    });

    /**
     * Test case to verify status transition when both coordinates are changed and confirmation is provided.
     */
    it("handles modification with user_confirmed status AND coordinate changes (user_edited_confirmed)", async () => {
      // Arrange: Seed a model-generated detection.
      await db.insert(detections).values([
        {
          id: "det-edit-confirm",
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
      ]);

      // Arrange: Prepare a modification with new coordinates and confirmed status.
      const changes: DetectionChanges = {
        ...emptyChanges,
        modified: [
          {
            id: "det-edit-confirm",
            label: "adult",
            confidence: 0.9,
            xMin: 20,
            yMin: 20,
            xMax: 110,
            yMax: 110,
            status: "user_confirmed",
          },
        ],
      };

      // Act: Execute the save action.
      const result = await saveDetections(mockImageId, mockResultsId, changes);

      // Assert: Verify the combined status string.
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.detections).toHaveLength(1);
        expect(result.detections[0].status).toBe("user_edited_confirmed");
      }
    });

    /**
     * Test case to verify that labels not found in the known hierarchy fallback to the base level.
     */
    it("handles detection with unknown label (fallback to hierarchy 0)", async () => {
      // Arrange: Prepare a set with an unknown label and a known larval stage.
      const changes: DetectionChanges = {
        ...emptyChanges,
        added: [
          {
            uploadId: mockImageId,
            label: "unknown_stage",
            originalLabel: "unknown_stage",
            confidence: 0.8,
            originalConfidence: 0.8,
            xMin: 50,
            yMin: 50,
            xMax: 100,
            yMax: 100,
            status: "user_created",
          },
          {
            uploadId: mockImageId,
            label: "instar_1",
            originalLabel: "instar_1",
            confidence: 0.9,
            originalConfidence: 0.9,
            xMin: 150,
            yMin: 150,
            xMax: 200,
            yMax: 200,
            status: "user_created",
          },
        ],
      };

      // Act: Execute the save action.
      const result = await saveDetections(mockImageId, mockResultsId, changes);

      // Assert: Verify successful processing and triggered recalculation.
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.detections).toHaveLength(2);
      }

      const updatedCase = await db.query.cases.findFirst({
        where: eq(cases.id, mockResultsId),
      });
      expect(updatedCase?.recalculationNeeded).toBe(true);
    });

    /**
     * Test case to verify the action completes successfully when the case has no associated uploads.
     */
    it("handles case where uploads.findMany returns empty after validation", async () => {
      // Arrange: Mock `uploads.findMany` to return an empty list, simulating a case with no uploads.
      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db.query.uploads, "findMany").mockResolvedValue([]);

      // Act: Execute the save action.
      const result = await saveDetections(mockImageId, mockResultsId, emptyChanges);

      // Assert: Verify the action completes gracefully without errors.
      expect(result.success).toBe(true);
    });
  });

  /**
   * Test suite for verifying robust error handling during database failures.
   */
  describe("error handling", () => {
    /**
     * Sets up an authenticated session for error handling tests.
     */
    beforeEach(async () => {
      // Arrange: Mock a successful authentication session.
      const { auth } = await import("@/auth");
      vi.mocked(auth).mockResolvedValue({
        user: { id: mockUsers.primaryUser.id },
      } as never);
    });

    /**
     * Test case to verify that internal errors return a standardized failure message.
     */
    it("returns error on database failure", async () => {
      // Arrange: Spy on `console.error` and force a database rejection.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const dbModule = await import("@/db");
      vi.spyOn(dbModule.db.query.cases, "findFirst").mockRejectedValue(new Error("Database error"));

      // Act: Attempt to save detections while the database is failing.
      const result = await saveDetections(mockImageId, mockResultsId, emptyChanges);

      // Assert: Verify the error response and console output.
      expect(result).toEqual({ success: false, error: "Failed to save detections." });
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
