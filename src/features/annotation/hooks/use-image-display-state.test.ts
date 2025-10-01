import { renderHook } from "@testing-library/react";
import { type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";

import { Detection } from "@/features/annotation/hooks/use-editor-image";
import { useImageDisplayState } from "@/features/annotation/hooks/use-image-display-state";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

// Mock the annotation store to control state access and verify data synchronization.
vi.mock("@/features/annotation/store/annotation-store", () => ({
  useAnnotationStore: vi.fn(),
}));

/**
 * Utility function to generate a standardized detection object for test data.
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
 * Test suite for the `useImageDisplayState` hook, which manages image synchronization and filtering.
 */
describe("useImageDisplayState", () => {
  const mockSetDetections = vi.fn();
  const mockSetTransformScale = vi.fn();
  const mockClearSelection = vi.fn();

  const mockImage = {
    id: "img-1",
    name: "Test Image",
    url: "test.jpg",
    size: 1000,
    dateUploaded: new Date(),
    detections: [createDetection("1"), createDetection("2")],
  };

  // Reset all mock functions and provide a default store implementation before each test.
  beforeEach(() => {
    vi.clearAllMocks();

    (useAnnotationStore as unknown as Mock).mockImplementation(
      (selector: (state: unknown) => unknown) => {
        const state = {
          detections: mockImage.detections,
          displayFilter: "all",
          drawMode: false,
          selectMode: false,
          transformScale: 1,
          clearSelection: mockClearSelection,
          setDetections: mockSetDetections,
          setTransformScale: mockSetTransformScale,
          classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
          viewMode: "all",
        };
        return selector(state);
      }
    );
  });

  /**
   * Verify that the hook populates the global store with detections when the component mounts.
   */
  it("initializes detections in store on mount", () => {
    // Act: Render the hook with a sample image.
    renderHook(() => useImageDisplayState({ image: mockImage }));

    // Assert: Check that the store setter was called with the provided detections.
    expect(mockSetDetections).toHaveBeenCalledWith(mockImage.detections);
  });

  /**
   * Ensure the hook handles cases where an image has no associated detection array.
   */
  it("does not set detections if image.detections is undefined", () => {
    // Arrange: Create an image object with missing detections.
    const imageWithoutDetections = { ...mockImage, detections: undefined };

    // Act: Render the hook.
    renderHook(() => useImageDisplayState({ image: imageWithoutDetections }));

    // Assert: Verify the store was not updated.
    expect(mockSetDetections).not.toHaveBeenCalled();
  });

  /**
   * Verify that detections are updated in the store whenever the image identifier changes.
   */
  it("updates detections in store when image ID changes", () => {
    // Arrange: Initial render.
    const { rerender } = renderHook((props) => useImageDisplayState(props), {
      initialProps: { image: mockImage },
    });

    expect(mockSetDetections).toHaveBeenCalledTimes(1);

    // Act: Change the image to a different object.
    const newImage = { ...mockImage, id: "img-2", detections: [] };

    rerender({ image: newImage });

    // Assert: Verify the store received the second set of detections.
    expect(mockSetDetections).toHaveBeenCalledTimes(2);
    expect(mockSetDetections).toHaveBeenLastCalledWith([]);
  });

  /**
   * Verify that the hook exposes necessary store values to the component.
   */
  it("returns correct store state values", () => {
    // Act: Render the hook.
    const { result } = renderHook(() => useImageDisplayState({ image: mockImage }));

    // Assert: Check derived state values for accuracy.
    expect(result.current.drawMode).toBe(false);
    expect(result.current.selectMode).toBe(false);
    expect(result.current.transformScale).toBe(1);
    expect(result.current.clearSelection).toBe(mockClearSelection);
  });

  /**
   * Group of tests covering the logic for filtering visible annotations based on verification status.
   */
  describe("Detection Filtering", () => {
    const detGenerated = createDetection("1", { status: "model_generated" });
    const detConfirmed = createDetection("2", { status: "user_confirmed" });
    const detEditedConfirmed = createDetection("3", { status: "user_edited_confirmed" });
    const detEdited = createDetection("4", { status: "user_edited" });

    const allDetections = [detGenerated, detConfirmed, detEditedConfirmed, detEdited];

    /**
     * Verify that all detections are returned when the filter is set to include everything.
     */
    it("returns all detections when filter is 'all'", () => {
      // Arrange: Update store mock for the 'all' filter.
      (useAnnotationStore as unknown as Mock).mockImplementation(
        (selector: (state: unknown) => unknown) => {
          return selector({
            detections: allDetections,
            displayFilter: "all",
            setDetections: mockSetDetections,
            setTransformScale: mockSetTransformScale,
            classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
            viewMode: "all",
          });
        }
      );

      const { result } = renderHook(() => useImageDisplayState({ image: mockImage }));

      // Assert: Verify no items were filtered out.
      expect(result.current.detections).toHaveLength(4);
    });

    /**
     * Verify that only confirmed or user-edited annotations are shown in the 'verified' filter.
     */
    it("returns only verified detections when filter is 'verified'", () => {
      // Arrange: Update store mock for the 'verified' filter.
      (useAnnotationStore as unknown as Mock).mockImplementation(
        (selector: (state: unknown) => unknown) => {
          return selector({
            detections: allDetections,
            displayFilter: "verified",
            setDetections: mockSetDetections,
            setTransformScale: mockSetTransformScale,
            classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
            viewMode: "all",
          });
        }
      );

      const { result } = renderHook(() => useImageDisplayState({ image: mockImage }));

      // Assert: Verify only IDs 2 and 3 remain.
      expect(result.current.detections).toHaveLength(2);
      expect(result.current.detections.map((d) => d.id)).toEqual(
        expect.arrayContaining(["2", "3"])
      );
    });

    /**
     * Verify that only unconfirmed or pending annotations are shown in the 'unverified' filter.
     */
    it("returns only unverified detections when filter is 'unverified'", () => {
      // Arrange: Update store mock for the 'unverified' filter.
      (useAnnotationStore as unknown as Mock).mockImplementation(
        (selector: (state: unknown) => unknown) => {
          return selector({
            detections: allDetections,
            displayFilter: "unverified",
            setDetections: mockSetDetections,
            setTransformScale: mockSetTransformScale,
            classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
            viewMode: "all",
          });
        }
      );

      const { result } = renderHook(() => useImageDisplayState({ image: mockImage }));

      // Assert: Verify only IDs 1 and 4 remain.
      expect(result.current.detections).toHaveLength(2);
      expect(result.current.detections.map((d) => d.id)).toEqual(
        expect.arrayContaining(["1", "4"])
      );
    });

    /**
     * Ensure the hook defaults to showing all detections if an invalid filter string is provided.
     */
    it("returns all detections when filter is unknown", () => {
      // Arrange: Use an unsupported filter type.
      (useAnnotationStore as unknown as Mock).mockImplementation(
        (selector: (state: unknown) => unknown) => {
          return selector({
            detections: allDetections,
            displayFilter: "unknown",
            setDetections: mockSetDetections,
            setTransformScale: mockSetTransformScale,
            classFilter: ["instar_1", "instar_2", "instar_3", "pupa", "adult"],
            viewMode: "all",
          });
        }
      );

      const { result } = renderHook(() => useImageDisplayState({ image: mockImage }));

      // Assert: Verify that the filter failed open and returned all items.
      expect(result.current.detections).toHaveLength(4);
    });
  });

  /**
   * Group of tests for the transformation callback used by the zoom-pan-pinch component.
   */
  describe("handleTransformed", () => {
    /**
     * Verify that the store's transform scale is updated and external callbacks are triggered.
     */
    it("updates transform scale in store and calls onTransformed prop", () => {
      // Arrange: Provide an external spy callback.
      const onTransformedSpy = vi.fn();
      const { result } = renderHook(() =>
        useImageDisplayState({ image: mockImage, onTransformed: onTransformedSpy })
      );

      const mockRef = {} as unknown as ReactZoomPanPinchRef;
      const mockState = { scale: 2.5, positionX: 100, positionY: 200 };

      // Act: Execute the transformation handler.
      result.current.handleTransformed(mockRef, mockState);

      // Assert: Check both the store update and the external callback.
      expect(mockSetTransformScale).toHaveBeenCalledWith(2.5);
      expect(onTransformedSpy).toHaveBeenCalledWith(mockRef, mockState);
    });

    /**
     * Ensure the hook remains functional even if the optional onTransformed property is not provided.
     */
    it("updates transform scale without error if onTransformed prop is missing", () => {
      // Arrange: Render hook without optional callback.
      const { result } = renderHook(() => useImageDisplayState({ image: mockImage }));

      const mockRef = {} as unknown as ReactZoomPanPinchRef;
      const mockState = { scale: 1.5, positionX: 0, positionY: 0 };

      // Act: Trigger transformation.
      result.current.handleTransformed(mockRef, mockState);

      // Assert: Verify that the store was still updated correctly.
      expect(mockSetTransformScale).toHaveBeenCalledWith(1.5);
    });
  });
});
