import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { useBoundingBox } from "@/features/annotation/hooks/use-bounding-box";
import { Detection } from "@/features/annotation/hooks/use-editor-image";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

// Mock the annotation store to intercept state management calls and provide controlled test data.
vi.mock("@/features/annotation/store/annotation-store", () => ({
  useAnnotationStore: vi.fn(),
}));

type ExtractState<T> = T extends (selector: (state: infer S) => unknown) => unknown ? S : never;
type AnnotationState = ExtractState<typeof useAnnotationStore>;

// Mock coordinate utilities to ensure consistent mapping between mouse events and coordinate values.
vi.mock("@/features/annotation/utils/event-coordinates", () => ({
  eventCoordinates: vi.fn((e) => ({
    clientX: (e as MouseEvent).clientX,
    clientY: (e as MouseEvent).clientY,
  })),
}));

/**
 * Helper function to create a standardized detection object for testing.
 */
const createDetection = (id: string, overrides: Partial<Detection> = {}): Detection => ({
  id,
  label: "adult",
  originalLabel: "adult",
  confidence: 0.9,
  originalConfidence: 0.9,
  xMin: 100,
  yMin: 100,
  xMax: 200,
  yMax: 200,
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
 * Test suite for the `useBoundingBox` hook, covering interaction logic for annotations.
 */
describe("useBoundingBox", () => {
  const mockUpdateDetectionNoHistory = vi.fn();
  const mockSaveStateBeforeEdit = vi.fn();
  const mockSelectDetection = vi.fn();
  const mockOpenPanel = vi.fn();

  const mockDetections = [createDetection("det-1")];
  const mockImageDimensions = { width: 1000, height: 1000 };
  const mockRenderedImageStyle = { width: 500, height: 500, top: 0, left: 0 };

  const defaultProps = {
    detections: mockDetections,
    imageDimensions: mockImageDimensions,
    renderedImageStyle: mockRenderedImageStyle,
  };

  // Reset all mock functions and provide a default store implementation before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    (useAnnotationStore as unknown as Mock).mockImplementation(
      (selector: (state: AnnotationState) => unknown) => {
        const state = {
          selectedDetectionId: "det-1",
          selectDetection: mockSelectDetection,
          openPanel: mockOpenPanel,
          updateDetectionNoHistory: mockUpdateDetectionNoHistory,
          saveStateBeforeEdit: mockSaveStateBeforeEdit,
          transformScale: 1,
          isLocked: false,
        } as unknown as AnnotationState;
        return selector(state);
      }
    );
  });

  /**
   * Helper to trigger global mouse events required for drag and resize interactions.
   */
  const dispatchMouseEvent = (type: string, clientX: number, clientY: number) => {
    const event = new MouseEvent(type, { clientX, clientY, bubbles: true });
    window.dispatchEvent(event);
  };

  /**
   * Verify that the hook starts with correct initial internal states.
   */
  it("initializes with default state", () => {
    // Arrange: Render the hook with default properties.
    const { result } = renderHook(() => useBoundingBox(defaultProps));

    // Assert: Verify initial interaction flags and selection state.
    expect(result.current.isDragging).toBe(false);
    expect(result.current.isResizing).toBe(false);
    expect(result.current.selectedDetectionId).toBe("det-1");
  });

  /**
   * Group of tests covering the logic for moving bounding boxes across the image.
   */
  describe("Dragging Logic", () => {
    /**
     * Verify that a drag operation initializes correctly and triggers history saving.
     */
    it("starts drag operation correctly", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useBoundingBox(defaultProps));

      // Act: Trigger the start of a drag interaction.
      act(() => {
        result.current.startDrag("det-1", 50, 50);
      });

      // Assert: Ensure the state is saved for undo/redo and the dragging flag is active.
      expect(mockSaveStateBeforeEdit).toHaveBeenCalled();
      expect(result.current.isDragging).toBe(true);
    });

    /**
     * Ensure the hook ignores drag attempts on IDs that do not exist in the collection.
     */
    it("does nothing if dragging a non-existent detection", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useBoundingBox(defaultProps));

      // Act: Attempt to drag an invalid ID and simulate movement.
      act(() => {
        result.current.startDrag("non-existent", 50, 50);
      });

      act(() => {
        dispatchMouseEvent("mousemove", 100, 100);
      });

      // Assert: Verify that no update calls were triggered.
      expect(mockUpdateDetectionNoHistory).not.toHaveBeenCalled();
    });

    /**
     * Verify that mouse movement updates the coordinate properties of the detection.
     */
    it("updates detection position on mouse move", () => {
      // Arrange: Render the hook and start a drag.
      const { result } = renderHook(() => useBoundingBox(defaultProps));

      act(() => {
        result.current.startDrag("det-1", 100, 100);
      });

      // Act: Move the mouse by a specific delta.
      act(() => {
        dispatchMouseEvent("mousemove", 150, 150);
      });

      // Assert: Check if the coordinates are updated according to the movement delta.
      expect(mockUpdateDetectionNoHistory).toHaveBeenCalledWith(
        "det-1",
        expect.objectContaining({
          xMin: 200,
          yMin: 200,
          xMax: 300,
          yMax: 300,
        })
      );
    });

    /**
     * Ensure detections cannot be dragged beyond the top or left edges of the image.
     */
    it("constrains drag to image boundaries (top-left)", () => {
      // Arrange: Start a drag.
      const { result } = renderHook(() => useBoundingBox(defaultProps));

      act(() => {
        result.current.startDrag("det-1", 100, 100);
      });

      // Act: Move the mouse far beyond the negative boundaries.
      act(() => {
        dispatchMouseEvent("mousemove", -1000, -1000);
      });

      // Assert: Verify coordinates are clamped to the `0` boundary.
      expect(mockUpdateDetectionNoHistory).toHaveBeenCalledWith(
        "det-1",
        expect.objectContaining({
          xMin: 0,
          yMin: 0,
          xMax: 100,
          yMax: 100,
        })
      );
    });

    /**
     * Ensure detections cannot be dragged beyond the bottom or right edges of the image.
     */
    it("constrains drag to image boundaries (bottom-right)", () => {
      // Arrange: Start a drag.
      const { result } = renderHook(() => useBoundingBox(defaultProps));

      act(() => {
        result.current.startDrag("det-1", 100, 100);
      });

      // Act: Move the mouse far beyond the positive boundaries.
      act(() => {
        dispatchMouseEvent("mousemove", 2000, 2000);
      });

      // Assert: Verify coordinates are clamped to the image dimensions.
      expect(mockUpdateDetectionNoHistory).toHaveBeenCalledWith(
        "det-1",
        expect.objectContaining({
          xMax: 1000,
          yMax: 1000,
          xMin: 900,
          yMin: 900,
        })
      );
    });

    /**
     * Verify that releasing the mouse ends the drag and briefly displays a tooltip.
     */
    it("ends drag operation and shows tooltip", () => {
      // Arrange: Use fake timers to test the temporary tooltip behavior.
      vi.useFakeTimers();
      const { result } = renderHook(() => useBoundingBox(defaultProps));

      act(() => {
        result.current.startDrag("det-1", 100, 100);
      });

      // Act: Release the mouse button.
      act(() => {
        dispatchMouseEvent("mouseup", 100, 100);
      });

      // Assert: Verify drag ended and tooltip is active, then expires after time.
      expect(result.current.isDragging).toBe(false);
      expect(result.current.showTooltipFor).toBe("det-1");

      act(() => {
        vi.runAllTimers();
      });

      expect(result.current.showTooltipFor).toBeNull();
      vi.useRealTimers();
    });
  });

  /**
   * Group of tests covering the logic for changing the size of bounding boxes via handles.
   */
  describe("Resizing Logic", () => {
    /**
     * Verify that a resize operation initializes correctly.
     */
    it("starts resize operation correctly", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useBoundingBox(defaultProps));

      // Act: Trigger the start of a resize interaction on the top-left handle.
      act(() => {
        result.current.startResize("tl", 100, 100, mockDetections[0]);
      });

      // Assert: Ensure state is saved and resizing flag is active.
      expect(mockSaveStateBeforeEdit).toHaveBeenCalled();
      expect(result.current.isResizing).toBe(true);
    });

    /**
     * Verify that dragging the top-left handle updates only the minimum coordinates.
     */
    it("resizes from top-left handle", () => {
      // Arrange: Render hook and start resize.
      const { result } = renderHook(() => useBoundingBox(defaultProps));

      act(() => {
        result.current.startResize("tl", 100, 100, mockDetections[0]);
      });

      // Act: Move mouse to shrink the box from the top-left.
      act(() => {
        dispatchMouseEvent("mousemove", 110, 110);
      });

      // Assert: Verify that `xMin` and `yMin` increased while maximums remained static.
      expect(mockUpdateDetectionNoHistory).toHaveBeenCalledWith(
        "det-1",
        expect.objectContaining({
          xMin: 120,
          yMin: 120,
          xMax: 200,
          yMax: 200,
        })
      );
    });

    /**
     * Verify that dragging the bottom-right handle updates only the maximum coordinates.
     */
    it("resizes from bottom-right handle", () => {
      // Arrange: Start resize from bottom-right.
      const { result } = renderHook(() => useBoundingBox(defaultProps));

      act(() => {
        result.current.startResize("br", 100, 100, mockDetections[0]);
      });

      // Act: Move mouse to expand the box.
      act(() => {
        dispatchMouseEvent("mousemove", 110, 110);
      });

      // Assert: Verify that `xMax` and `yMax` increased while minimums remained static.
      expect(mockUpdateDetectionNoHistory).toHaveBeenCalledWith(
        "det-1",
        expect.objectContaining({
          xMin: 100,
          yMin: 100,
          xMax: 220,
          yMax: 220,
        })
      );
    });

    /**
     * Ensure the hook prevents boxes from being resized smaller than a minimum width.
     */
    it("prevents resizing below minimum size (20px)", () => {
      // Arrange: Start resize.
      const { result } = renderHook(() => useBoundingBox(defaultProps));

      act(() => {
        result.current.startResize("br", 100, 100, mockDetections[0]);
      });

      // Act: Attempt to move the mouse to a position that would result in a width less than 20px.
      act(() => {
        dispatchMouseEvent("mousemove", 0, 0);
      });

      // Assert: Verify that no update was called due to size constraints.
      expect(mockUpdateDetectionNoHistory).not.toHaveBeenCalled();
    });

    /**
     * Ensure the hook prevents boxes from being resized smaller than a minimum height.
     */
    it("prevents resizing below minimum height (20px)", () => {
      // Arrange: Start resize from the bottom edge.
      const { result } = renderHook(() => useBoundingBox(defaultProps));

      act(() => {
        result.current.startResize("b", 100, 200, mockDetections[0]);
      });

      // Act: Attempt to move the mouse upwards to shrink the height excessively.
      act(() => {
        dispatchMouseEvent("mousemove", 100, 100);
      });

      // Assert: Verify that the update was blocked by height constraints.
      expect(mockUpdateDetectionNoHistory).not.toHaveBeenCalled();
    });

    /**
     * Verify that finishing a resize operation resets flags and handles tooltips correctly.
     */
    it("ends resize operation and shows tooltip", () => {
      // Arrange: Use fake timers.
      vi.useFakeTimers();
      const { result } = renderHook(() => useBoundingBox(defaultProps));

      act(() => {
        result.current.startResize("br", 100, 100, mockDetections[0]);
      });

      // Act: Finish the interaction.
      act(() => {
        dispatchMouseEvent("mouseup", 100, 100);
      });

      // Assert: Verify state transitions.
      expect(result.current.isResizing).toBe(false);
      expect(result.current.showTooltipFor).toBe("det-1");

      act(() => {
        vi.runAllTimers();
      });

      expect(result.current.showTooltipFor).toBeNull();
      vi.useRealTimers();
    });
  });

  /**
   * Group of tests covering the attachment and cleanup of window-level events.
   */
  describe("Event Listeners", () => {
    /**
     * Verify that listeners are added when interactions start and removed on cleanup or completion.
     */
    it("adds and removes window event listeners", () => {
      // Arrange: Spy on the window event registration methods.
      const addSpy = vi.spyOn(window, "addEventListener");
      const removeSpy = vi.spyOn(window, "removeEventListener");

      const { result, unmount } = renderHook(() => useBoundingBox(defaultProps));

      // Act: Start a drag to trigger listener attachment.
      act(() => {
        result.current.startDrag("det-1", 0, 0);
      });

      // Assert: Check that move and up listeners were registered globally.
      expect(addSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
      expect(addSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));

      // Act: End the drag and unmount the hook.
      act(() => {
        dispatchMouseEvent("mouseup", 0, 0);
      });

      unmount();

      // Assert: Verify that cleanup was performed to prevent memory leaks.
      expect(removeSpy).toHaveBeenCalledWith("mousemove", expect.any(Function));
      expect(removeSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));
    });
  });
});
