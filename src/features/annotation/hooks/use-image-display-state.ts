import { useCallback, useEffect, useMemo } from "react";
import { type ReactZoomPanPinchRef } from "react-zoom-pan-pinch";

import { type EditorImage } from "@/features/annotation/hooks/use-editor-image";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

/**
 * Defines the props for the image display state hook.
 */
type UseImageDisplayStateProps = {
  /** The image data to display, including detections. */
  image: EditorImage;
  /** Optional callback fired when the transform state changes for minimap. */
  onTransformed?: (
    ref: ReactZoomPanPinchRef,
    state: { scale: number; positionX: number; positionY: number }
  ) => void;
};

/**
 * Custom hook for managing image display state and behavior.
 * Handles store selectors, detection filtering, transform tracking, and initialization.
 *
 * @param {UseImageDisplayStateProps} props The props for the hook.
 * @returns An object containing all state, actions, and handlers for the image display.
 */
export const useImageDisplayState = ({ image, onTransformed }: UseImageDisplayStateProps) => {
  // Store selectors
  const clearSelection = useAnnotationStore((state) => state.clearSelection);
  const setDetections = useAnnotationStore((state) => state.setDetections);
  const setTransformScale = useAnnotationStore((state) => state.setTransformScale);
  const allDetections = useAnnotationStore((state) => state.detections);
  const displayFilter = useAnnotationStore((state) => state.displayFilter);
  const drawMode = useAnnotationStore((state) => state.drawMode);
  const selectMode = useAnnotationStore((state) => state.selectMode);
  const transformScale = useAnnotationStore((state) => state.transformScale);

  // Filter detections based on display filter
  const detections = useMemo(() => {
    if (displayFilter === "all") return allDetections;
    if (displayFilter === "verified")
      return allDetections.filter((det) => det.status === "user_confirmed");
    if (displayFilter === "unverified")
      return allDetections.filter((det) => det.status !== "user_confirmed");
    return allDetections;
  }, [allDetections, displayFilter]);

  // Handle transform changes to track zoom scale
  const handleTransformed = useCallback(
    (ref: ReactZoomPanPinchRef, state: { scale: number; positionX: number; positionY: number }) => {
      setTransformScale(state.scale);
      onTransformed?.(ref, state);
    },
    [setTransformScale, onTransformed]
  );

  // Initialize detections in store when image loads
  useEffect(() => {
    if (image.detections) {
      setDetections(image.detections);
    }
  }, [image.id, image.detections, setDetections]);

  return {
    // Store state
    clearSelection,
    detections,
    drawMode,
    selectMode,
    transformScale,
    // Handlers
    handleTransformed,
  };
};
