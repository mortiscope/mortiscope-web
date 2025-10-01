import { useCallback, useEffect, useMemo, useRef } from "react";
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

  // Filter detections based on display filter, class filter, and view mode
  const classFilter = useAnnotationStore((state) => state.classFilter);
  const viewMode = useAnnotationStore((state) => state.viewMode);

  const detections = useMemo(() => {
    // If view mode is image only or none, don't show any detections
    if (viewMode === "image_only" || viewMode === "none") return [];

    let filtered = allDetections;

    // Apply verification filter
    if (displayFilter === "verified") {
      filtered = filtered.filter(
        (det) => det.status === "user_confirmed" || det.status === "user_edited_confirmed"
      );
    } else if (displayFilter === "unverified") {
      filtered = filtered.filter(
        (det) => det.status !== "user_confirmed" && det.status !== "user_edited_confirmed"
      );
    }

    // Apply class filter if not all classes are selected.
    if (classFilter.length < 5) {
      filtered = filtered.filter((det) => classFilter.includes(det.label));
    } else if (classFilter.length === 0) {
      return [];
    }

    return filtered;
  }, [allDetections, displayFilter, classFilter, viewMode]);

  // Handle transform changes to track zoom scale
  const handleTransformed = useCallback(
    (ref: ReactZoomPanPinchRef, state: { scale: number; positionX: number; positionY: number }) => {
      setTransformScale(state.scale);
      onTransformed?.(ref, state);
    },
    [setTransformScale, onTransformed]
  );

  // Track which image has been initialized to prevent re-initialization
  const initializedImageIdRef = useRef<string | null>(null);

  // Initialize detections in store when image loads
  useEffect(() => {
    // Only initialize when switching to a different image
    if (image.detections && initializedImageIdRef.current !== image.id) {
      initializedImageIdRef.current = image.id;
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
    viewMode,
    // Handlers
    handleTransformed,
  };
};
