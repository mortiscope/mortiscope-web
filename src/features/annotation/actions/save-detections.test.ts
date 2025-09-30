import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { auth } from "@/auth";
import { db } from "@/db";
import { cases, detections } from "@/db/schema";
import { DetectionChanges, saveDetections } from "@/features/annotation/actions/save-detections";

// Mock the authentication module to control user session context.
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

// Mock the database client including its query builders and mutation methods.
vi.mock("@/db", () => ({
  db: {
    query: {
      cases: {
        findFirst: vi.fn(),
      },
      uploads: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
      detections: {
        findMany: vi.fn(),
      },
      analysisResults: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(),
    insert: vi.fn(() => ({
      values: vi.fn(),
    })),
  },
}));

// Mock the stage hierarchy constants used for biological age calculations.
vi.mock("@/lib/constants", () => ({
  STAGE_HIERARCHY: {
    pupa: 4,
    instar_3: 3,
    instar_2: 2,
    instar_1: 1,
    adult: 0,
  },
}));

/**
 * Test suite for the `saveDetections` server action.
 */
describe("saveDetections", () => {
  const mockUserId = "user-1";
  const mockImageId = "image-1";
  const mockResultsId = "case-1";
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  // Default state representing no changes to the detection set.
  const emptyChanges: DetectionChanges = {
    added: [],
    modified: [],
    deleted: [],
  };

  // Prepare a fresh environment for each test case.
  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  // Clean up global spies after each test.
  afterEach(() => {
    consoleSpy.mockRestore();
  });

  /**
   * Test case to ensure unauthorized users cannot perform save operations.
   */
  it("returns unauthorized error if user is not logged in", async () => {
    // Arrange: Simulate a missing session.
    (auth as unknown as Mock).mockResolvedValue(null);

    // Act: Invoke the save action.
    const result = await saveDetections(mockImageId, mockResultsId, emptyChanges);

    // Assert: Check for the specific unauthorized error response.
    expect(result).toEqual({ success: false, error: "Unauthorized" });
  });

  /**
   * Test case to ensure the case must exist and be in a valid state for saves.
   */
  it("returns error if case is not found or is draft", async () => {
    // Arrange: Provide a valid session but return null for the case lookup.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findFirst as unknown as Mock).mockResolvedValue(null);

    // Act: Invoke the save action.
    const result = await saveDetections(mockImageId, mockResultsId, emptyChanges);

    // Assert: Verify the error message for missing or invalid cases.
    expect(result).toEqual({ success: false, error: "Case not found or unauthorized." });
  });

  /**
   * Test case to verify the image must be correctly linked to the provided case ID.
   */
  it("returns error if image is not found in the case", async () => {
    // Arrange: Mock a valid case but simulate a missing upload record.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findFirst as unknown as Mock).mockResolvedValue({
      id: mockResultsId,
      status: "active",
    });
    (db.query.uploads.findFirst as unknown as Mock).mockResolvedValue(null);

    // Act: Invoke the save action.
    const result = await saveDetections(mockImageId, mockResultsId, emptyChanges);

    // Assert: Verify the image-specific error response.
    expect(result).toEqual({ success: false, error: "Image not found." });
  });

  /**
   * Test case to ensure the function completes successfully when no data changes are provided.
   */
  it("handles empty changes successfully", async () => {
    // Arrange: Set up a valid environment with an empty `detections` list.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findFirst as unknown as Mock).mockResolvedValue({
      id: mockResultsId,
      status: "active",
    });
    (db.query.uploads.findFirst as unknown as Mock).mockResolvedValue({ id: mockImageId });
    (db.query.detections.findMany as unknown as Mock).mockResolvedValue([]);
    (db.query.analysisResults.findFirst as unknown as Mock).mockResolvedValue({
      stageUsedForCalculation: null,
    });
    (db.query.uploads.findMany as unknown as Mock).mockResolvedValue([{ id: mockImageId }]);

    // Act: Invoke the save action with no changes.
    const result = await saveDetections(mockImageId, mockResultsId, emptyChanges);

    // Assert: Verify success and ensure no database mutations were triggered.
    expect(result).toEqual({ success: true, detections: [] });
    expect(db.update).not.toHaveBeenCalled();
    expect(db.insert).not.toHaveBeenCalled();
  });

  /**
   * Test case to verify that IDs in the deleted array result in soft-deletes in the database.
   */
  it("processes deletions correctly", async () => {
    // Arrange: Set up mocks and define IDs to be removed.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findFirst as unknown as Mock).mockResolvedValue({
      id: mockResultsId,
      status: "active",
    });
    (db.query.uploads.findFirst as unknown as Mock).mockResolvedValue({ id: mockImageId });

    const changes: DetectionChanges = {
      ...emptyChanges,
      deleted: ["det-1", "det-2"],
    };

    const mockWhere = vi.fn();
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    (db.update as unknown as Mock).mockReturnValue({ set: mockSet });

    (db.query.detections.findMany as unknown as Mock).mockResolvedValue([]);
    (db.query.analysisResults.findFirst as unknown as Mock).mockResolvedValue({});
    (db.query.uploads.findMany as unknown as Mock).mockResolvedValue([]);

    // Act: Invoke the save action with deletions.
    await saveDetections(mockImageId, mockResultsId, changes);

    // Assert: Ensure `db.update` was called with audit fields like `deletedAt` and `lastModifiedById`.
    expect(db.update).toHaveBeenCalledWith(detections);
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        deletedAt: expect.any(Date),
        lastModifiedById: mockUserId,
      })
    );
  });

  /**
   * Test case to verify that new detection objects are correctly inserted into the database.
   */
  it("processes additions correctly", async () => {
    // Arrange: Mock a valid environment and define a new detection object.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findFirst as unknown as Mock).mockResolvedValue({
      id: mockResultsId,
      status: "active",
    });
    (db.query.uploads.findFirst as unknown as Mock).mockResolvedValue({ id: mockImageId });

    const newDetection = {
      uploadId: mockImageId,
      label: "instar_1",
      originalLabel: "instar_1",
      confidence: 0.9,
      originalConfidence: 0.9,
      xMin: 10,
      yMin: 10,
      xMax: 100,
      yMax: 100,
      status: "user_created" as const,
    };

    const changes: DetectionChanges = {
      ...emptyChanges,
      added: [newDetection],
    };

    const mockValues = vi.fn();
    (db.insert as unknown as Mock).mockReturnValue({ values: mockValues });

    (db.query.detections.findMany as unknown as Mock).mockResolvedValue([]);
    (db.query.analysisResults.findFirst as unknown as Mock).mockResolvedValue({});
    (db.query.uploads.findMany as unknown as Mock).mockResolvedValue([]);

    // Act: Invoke the save action with the addition.
    await saveDetections(mockImageId, mockResultsId, changes);

    // Assert: Verify `db.insert` includes the new detection data and the current user's ID.
    expect(db.insert).toHaveBeenCalledWith(detections);
    expect(mockValues).toHaveBeenCalledWith([
      expect.objectContaining({
        ...newDetection,
        createdById: mockUserId,
      }),
    ]);
  });

  /**
   * Test case to verify that editing an existing detection updates its properties and status.
   */
  it("processes modifications correctly - user edit", async () => {
    // Arrange: Define a detection with changed label and coordinates.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findFirst as unknown as Mock).mockResolvedValue({
      id: mockResultsId,
      status: "active",
    });
    (db.query.uploads.findFirst as unknown as Mock).mockResolvedValue({ id: mockImageId });

    const modifiedDetection = {
      id: "det-1",
      label: "instar_2",
      confidence: 0.8,
      xMin: 20,
      yMin: 20,
      xMax: 120,
      yMax: 120,
      status: "user_edited" as const,
    };

    const changes: DetectionChanges = {
      ...emptyChanges,
      modified: [modifiedDetection],
    };

    const originalDetection = {
      id: "det-1",
      label: "instar_1",
      xMin: 10,
      yMin: 10,
      xMax: 100,
      yMax: 100,
    };

    (db.query.detections.findMany as unknown as Mock)
      .mockResolvedValueOnce([originalDetection])
      .mockResolvedValue([]);

    const mockWhere = vi.fn();
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    (db.update as unknown as Mock).mockReturnValue({ set: mockSet });

    (db.query.analysisResults.findFirst as unknown as Mock).mockResolvedValue({});
    (db.query.uploads.findMany as unknown as Mock).mockResolvedValue([]);

    // Act: Invoke the save action with the modification.
    await saveDetections(mockImageId, mockResultsId, changes);

    // Assert: Check that the `label` was updated and the status set to `user_edited`.
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        label: modifiedDetection.label,
        status: "user_edited",
        lastModifiedById: mockUserId,
      })
    );
  });

  /**
   * Test case to verify that the case-level recalculation flag is set if labels change.
   */
  it("detects when recalculation is needed due to stage change", async () => {
    // Arrange: Set up a state where current labels differ from previously calculated labels.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findFirst as unknown as Mock).mockResolvedValue({
      id: mockResultsId,
      status: "active",
    });
    (db.query.uploads.findFirst as unknown as Mock).mockResolvedValue({ id: mockImageId });

    (db.query.detections.findMany as unknown as Mock).mockResolvedValue([]);

    (db.query.analysisResults.findFirst as unknown as Mock).mockResolvedValue({
      stageUsedForCalculation: "instar_1",
    });

    (db.query.uploads.findMany as unknown as Mock).mockResolvedValue([{ id: mockImageId }]);

    (db.query.detections.findMany as unknown as Mock).mockResolvedValue([
      { label: "instar_2" },
      { label: "instar_1" },
    ]);

    const mockWhere = vi.fn();
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    (db.update as unknown as Mock).mockReturnValue({ set: mockSet });

    // Act: Invoke the save action.
    await saveDetections(mockImageId, mockResultsId, emptyChanges);

    // Assert: Verify that `recalculationNeeded` is set to true on the case record.
    expect(db.update).toHaveBeenCalledWith(cases);
    expect(mockSet).toHaveBeenCalledWith({ recalculationNeeded: true });
  });

  /**
   * Test case to verify that the oldest life stage is accurately determined from a list of labels.
   */
  it("identifies oldest stage correctly when not first in list", async () => {
    // Arrange: Provide labels with varying hierarchy levels.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findFirst as unknown as Mock).mockResolvedValue({
      id: mockResultsId,
      status: "active",
    });
    (db.query.uploads.findFirst as unknown as Mock).mockResolvedValue({ id: mockImageId });
    (db.query.detections.findMany as unknown as Mock).mockResolvedValue([]);
    (db.query.analysisResults.findFirst as unknown as Mock).mockResolvedValue({
      stageUsedForCalculation: "instar_1",
    });
    (db.query.uploads.findMany as unknown as Mock).mockResolvedValue([{ id: mockImageId }]);

    (db.query.detections.findMany as unknown as Mock).mockResolvedValue([
      { label: "instar_1" },
      { label: "pupa" },
    ]);

    const mockWhere = vi.fn();
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    (db.update as unknown as Mock).mockReturnValue({ set: mockSet });

    // Act: Invoke the save action.
    await saveDetections(mockImageId, mockResultsId, emptyChanges);

    // Assert: Verify recalculation is triggered because `pupa` is older than `instar_1`.
    expect(db.update).toHaveBeenCalledWith(cases);
    expect(mockSet).toHaveBeenCalledWith({ recalculationNeeded: true });
  });

  /**
   * Test case to verify that manually confirming an existing detection updates its status correctly.
   */
  it("processes modifications correctly - confirmation without edit", async () => {
    // Arrange: Provide a detection where only the `status` changed to `user_confirmed`.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findFirst as unknown as Mock).mockResolvedValue({
      id: mockResultsId,
      status: "active",
    });
    (db.query.uploads.findFirst as unknown as Mock).mockResolvedValue({ id: mockImageId });

    const modifiedDetection = {
      id: "det-1",
      label: "instar_1",
      confidence: 0.9,
      xMin: 10,
      yMin: 10,
      xMax: 100,
      yMax: 100,
      status: "user_confirmed" as const,
    };

    const changes: DetectionChanges = {
      ...emptyChanges,
      modified: [modifiedDetection],
    };

    const originalDetection = {
      id: "det-1",
      label: "instar_1",
      confidence: 0.9,
      xMin: 10,
      yMin: 10,
      xMax: 100,
      yMax: 100,
      status: "user_created",
    };

    (db.query.detections.findMany as unknown as Mock)
      .mockResolvedValueOnce([originalDetection])
      .mockResolvedValue([]);

    const mockWhere = vi.fn();
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    (db.update as unknown as Mock).mockReturnValue({ set: mockSet });

    (db.query.analysisResults.findFirst as unknown as Mock).mockResolvedValue({});
    (db.query.uploads.findMany as unknown as Mock).mockResolvedValue([]);

    // Act: Invoke the save action.
    await saveDetections(mockImageId, mockResultsId, changes);

    // Assert: Check that the status was updated without modifying other data.
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "user_confirmed",
        lastModifiedById: mockUserId,
      })
    );
  });

  /**
   * Test case to ensure robust error handling and proper logging of database failures.
   */
  it("handles errors gracefully", async () => {
    // Arrange: Mock a generic database error during the initial case lookup.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findFirst as unknown as Mock).mockRejectedValue(new Error("DB Error"));

    // Act: Invoke the save action.
    const result = await saveDetections(mockImageId, mockResultsId, emptyChanges);

    // Assert: Verify the user-friendly error response and the internal log call.
    expect(result).toEqual({ success: false, error: "Failed to save detections." });
    expect(consoleSpy).toHaveBeenCalledWith("Error saving detections:", expect.any(Error));
  });

  /**
   * Test case to verify that unrecognized stage labels are handled safely during calculations.
   */
  it("handles unknown stage labels gracefully", async () => {
    // Arrange: Provide a label that does not exist in the defined hierarchy.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findFirst as unknown as Mock).mockResolvedValue({
      id: mockResultsId,
      status: "active",
    });
    (db.query.uploads.findFirst as unknown as Mock).mockResolvedValue({ id: mockImageId });
    (db.query.detections.findMany as unknown as Mock).mockResolvedValue([]);
    (db.query.analysisResults.findFirst as unknown as Mock).mockResolvedValue({
      stageUsedForCalculation: "instar_1",
    });
    (db.query.uploads.findMany as unknown as Mock).mockResolvedValue([{ id: mockImageId }]);

    (db.query.detections.findMany as unknown as Mock).mockResolvedValue([
      { label: "unknown_stage" },
    ]);

    const mockWhere = vi.fn();
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    (db.update as unknown as Mock).mockReturnValue({ set: mockSet });

    // Act: Invoke the save action.
    await saveDetections(mockImageId, mockResultsId, emptyChanges);

    // Assert: Verify recalculation is still triggered as a safety measure.
    expect(db.update).toHaveBeenCalledWith(cases);
    expect(mockSet).toHaveBeenCalledWith({ recalculationNeeded: true });
  });

  /**
   * Test case to verify the complex status update when a detection is both edited and confirmed.
   */
  it("processes modifications correctly - confirmed edit", async () => {
    // Arrange: Define a detection where both coordinates/label and confirmation status changed.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findFirst as unknown as Mock).mockResolvedValue({
      id: mockResultsId,
      status: "active",
    });
    (db.query.uploads.findFirst as unknown as Mock).mockResolvedValue({ id: mockImageId });

    const modifiedDetection = {
      id: "det-1",
      label: "instar_2",
      confidence: 0.9,
      xMin: 10,
      yMin: 10,
      xMax: 100,
      yMax: 100,
      status: "user_confirmed" as const,
    };

    const changes: DetectionChanges = {
      ...emptyChanges,
      modified: [modifiedDetection],
    };

    const originalDetection = {
      id: "det-1",
      label: "instar_1",
      xMin: 10,
      yMin: 10,
      xMax: 100,
      yMax: 100,
    };

    (db.query.detections.findMany as unknown as Mock)
      .mockResolvedValueOnce([originalDetection])
      .mockResolvedValue([]);

    const mockWhere = vi.fn();
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    (db.update as unknown as Mock).mockReturnValue({ set: mockSet });

    (db.query.analysisResults.findFirst as unknown as Mock).mockResolvedValue({});
    (db.query.uploads.findMany as unknown as Mock).mockResolvedValue([]);

    // Act: Invoke the save action.
    await saveDetections(mockImageId, mockResultsId, changes);

    // Assert: Verify the specific `user_edited_confirmed` status is applied.
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "user_edited_confirmed",
        lastModifiedById: mockUserId,
      })
    );
  });

  /**
   * Test case to verify that an edit status is maintained even if no spatial changes occurred.
   */
  it("processes modifications correctly - no-edit with other status", async () => {
    // Arrange: Define a detection with an unchanged label but a manual `user_edited` status.
    (auth as unknown as Mock).mockResolvedValue({ user: { id: mockUserId } });
    (db.query.cases.findFirst as unknown as Mock).mockResolvedValue({
      id: mockResultsId,
      status: "active",
    });
    (db.query.uploads.findFirst as unknown as Mock).mockResolvedValue({ id: mockImageId });

    const modifiedDetection = {
      id: "det-1",
      label: "instar_1",
      confidence: 0.9,
      xMin: 10,
      yMin: 10,
      xMax: 100,
      yMax: 100,
      status: "user_edited" as const,
    };

    const changes: DetectionChanges = {
      ...emptyChanges,
      modified: [modifiedDetection],
    };

    const originalDetection = {
      id: "det-1",
      label: "instar_1",
      xMin: 10,
      yMin: 10,
      xMax: 100,
      yMax: 100,
    };

    (db.query.detections.findMany as unknown as Mock)
      .mockResolvedValueOnce([originalDetection])
      .mockResolvedValue([]);

    const mockWhere = vi.fn();
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    (db.update as unknown as Mock).mockReturnValue({ set: mockSet });

    (db.query.analysisResults.findFirst as unknown as Mock).mockResolvedValue({});
    (db.query.uploads.findMany as unknown as Mock).mockResolvedValue([]);

    // Act: Invoke the save action.
    await saveDetections(mockImageId, mockResultsId, changes);

    // Assert: Ensure the status update is captured in the database.
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "user_edited",
        lastModifiedById: mockUserId,
      })
    );
  });
});
