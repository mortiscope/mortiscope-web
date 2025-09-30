import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { type Detection } from "@/features/annotation/hooks/use-editor-image";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

// Helper function to generate a full detection object with default values for store testing.
const createDetection = (id: string, overrides: Partial<Detection> = {}): Detection => ({
  id,
  label: "adult",
  originalLabel: "adult",
  confidence: 0.9,
  originalConfidence: 0.9,
  xMin: 0,
  yMin: 0,
  xMax: 100,
  yMax: 100,
  status: "model_generated" as const,
  uploadId: "img-1",
  createdById: "user-1",
  lastModifiedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  ...overrides,
});

/**
 * Test suite for the annotation store.
 */
describe("useAnnotationStore", () => {
  // Reset the global store state to defaults before each test to ensure isolation.
  beforeEach(() => {
    act(() => {
      useAnnotationStore.setState({
        selectedDetectionId: null,
        isPanelOpen: false,
        detections: [],
        originalDetections: [],
        past: [],
        future: [],
        drawMode: false,
        selectMode: false,
        transformScale: 1,
        displayFilter: "all",
        isLocked: false,
      });
    });
  });

  /**
   * Test case to verify that the store starts with the correct empty and default values.
   */
  it("initializes with default state", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useAnnotationStore());

    // Assert: Check that default state properties are correctly set.
    expect(result.current.selectedDetectionId).toBeNull();
    expect(result.current.detections).toEqual([]);
    expect(result.current.past).toEqual([]);
    expect(result.current.future).toEqual([]);
    expect(result.current.transformScale).toBe(1);
  });

  /**
   * Test case to verify that setting detections correctly populates the baseline state.
   */
  it("sets detections and initializes history", () => {
    // Arrange: Create test detections.
    const { result } = renderHook(() => useAnnotationStore());
    const detections = [createDetection("1"), createDetection("2")];

    // Act: Load detections into the store.
    act(() => {
      result.current.setDetections(detections);
    });

    // Assert: Verify that current and original arrays are populated without creating history.
    expect(result.current.detections).toHaveLength(2);
    expect(result.current.originalDetections).toHaveLength(2);
    expect(result.current.past).toHaveLength(0);
  });

  /**
   * Test case to verify that selecting a detection updates UI modes and panel visibility.
   */
  it("selects a detection and handles mode switching", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useAnnotationStore());

    // Act: Select a specific detection and enable the side panel.
    act(() => {
      result.current.selectDetection("1", true);
    });

    // Assert: Ensure the selection ID is stored and UI modes are updated to allow selection.
    expect(result.current.selectedDetectionId).toBe("1");
    expect(result.current.isPanelOpen).toBe(true);
    expect(result.current.selectMode).toBe(true);
    expect(result.current.drawMode).toBe(false);
  });

  /**
   * Test case to verify that clearing the selection resets the active ID and related UI flags.
   */
  it("clears selection", () => {
    // Arrange: Set an initial selection.
    const { result } = renderHook(() => useAnnotationStore());

    // Act: Select then immediately clear the selection.
    act(() => {
      result.current.selectDetection("1", true);
      result.current.clearSelection();
    });

    // Assert: Ensure properties are reset to null or false.
    expect(result.current.selectedDetectionId).toBeNull();
    expect(result.current.selectMode).toBe(false);
    expect(result.current.isPanelOpen).toBe(false);
  });

  /**
   * Test case to verify that adding a detection updates the current state and pushes to history.
   */
  it("adds a detection and updates history", () => {
    // Arrange: Render the hook and define a new detection without an ID.
    const { result } = renderHook(() => useAnnotationStore());

    const fullDetection = createDetection("temp-id", {
      label: "pupa",
      xMin: 10,
      yMin: 10,
      xMax: 50,
      yMax: 50,
      confidence: 1,
      status: "user_created",
    });

    const { id, ...newDet } = fullDetection;
    expect(id).toBe("temp-id");

    // Act: Add the new detection to the store.
    act(() => {
      result.current.addDetection(newDet);
    });

    // Assert: Check that detections increased, the action is in `past`, and a selection was made.
    expect(result.current.detections).toHaveLength(1);
    expect(result.current.detections[0].label).toBe("pupa");
    expect(result.current.past).toHaveLength(1);
    expect(result.current.selectedDetectionId).toBeDefined();
  });

  /**
   * Test case to verify that updating a detection stores the previous state in history.
   */
  it("updates a detection and updates history", () => {
    // Arrange: Load an initial detection.
    const { result } = renderHook(() => useAnnotationStore());
    const det = createDetection("1", { label: "adult" });

    act(() => {
      result.current.setDetections([det]);
    });

    // Act: Change the label of the existing detection.
    act(() => {
      result.current.updateDetection("1", { label: "pupa" });
    });

    // Assert: Verify the current label updated and the previous label is in the `past` array.
    expect(result.current.detections[0].label).toBe("pupa");
    expect(result.current.past).toHaveLength(1);
    expect(result.current.past[0][0].label).toBe("adult");
  });

  /**
   * Test case to verify that removing a detection updates state and clears selection if necessary.
   */
  it("removes a detection and updates history", () => {
    // Arrange: Load and select a detection.
    const { result } = renderHook(() => useAnnotationStore());
    const det = createDetection("1");

    act(() => {
      result.current.setDetections([det]);
      result.current.selectDetection("1");
    });

    // Act: Remove the selected detection.
    act(() => {
      result.current.removeDetection("1");
    });

    // Assert: Verify the array is empty and selection is cleared.
    expect(result.current.detections).toHaveLength(0);
    expect(result.current.past).toHaveLength(1);
    expect(result.current.selectedDetectionId).toBeNull();
  });

  /**
   * Test case to verify that undo and redo actions correctly navigate the history stacks.
   */
  it("handles undo and redo correctly", () => {
    // Arrange: Create a state change.
    const { result } = renderHook(() => useAnnotationStore());
    const det = createDetection("1", { label: "adult" });

    act(() => {
      result.current.setDetections([det]);
      result.current.updateDetection("1", { label: "pupa" });
    });

    expect(result.current.detections[0].label).toBe("pupa");
    expect(result.current.canUndo()).toBe(true);

    // Act: Perform undo.
    act(() => {
      result.current.undo();
    });

    // Assert: Verify state returned to original and redo is now available.
    expect(result.current.detections[0].label).toBe("adult");
    expect(result.current.canRedo()).toBe(true);

    // Act: Perform redo.
    act(() => {
      result.current.redo();
    });

    // Assert: Verify state returned to the modified version.
    expect(result.current.detections[0].label).toBe("pupa");
  });

  /**
   * Test case to verify that resetting detections reverts all changes to the original baseline.
   */
  it("resets detections to original state", () => {
    // Arrange: Create several changes including an addition and an update.
    const { result } = renderHook(() => useAnnotationStore());
    const det = createDetection("1", { label: "adult" });

    act(() => {
      result.current.setDetections([det]);
      result.current.updateDetection("1", { label: "pupa" });

      const fullDet = createDetection("temp", { ...det, id: "temp" });
      const { id, ...detToAdd } = fullDet;
      expect(id).toBe("temp");

      result.current.addDetection(detToAdd);
    });

    expect(result.current.detections).toHaveLength(2);

    // Act: Reset the detections.
    act(() => {
      result.current.resetDetections();
    });

    // Assert: Verify state matches the initial `originalDetections` and history is wiped.
    expect(result.current.detections).toHaveLength(1);
    expect(result.current.detections[0].label).toBe("adult");
    expect(result.current.past).toHaveLength(0);
  });

  /**
   * Test case to verify that differences between current and original detections are correctly detected.
   */
  it("detects unsaved changes correctly", () => {
    // Arrange: Load detections.
    const { result } = renderHook(() => useAnnotationStore());
    const det = createDetection("1");

    act(() => {
      result.current.setDetections([det]);
    });

    expect(result.current.hasChanges()).toBe(false);

    // Act: Modify state without creating a history entry.
    act(() => {
      result.current.updateDetectionNoHistory("1", { label: "pupa" });
    });

    // Assert: Ensure `hasChanges` returns true because current deviates from original.
    expect(result.current.hasChanges()).toBe(true);
  });

  /**
   * Test case to verify that committing changes sets a new baseline for the `originalDetections`.
   */
  it("commits changes as the new baseline", () => {
    // Arrange: Create changes.
    const { result } = renderHook(() => useAnnotationStore());
    const det = createDetection("1", { label: "original" });

    act(() => {
      result.current.setDetections([det]);
      result.current.updateDetection("1", { label: "modified" });
    });

    expect(result.current.hasChanges()).toBe(true);

    // Act: Commit the current state.
    act(() => {
      result.current.commitChanges();
    });

    // Assert: Check that `hasChanges` is now false and original state is updated.
    expect(result.current.hasChanges()).toBe(false);
    expect(result.current.originalDetections[0].label).toBe("modified");
    expect(result.current.past).toHaveLength(0);
  });

  /**
   * Test case to verify that the batch verification action updates all detection statuses.
   */
  it("verifies all detections", () => {
    // Arrange: Create detections with unverified statuses.
    const { result } = renderHook(() => useAnnotationStore());
    const det1 = createDetection("1", { status: "model_generated" });
    const det2 = createDetection("2", { status: "user_edited" });

    // Act: Run batch verification.
    act(() => {
      result.current.setDetections([det1, det2]);
      result.current.verifyAllDetections();
    });

    // Assert: Check that all detection statuses were updated to confirmed.
    expect(result.current.detections[0].status).toBe("user_confirmed");
    expect(result.current.detections[1].status).toBe("user_confirmed");
    expect(result.current.past).toHaveLength(1);
  });

  /**
   * Test case to verify that the zoom/transform scale is correctly updated in the store.
   */
  it("manages transform scale", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useAnnotationStore());

    // Act: Update the scale value.
    act(() => {
      result.current.setTransformScale(2.5);
    });

    // Assert: Verify the new scale is stored.
    expect(result.current.transformScale).toBe(2.5);
  });

  /**
   * Test case to verify that the locked state prevents or flags interaction.
   */
  it("manages lock state", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useAnnotationStore());

    // Act: Set the store to locked.
    act(() => {
      result.current.setIsLocked(true);
    });

    // Assert: Verify the flag is set.
    expect(result.current.isLocked).toBe(true);
  });

  /**
   * Test case to verify manual panel visibility control.
   */
  it("opens the panel", () => {
    // Arrange: Ensure panel is initially closed.
    const { result } = renderHook(() => useAnnotationStore());

    expect(result.current.isPanelOpen).toBe(false);

    // Act: Open the panel.
    act(() => {
      result.current.openPanel();
    });

    // Assert: Verify the panel flag is true.
    expect(result.current.isPanelOpen).toBe(true);
  });

  /**
   * Test case to verify that the current state can be manually pushed to the `past` history stack.
   */
  it("saves state before edit", () => {
    // Arrange: Render the hook and load a detection.
    const { result } = renderHook(() => useAnnotationStore());
    const det = createDetection("1");

    act(() => {
      result.current.setDetections([det]);
    });

    expect(result.current.past).toHaveLength(0);

    // Act: Trigger a manual state save.
    act(() => {
      result.current.saveStateBeforeEdit();
    });

    // Assert: Verify the `past` stack contains the current state.
    expect(result.current.past).toHaveLength(1);
    expect(result.current.past[0]).toEqual([det]);
  });

  /**
   * Test case to verify that the drawing mode toggle behaves correctly.
   */
  it("toggles draw mode", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useAnnotationStore());

    expect(result.current.drawMode).toBe(false);

    // Act: Toggle draw mode on and off.
    act(() => {
      result.current.setDrawMode(true);
    });

    expect(result.current.drawMode).toBe(true);

    act(() => {
      result.current.setDrawMode(false);
    });

    // Assert: Verify final state is false.
    expect(result.current.drawMode).toBe(false);
  });

  /**
   * Test case to verify that the selection mode toggle behaves correctly.
   */
  it("toggles select mode", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useAnnotationStore());

    expect(result.current.selectMode).toBe(false);

    // Act: Toggle select mode on and off.
    act(() => {
      result.current.setSelectMode(true);
    });

    expect(result.current.selectMode).toBe(true);

    act(() => {
      result.current.setSelectMode(false);
    });

    // Assert: Verify final state is false.
    expect(result.current.selectMode).toBe(false);
  });

  /**
   * Test case to verify that UI display filters are correctly stored.
   */
  it("sets display filter", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useAnnotationStore());

    expect(result.current.displayFilter).toBe("all");

    // Act: Update filter to verified and unverified.
    act(() => {
      result.current.setDisplayFilter("verified");
    });

    expect(result.current.displayFilter).toBe("verified");

    act(() => {
      result.current.setDisplayFilter("unverified");
    });

    // Assert: Verify final filter state.
    expect(result.current.displayFilter).toBe("unverified");
  });

  /**
   * Test case to ensure updates are isolated to the specific detection ID provided.
   */
  it("updateDetection only updates the target detection", () => {
    // Arrange: Create two detections.
    const { result } = renderHook(() => useAnnotationStore());
    const det1 = createDetection("1", { label: "adult" });
    const det2 = createDetection("2", { label: "adult" });

    // Act: Update only the first detection.
    act(() => {
      result.current.setDetections([det1, det2]);
      result.current.updateDetection("1", { label: "pupa" });
    });

    // Assert: Verify first is updated while the second remains unchanged.
    expect(result.current.detections[0].label).toBe("pupa");
    expect(result.current.detections[1].label).toBe("adult");
  });

  /**
   * Test case to verify that removing a non-selected detection does not close the panel or clear the unrelated selection.
   */
  it("removeDetection preserves selection if removed item is not selected", () => {
    // Arrange: Create two detections and select the second one.
    const { result } = renderHook(() => useAnnotationStore());
    const det1 = createDetection("1");
    const det2 = createDetection("2");

    act(() => {
      result.current.setDetections([det1, det2]);
      result.current.selectDetection("2");
      result.current.removeDetection("1");
    });

    // Assert: Verify that only one detection remains and selection state is preserved.
    expect(result.current.detections).toHaveLength(1);
    expect(result.current.detections[0].id).toBe("2");
    expect(result.current.selectedDetectionId).toBe("2");
    expect(result.current.isPanelOpen).toBe(false);
    expect(result.current.selectMode).toBe(true);
  });

  /**
   * Test case to verify that the undo action handles empty history gracefully without side effects.
   */
  it("undo does nothing if history is empty", () => {
    // Arrange: Render hook with empty history.
    const { result } = renderHook(() => useAnnotationStore());

    expect(result.current.past).toHaveLength(0);
    const initialState = result.current.detections;

    // Act: Attempt to undo.
    act(() => {
      result.current.undo();
    });

    // Assert: Ensure no changes were made to the history or detections.
    expect(result.current.past).toHaveLength(0);
    expect(result.current.detections).toBe(initialState);
  });

  /**
   * Test case to verify that the redo action handles empty future stacks gracefully.
   */
  it("redo does nothing if future is empty", () => {
    // Arrange: Render hook with empty future.
    const { result } = renderHook(() => useAnnotationStore());

    expect(result.current.future).toHaveLength(0);
    const initialState = result.current.detections;

    // Act: Attempt to redo.
    act(() => {
      result.current.redo();
    });

    // Assert: Ensure no changes were made to the future stack or detections.
    expect(result.current.future).toHaveLength(0);
    expect(result.current.detections).toBe(initialState);
  });

  /**
   * Test case to verify that non-history updates isolate changes correctly while still flagging unsaved changes.
   */
  it("updateDetectionNoHistory only updates the target detection", () => {
    // Arrange: Load two detections.
    const { result } = renderHook(() => useAnnotationStore());
    const det1 = createDetection("1", { label: "adult" });
    const det2 = createDetection("2", { label: "adult" });

    // Act: Perform a non-history update on the first detection.
    act(() => {
      result.current.setDetections([det1, det2]);
      result.current.updateDetectionNoHistory("1", { label: "pupa" });
    });

    // Assert: Verify isolation and change tracking.
    expect(result.current.detections[0].label).toBe("pupa");
    expect(result.current.detections[1].label).toBe("adult");
    expect(result.current.hasChanges()).toBe(true);
  });
});
