import { describe, expect, it } from "vitest";

import { calculateDetectionChanges } from "@/features/annotation/utils/calculate-detection-changes";
import { Detection } from "@/features/images/hooks/use-results-image-viewer";

// Helper function to create a standardized detection object for testing purposes.
const createDetection = (overrides: Partial<Detection> = {}): Detection => ({
  id: "det-1",
  label: "adult",
  originalLabel: "adult",
  confidence: 0.95,
  originalConfidence: 0.95,
  xMin: 10,
  yMin: 10,
  xMax: 100,
  yMax: 100,
  status: "model_generated",
  uploadId: "img-1",
  createdById: "user-1",
  lastModifiedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

/**
 * Test suite for the `calculateDetectionChanges` utility.
 */
describe("calculateDetectionChanges", () => {
  /**
   * Test case to verify that no changes are reported when the input arrays are identical.
   */
  it("returns empty changes when arrays are identical", () => {
    // Arrange: Define two identical sets of detection data.
    const firstDetection = createDetection({ id: "1" });
    const secondDetection = createDetection({ id: "2" });
    const current = [firstDetection, secondDetection];
    const original = [firstDetection, secondDetection];

    // Act: Execute the change calculation logic.
    const result = calculateDetectionChanges(current, original, "img-1");

    // Assert: Verify that the added, modified, and deleted arrays are all empty.
    expect(result.added).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
    expect(result.deleted).toHaveLength(0);
  });

  /**
   * Test case to verify that new detections in the current state are correctly identified as added.
   */
  it("identifies added detections", () => {
    // Arrange: Create an original state and a new detection to be added.
    const original = [createDetection({ id: "1" })];
    const newDetection = createDetection({
      id: "2",
      label: "pupa",
      status: "user_created",
    });
    const current = [...original, newDetection];

    // Act: Execute the change calculation logic.
    const result = calculateDetectionChanges(current, original, "img-1");

    // Assert: Check if the new detection is present in the added list with correct properties.
    expect(result.added).toHaveLength(1);
    expect(result.added[0]).toEqual({
      uploadId: "img-1",
      label: "pupa",
      originalLabel: "pupa",
      confidence: 0.95,
      originalConfidence: 0.95,
      xMin: 10,
      yMin: 10,
      xMax: 100,
      yMax: 100,
      status: "user_created",
    });
    expect(result.modified).toHaveLength(0);
    expect(result.deleted).toHaveLength(0);
  });

  /**
   * Test case to verify that detections removed from the current state are identified as deleted.
   */
  it("identifies deleted detections", () => {
    // Arrange: Create a list containing two detections and a version with one removed.
    const firstDetection = createDetection({ id: "1" });
    const secondDetection = createDetection({ id: "2" });
    const original = [firstDetection, secondDetection];
    const current = [firstDetection];

    // Act: Execute the change calculation logic.
    const result = calculateDetectionChanges(current, original, "img-1");

    // Assert: Confirm the ID of the missing detection is captured in the deleted array.
    expect(result.deleted).toHaveLength(1);
    expect(result.deleted[0]).toBe("2");
    expect(result.added).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
  });

  /**
   * Test case to verify that a change in the label property triggers a modification entry.
   */
  it("identifies modified detections when label changes", () => {
    // Arrange: Define a detection and an updated version with a different `label`.
    const original = [createDetection({ id: "1", label: "adult" })];
    const current = [createDetection({ id: "1", label: "pupa", status: "user_edited" })];

    // Act: Execute the change calculation logic.
    const result = calculateDetectionChanges(current, original, "img-1");

    // Assert: Ensure the modified array contains the detection with the updated `label`.
    expect(result.modified).toHaveLength(1);
    expect(result.modified[0]).toEqual({
      id: "1",
      label: "pupa",
      confidence: 0.95,
      xMin: 10,
      yMin: 10,
      xMax: 100,
      yMax: 100,
      status: "user_edited",
    });
    expect(result.added).toHaveLength(0);
    expect(result.deleted).toHaveLength(0);
  });

  /**
   * Test case to verify that coordinate changes are correctly flagged as modifications.
   */
  it("identifies modified detections when coordinates change", () => {
    // Arrange: Define a detection and a version with an updated `xMin` value.
    const original = [createDetection({ id: "1", xMin: 10 })];
    const current = [createDetection({ id: "1", xMin: 20 })];

    // Act: Execute the change calculation logic.
    const result = calculateDetectionChanges(current, original, "img-1");

    // Assert: Check if the modification is registered for the updated `xMin`.
    expect(result.modified).toHaveLength(1);
    expect(result.modified[0].xMin).toBe(20);
  });

  /**
   * Test case to verify that a status change is captured as a modification.
   */
  it("identifies modified detections when status changes", () => {
    // Arrange: Define a detection and update its `status` from model-generated to user-confirmed.
    const original = [createDetection({ id: "1", status: "model_generated" })];
    const current = [createDetection({ id: "1", status: "user_confirmed" })];

    // Act: Execute the change calculation logic.
    const result = calculateDetectionChanges(current, original, "img-1");

    // Assert: Verify the modification reflects the new `status`.
    expect(result.modified).toHaveLength(1);
    expect(result.modified[0].status).toBe("user_confirmed");
  });

  /**
   * Test case to verify that added, deleted, and modified detections are all handled in a single pass.
   */
  it("handles mixed changes correctly", () => {
    // Arrange: Set up a complex scenario involving multiple types of changes simultaneously.
    const firstDetection = createDetection({ id: "1" });
    const secondDetection = createDetection({ id: "2" });
    const thirdDetection = createDetection({ id: "3", label: "adult" });
    const fourthDetection = createDetection({ id: "4", status: "user_created" });

    const original = [firstDetection, secondDetection, thirdDetection];
    const current = [
      firstDetection,
      { ...thirdDetection, label: "pupa", status: "user_edited" as const },
      fourthDetection,
    ];

    // Act: Execute the change calculation logic.
    const result = calculateDetectionChanges(current, original, "img-1");

    // Assert: Check the integrity of the added, deleted, and modified results.
    expect(result.added).toHaveLength(1);
    expect(result.added[0].label).toBe("adult");

    expect(result.deleted).toHaveLength(1);
    expect(result.deleted[0]).toBe("2");

    expect(result.modified).toHaveLength(1);
    expect(result.modified[0].id).toBe("3");
    expect(result.modified[0].label).toBe("pupa");
  });

  /**
   * Test case to verify that empty input arrays return empty result categories.
   */
  it("handles empty inputs", () => {
    // Arrange: Provide empty arrays for both original and current states.
    const result = calculateDetectionChanges([], [], "img-1");

    // Assert: Ensure no changes are incorrectly reported.
    expect(result.added).toHaveLength(0);
    expect(result.modified).toHaveLength(0);
    expect(result.deleted).toHaveLength(0);
  });
});
