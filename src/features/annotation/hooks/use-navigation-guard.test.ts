import { fireEvent, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useNavigationGuard } from "@/features/annotation/hooks/use-navigation-guard";
import { type Detection } from "@/features/images/hooks/use-results-image-viewer";

/**
 * Utility function to create a mock detection object for testing state comparisons.
 */
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
 * Test suite for the `useNavigationGuard` hook which prevents data loss by monitoring unsaved changes.
 */
describe("useNavigationGuard", () => {
  // Clear all mock histories before each test execution.
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Restore all original implementations after each test to maintain environment purity.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Verify that no unsaved changes are detected when current and original states are equivalent.
   */
  it("returns false for hasUnsavedChanges when arrays are identical", () => {
    // Arrange: Create two identical detection sets.
    const d1 = createDetection("1");
    const d2 = createDetection("2");
    const detections = [d1, d2];
    const originalDetections = [d1, d2];

    // Act: Render the hook with matched data.
    const { result } = renderHook(() => useNavigationGuard({ detections, originalDetections }));

    // Assert: Check that the change flag is negative.
    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  /**
   * Verify that adding a new detection is correctly identified as an unsaved change.
   */
  it("returns true for hasUnsavedChanges when arrays differ by length (addition)", () => {
    // Arrange: Define a current state with more items than the original state.
    const d1 = createDetection("1");
    const d2 = createDetection("2");
    const originalDetections = [d1];
    const detections = [d1, d2];

    // Act: Render the hook with the addition.
    const { result } = renderHook(() => useNavigationGuard({ detections, originalDetections }));

    // Assert: Verify that the change flag is positive.
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  /**
   * Verify that deleting a detection is correctly identified as an unsaved change.
   */
  it("returns true for hasUnsavedChanges when arrays differ by length (deletion)", () => {
    // Arrange: Define a current state with fewer items than the original state.
    const d1 = createDetection("1");
    const d2 = createDetection("2");
    const originalDetections = [d1, d2];
    const detections = [d1];

    // Act: Render the hook with the deletion.
    const { result } = renderHook(() => useNavigationGuard({ detections, originalDetections }));

    // Assert: Verify that the change flag is positive.
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  /**
   * Verify that modifying properties within a detection is identified as an unsaved change.
   */
  it("returns true for hasUnsavedChanges when content differs", () => {
    // Arrange: Create a modified version of the same detection ID.
    const d1 = createDetection("1", { label: "adult" });
    const d1Modified = createDetection("1", { label: "pupa" });

    const originalDetections = [d1];
    const detections = [d1Modified];

    // Act: Render the hook with the modification.
    const { result } = renderHook(() => useNavigationGuard({ detections, originalDetections }));

    // Assert: Verify that the content change triggers the flag.
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  /**
   * Ensure the hook registers a browser event listener to intercept page navigation or closing.
   */
  it("adds beforeunload listener on mount", () => {
    // Arrange: Spy on the global window event registration method.
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    const detections: Detection[] = [];
    const originalDetections: Detection[] = [];

    // Act: Render the hook.
    renderHook(() => useNavigationGuard({ detections, originalDetections }));

    // Assert: Verify that the `beforeunload` event is being watched.
    expect(addEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  /**
   * Ensure that event listeners are cleaned up when the hook is unmounted to prevent memory leaks.
   */
  it("removes beforeunload listener on unmount", () => {
    // Arrange: Spy on the global window event removal method.
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const detections: Detection[] = [];
    const originalDetections: Detection[] = [];

    // Act: Render and then immediately unmount the hook.
    const { unmount } = renderHook(() => useNavigationGuard({ detections, originalDetections }));
    unmount();

    // Assert: Verify that the `beforeunload` listener was removed.
    expect(removeEventListenerSpy).toHaveBeenCalledWith("beforeunload", expect.any(Function));
  });

  /**
   * Verify that the hook blocks the browser from unloading if unsaved changes are present.
   */
  it("prevents unload when unsaved changes exist", () => {
    // Arrange: Setup a state with an unsaved addition.
    const d1 = createDetection("1");
    const detections = [d1];
    const originalDetections: Detection[] = [];

    renderHook(() => useNavigationGuard({ detections, originalDetections }));

    const event = new Event("beforeunload", {
      bubbles: true,
      cancelable: true,
    });

    // Act: Spy on the event prevention and trigger the event.
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    fireEvent(window, event);

    // Assert: Verify that the event was cancelled by the hook logic.
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  /**
   * Verify that the browser is allowed to unload if no unsaved changes are detected.
   */
  it("does not prevent unload when no unsaved changes exist", () => {
    // Arrange: Setup an empty state.
    const detections: Detection[] = [];
    const originalDetections: Detection[] = [];

    renderHook(() => useNavigationGuard({ detections, originalDetections }));

    const event = new Event("beforeunload", {
      bubbles: true,
      cancelable: true,
    });

    // Act: Spy on the event prevention and trigger the event.
    const preventDefaultSpy = vi.spyOn(event, "preventDefault");
    fireEvent(window, event);

    // Assert: Verify that `preventDefault` was not called.
    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });
});
