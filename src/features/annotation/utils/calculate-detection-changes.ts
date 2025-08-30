import {
  type DetectionChanges,
  type ModifiedDetection,
  type NewDetection,
} from "@/features/annotation/actions/save-detections";
import { type Detection } from "@/features/images/hooks/use-results-image-viewer";

/**
 * A pure utility function that calculates the changeset between the current state
 * of detections and their original state. It efficiently determines which detections
 * were added, which were modified, and which were deleted, preparing the data structure
 * required by the `saveDetections` server action.
 *
 * @param currentDetections - The array of detections representing the current, possibly edited, state.
 * @param originalDetections - The array of detections representing the last saved state from the server.
 * @param imageId - The unique ID of the image to which these detections belong.
 * @returns An object of type `DetectionChanges` containing three arrays: `added`, `modified`, and `deleted`.
 */
export const calculateDetectionChanges = (
  currentDetections: Detection[],
  originalDetections: Detection[],
  imageId: string
): DetectionChanges => {
  // Convert the arrays into Maps for efficient, O(1) average time complexity lookups by ID.
  const originalMap = new Map(originalDetections.map((d) => [d.id, d]));
  const currentMap = new Map(currentDetections.map((d) => [d.id, d]));

  /**
   * Identifies added detections. A detection is considered added if its ID exists
   * in the `currentMap` but not in the `originalMap`. The result is then mapped
   * to the `NewDetection` format required by the server action.
   */
  const added: NewDetection[] = currentDetections
    .filter((d) => !originalMap.has(d.id))
    .map((d) => ({
      uploadId: imageId,
      label: d.label,
      confidence: d.confidence,
      originalConfidence: d.originalConfidence,
      xMin: d.xMin,
      yMin: d.yMin,
      xMax: d.xMax,
      yMax: d.yMax,
      status: d.status as "user_created" | "user_confirmed" | "user_edited",
    }));

  /**
   * Identifies deleted detections. A detection is considered deleted if its ID exists
   * in the `originalMap` but not in the `currentMap`. The result is an array of IDs.
   */
  const deleted: string[] = originalDetections
    .filter((d) => !currentMap.has(d.id))
    .map((d) => d.id);

  /**
   * Identifies modified detections. A detection is considered modified if its ID exists
   * in both maps, but one or more of its key properties have changed.
   */
  const modified: ModifiedDetection[] = currentDetections
    .filter((d) => {
      const original = originalMap.get(d.id);
      // If the detection doesn't exist in the original map, it's considered added, not modified.
      if (!original) return false;
      // Compare key properties to see if the object has changed.
      return (
        d.label !== original.label ||
        d.confidence !== original.confidence ||
        d.xMin !== original.xMin ||
        d.yMin !== original.yMin ||
        d.xMax !== original.xMax ||
        d.yMax !== original.yMax ||
        d.status !== original.status
      );
    })
    .map((d) => ({
      id: d.id,
      label: d.label,
      confidence: d.confidence,
      xMin: d.xMin,
      yMin: d.yMin,
      xMax: d.xMax,
      yMax: d.yMax,
      status: d.status,
    }));

  // Returns the final changeset object.
  return { added, modified, deleted };
};
