import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { useImageDrawing } from "@/features/annotation/hooks/use-image-drawing";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

// Mock the annotation store to intercept detection creation and state management.
vi.mock("@/features/annotation/store/annotation-store", () => ({
  useAnnotationStore: vi.fn(),
}));

/**
 * Test suite for the `useImageDrawing` hook which handles manual bounding box creation on the canvas.
 */
describe("useImageDrawing", () => {
  const mockAddDetection = vi.fn();
  const mockImageId = "img-1";

  const defaultProps = {
    imageId: mockImageId,
    drawMode: true,
    transformScale: 1,
    imageDimensions: { width: 1000, height: 1000 },
    renderedImageStyle: { width: 1000, height: 1000, top: 0, left: 0 },
  };

  // Reset all mock functions and provide a default store implementation before each test execution.
  beforeEach(() => {
    vi.clearAllMocks();

    (useAnnotationStore as unknown as Mock).mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const state = {
          addDetection: mockAddDetection,
        };
        return selector(state);
      }
    );
  });

  /**
   * Helper utility to create a simulated React MouseEvent for testing drawing interactions.
   */
  const createMouseEvent = (
    type: string,
    clientX: number,
    clientY: number,
    rect = { left: 0, top: 0, width: 1000, height: 1000 }
  ) => {
    return {
      type,
      clientX,
      clientY,
      stopPropagation: vi.fn(),
      currentTarget: {
        getBoundingClientRect: () => rect,
      },
    } as unknown as React.MouseEvent<HTMLDivElement>;
  };

  /**
   * Helper utility to create a simulated React TouchEvent for testing drawing interactions on mobile devices.
   */
  const createTouchEvent = (
    type: string,
    clientX: number,
    clientY: number,
    rect = { left: 0, top: 0, width: 1000, height: 1000 }
  ) => {
    return {
      type,
      touches: [{ clientX, clientY }],
      stopPropagation: vi.fn(),
      currentTarget: {
        getBoundingClientRect: () => rect,
      },
    } as unknown as React.TouchEvent<HTMLDivElement>;
  };

  /**
   * Verify that the hook starts with drawing flags and coordinate points reset.
   */
  it("initializes with default state", () => {
    // Arrange: Render the hook.
    const { result } = renderHook(() => useImageDrawing(defaultProps));

    // Assert: Check for default null or false interaction states.
    expect(result.current.isDrawing).toBe(false);
    expect(result.current.drawStart).toBeNull();
    expect(result.current.drawCurrent).toBeNull();
  });

  /**
   * Group of tests covering the logic for initiating a new bounding box drawing.
   */
  describe("handleDrawStart", () => {
    /**
     * Verify that a mousedown event correctly triggers the drawing state when the tool is active.
     */
    it("starts drawing when drawMode is true", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useImageDrawing(defaultProps));
      const event = createMouseEvent("mousedown", 100, 100);

      // Act: Trigger the start of the drawing action.
      act(() => {
        result.current.handleDrawStart(event);
      });

      // Assert: Verify flags are set and the event bubble is stopped.
      expect(result.current.isDrawing).toBe(true);
      expect(result.current.drawStart).toEqual({ x: 100, y: 100 });
      expect(result.current.drawCurrent).toEqual({ x: 100, y: 100 });
      expect(event.stopPropagation).toHaveBeenCalled();
    });

    /**
     * Verify that touchstart events correctly initiate drawing for mobile users.
     */
    it("starts drawing on touch inputs", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useImageDrawing(defaultProps));
      const event = createTouchEvent("touchstart", 150, 150);

      // Act: Trigger drawing start via touch.
      act(() => {
        result.current.handleDrawStart(event);
      });

      // Assert: Verify coordinates are correctly extracted from the touch point.
      expect(result.current.isDrawing).toBe(true);
      expect(result.current.drawStart).toEqual({ x: 150, y: 150 });
      expect(result.current.drawCurrent).toEqual({ x: 150, y: 150 });
    });

    /**
     * Ensure that the drawing state is not triggered if the drawing tool is disabled.
     */
    it("does not start drawing when drawMode is false", () => {
      // Arrange: Render hook with draw mode disabled.
      const { result } = renderHook(() => useImageDrawing({ ...defaultProps, drawMode: false }));
      const event = createMouseEvent("mousedown", 100, 100);

      // Act: Attempt to start drawing.
      act(() => {
        result.current.handleDrawStart(event);
      });

      // Assert: Verify the drawing flag remains false.
      expect(result.current.isDrawing).toBe(false);
      expect(event.stopPropagation).not.toHaveBeenCalled();
    });

    /**
     * Ensure drawing fails safely if image dimension metadata is not provided to the hook.
     */
    it("does not start drawing if image dimensions are missing", () => {
      // Arrange: Render hook with missing dimensions.
      const { result } = renderHook(() =>
        useImageDrawing({ ...defaultProps, imageDimensions: null })
      );
      const event = createMouseEvent("mousedown", 100, 100);

      // Act: Attempt to start drawing.
      act(() => {
        result.current.handleDrawStart(event);
      });

      // Assert: Verify interaction is ignored.
      expect(result.current.isDrawing).toBe(false);
    });
  });

  /**
   * Group of tests covering the logic for updating box previews as the user moves their cursor.
   */
  describe("handleDrawMove", () => {
    /**
     * Verify that moving the mouse updates the current coordinate for visual preview.
     */
    it("updates drawCurrent position while drawing", () => {
      // Arrange: Start a drawing operation.
      const { result } = renderHook(() => useImageDrawing(defaultProps));
      const startEvent = createMouseEvent("mousedown", 100, 100);
      act(() => {
        result.current.handleDrawStart(startEvent);
      });

      // Act: Move the cursor to a new location.
      const moveEvent = createMouseEvent("mousemove", 200, 200);
      act(() => {
        result.current.handleDrawMove(moveEvent);
      });

      // Assert: Ensure the preview point is updated while the start point remains fixed.
      expect(result.current.isDrawing).toBe(true);
      expect(result.current.drawStart).toEqual({ x: 100, y: 100 });
      expect(result.current.drawCurrent).toEqual({ x: 200, y: 200 });
    });

    /**
     * Verify that touch movement updates the drawing preview for mobile users.
     */
    it("updates position on touch move", () => {
      // Arrange: Start a drawing via touch.
      const { result } = renderHook(() => useImageDrawing(defaultProps));
      const startEvent = createTouchEvent("touchstart", 100, 100);
      act(() => {
        result.current.handleDrawStart(startEvent);
      });

      // Act: Simulate finger movement.
      const moveEvent = createTouchEvent("touchmove", 200, 200);
      act(() => {
        result.current.handleDrawMove(moveEvent);
      });

      // Assert: Verify preview coordinate updates.
      expect(result.current.isDrawing).toBe(true);
      expect(result.current.drawCurrent).toEqual({ x: 200, y: 200 });
    });

    /**
     * Ensure that mouse movement is ignored if the user has not initiated a drawing start.
     */
    it("does nothing if not currently drawing", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useImageDrawing(defaultProps));

      // Act: Move mouse without clicking.
      const moveEvent = createMouseEvent("mousemove", 200, 200);
      act(() => {
        result.current.handleDrawMove(moveEvent);
      });

      // Assert: Verify state remains unchanged.
      expect(result.current.isDrawing).toBe(false);
      expect(result.current.drawCurrent).toBeNull();
    });
  });

  /**
   * Group of tests covering the logic for finalizing a box and adding it to the store.
   */
  describe("handleDrawEnd", () => {
    /**
     * Verify that releasing the mouse adds a new detection to the store for a valid box area.
     */
    it("completes drawing and adds detection for valid box size", () => {
      // Arrange: Simulate a complete drag-and-release cycle.
      const { result } = renderHook(() => useImageDrawing(defaultProps));

      const startEvent = createMouseEvent("mousedown", 100, 100);
      act(() => {
        result.current.handleDrawStart(startEvent);
      });

      const moveEvent = createMouseEvent("mousemove", 300, 300);
      act(() => {
        result.current.handleDrawMove(moveEvent);
      });

      // Act: Release the mouse to finish drawing.
      const endEvent = createMouseEvent("mouseup", 300, 300);
      act(() => {
        result.current.handleDrawEnd(endEvent);
      });

      // Assert: Verify store addition with normalized coordinates and status.
      expect(result.current.isDrawing).toBe(false);
      expect(result.current.justFinishedDrawing.current).toBe(true);
      expect(endEvent.stopPropagation).toHaveBeenCalled();

      expect(mockAddDetection).toHaveBeenCalledWith(
        expect.objectContaining({
          uploadId: mockImageId,
          xMin: 100,
          yMin: 100,
          xMax: 300,
          yMax: 300,
          status: "user_confirmed",
        })
      );
    });

    /**
     * Ensure that the hook aborts creation if the resulting box is smaller than the minimum threshold.
     */
    it("aborts drawing if box is too small (< 20px)", () => {
      // Arrange: Start drawing a tiny box.
      const { result } = renderHook(() => useImageDrawing(defaultProps));

      const startEvent = createMouseEvent("mousedown", 100, 100);
      act(() => {
        result.current.handleDrawStart(startEvent);
      });

      const moveEvent = createMouseEvent("mousemove", 110, 110);
      act(() => {
        result.current.handleDrawMove(moveEvent);
      });

      // Act: Attempt to finish the drawing.
      const endEvent = createMouseEvent("mouseup", 110, 110);
      act(() => {
        result.current.handleDrawEnd(endEvent);
      });

      // Assert: Verify no detection was added due to size constraints.
      expect(result.current.isDrawing).toBe(false);
      expect(mockAddDetection).not.toHaveBeenCalled();
      expect(result.current.drawStart).toBeNull();
    });

    /**
     * Verify that coordinates are correctly re-mapped to the original image scale when zoom is active.
     */
    it("correctly handles scaled coordinate transformations", () => {
      // Arrange: Provide props representing a zoomed and offset canvas view.
      const complexProps = {
        ...defaultProps,
        transformScale: 2,
        renderedImageStyle: { width: 500, height: 500, top: 50, left: 50 },
      };

      const { result } = renderHook(() => useImageDrawing(complexProps));

      // Act: Perform a drag interaction.
      const startEvent = createMouseEvent("mousedown", 200, 200);
      act(() => {
        result.current.handleDrawStart(startEvent);
      });

      const moveEvent = createMouseEvent("mousemove", 400, 400);
      act(() => {
        result.current.handleDrawMove(moveEvent);
      });

      const endEvent = createMouseEvent("mouseup", 400, 400);
      act(() => {
        result.current.handleDrawEnd(endEvent);
      });

      // Assert: Verify the resulting coordinates match the original image space, not screen space.
      expect(mockAddDetection).toHaveBeenCalledWith(
        expect.objectContaining({
          xMin: 100,
          yMin: 100,
          xMax: 300,
          yMax: 300,
        })
      );
    });

    /**
     * Ensure that boxes are automatically constrained to stay within the image boundaries.
     */
    it("clamps coordinates to image boundaries", () => {
      // Arrange: Render the hook.
      const { result } = renderHook(() => useImageDrawing(defaultProps));

      const startEvent = createMouseEvent("mousedown", 100, 100);
      act(() => {
        result.current.handleDrawStart(startEvent);
      });

      // Act: Drag the mouse far outside the image container.
      const moveEvent = createMouseEvent("mousemove", 1500, 1500);
      act(() => {
        result.current.handleDrawMove(moveEvent);
      });

      const endEvent = createMouseEvent("mouseup", 1500, 1500);
      act(() => {
        result.current.handleDrawEnd(endEvent);
      });

      // Assert: Verify coordinates are clamped to the `1000` image width/height boundary.
      expect(mockAddDetection).toHaveBeenCalledWith(
        expect.objectContaining({
          xMin: 100,
          yMin: 100,
          xMax: 1000,
          yMax: 1000,
        })
      );
    });

    /**
     * Ensure the end handler is safe to call even if a drawing start was never registered.
     */
    it("does nothing if called when not drawing", () => {
      // Arrange: Render hook.
      const { result } = renderHook(() => useImageDrawing(defaultProps));
      const endEvent = createMouseEvent("mouseup", 100, 100);

      // Act: Trigger end handler without starting.
      act(() => {
        result.current.handleDrawEnd(endEvent);
      });

      // Assert: Verify no effects occurred.
      expect(mockAddDetection).not.toHaveBeenCalled();
      expect(endEvent.stopPropagation).not.toHaveBeenCalled();
    });

    /**
     * Verify that the interaction lock flag is cleared after a short timeout to allow subsequent actions.
     */
    it("resets justFinishedDrawing flag after delay", () => {
      // Arrange: Setup fake timers and finish a drawing.
      vi.useFakeTimers();
      const { result } = renderHook(() => useImageDrawing(defaultProps));

      const startEvent = createMouseEvent("mousedown", 100, 100);
      act(() => {
        result.current.handleDrawStart(startEvent);
      });

      const moveEvent = createMouseEvent("mousemove", 300, 300);
      act(() => {
        result.current.handleDrawMove(moveEvent);
      });

      const endEvent = createMouseEvent("mouseup", 300, 300);
      act(() => {
        result.current.handleDrawEnd(endEvent);
      });

      // Assert: Check the active lock flag.
      expect(result.current.justFinishedDrawing.current).toBe(true);

      // Act: Advance time.
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // Assert: Verify the flag is reset for the next interaction.
      expect(result.current.justFinishedDrawing.current).toBe(false);
      vi.useRealTimers();
    });
  });
});
