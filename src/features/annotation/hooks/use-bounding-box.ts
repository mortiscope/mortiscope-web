import { useCallback, useEffect, useState } from "react";

import { type Detection } from "@/features/annotation/hooks/use-editor-image";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

/**
 * Defines the props for the bounding box hook.
 */
type UseBoundingBoxProps = {
  /** The array of detection objects to be rendered as bounding boxes. */
  detections: Detection[];
  /** The natural, original dimensions of the image file, used for coordinate calculations. */
  imageDimensions: { width: number; height: number };
  /** The actual, on-screen dimensions and position of the displayed image, used for the overlay. */
  renderedImageStyle: { width: number; height: number; top: number; left: number };
};

/**
 * Custom hook for managing bounding box interactions including dragging and resizing.
 * Handles all state management, event handlers, and coordinate calculations for bounding box operations.
 *
 * @param {UseBoundingBoxProps} props The props for the hook.
 * @returns An object containing all state, actions, and handlers for bounding box interactions.
 */
export const useBoundingBox = ({
  detections,
  imageDimensions,
  renderedImageStyle,
}: UseBoundingBoxProps) => {
  // Retrieves selection state and actions from the annotation store.
  const selectedDetectionId = useAnnotationStore((state) => state.selectedDetectionId);
  const selectDetection = useAnnotationStore((state) => state.selectDetection);
  const updateDetectionNoHistory = useAnnotationStore((state) => state.updateDetectionNoHistory);
  const saveStateBeforeEdit = useAnnotationStore((state) => state.saveStateBeforeEdit);
  const transformScale = useAnnotationStore((state) => state.transformScale);
  const isLocked = useAnnotationStore((state) => state.isLocked);

  // Local state to manage the dragging interaction.
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [draggedDetectionId, setDraggedDetectionId] = useState<string | null>(null);

  // Local state to manage the resizing interaction.
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{
    x: number;
    y: number;
    detection: Detection;
  } | null>(null);

  // Local state to programmatically control tooltip visibility after an interaction.
  const [showTooltipFor, setShowTooltipFor] = useState<string | null>(null);

  /**
   * A memoized mouse move event handler for both dragging and resizing operations.
   * It calculates the change in mouse position and translates it into changes in the
   * bounding box's coordinates in the original image's pixel space.
   */
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging && dragStart && draggedDetectionId) {
        const detection = detections.find((d) => d.id === draggedDetectionId);
        if (!detection) return;

        // Calculate mouse delta in screen pixels.
        const deltaX = e.clientX - dragStart.x;
        const deltaY = e.clientY - dragStart.y;

        // Calculate the scaling factor between the rendered image and the original image.
        const imageScaleX = imageDimensions.width / renderedImageStyle.width;
        const imageScaleY = imageDimensions.height / renderedImageStyle.height;

        // Convert the screen pixel delta into the original image's pixel space.
        const imageDeltaX = (deltaX / transformScale) * imageScaleX;
        const imageDeltaY = (deltaY / transformScale) * imageScaleY;

        let newXMin = detection.xMin + imageDeltaX;
        let newYMin = detection.yMin + imageDeltaY;
        let newXMax = detection.xMax + imageDeltaX;
        let newYMax = detection.yMax + imageDeltaY;

        // Constrain the new box position to stay within the image boundaries.
        const boxWidth = newXMax - newXMin;
        const boxHeight = newYMax - newYMin;
        if (newXMin < 0) {
          newXMin = 0;
          newXMax = boxWidth;
        }
        if (newYMin < 0) {
          newYMin = 0;
          newYMax = boxHeight;
        }
        if (newXMax > imageDimensions.width) {
          newXMax = imageDimensions.width;
          newXMin = imageDimensions.width - boxWidth;
        }
        if (newYMax > imageDimensions.height) {
          newYMax = imageDimensions.height;
          newYMin = imageDimensions.height - boxHeight;
        }

        // Update the detection's coordinates without saving to history.
        updateDetectionNoHistory(draggedDetectionId, {
          xMin: newXMin,
          yMin: newYMin,
          xMax: newXMax,
          yMax: newYMax,
        });

        // Update the drag start position for the next mouse move event.
        setDragStart({ x: e.clientX, y: e.clientY });
      }

      // Resizing logic
      if (isResizing && resizeStart && resizeHandle) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;

        const imageScaleX = imageDimensions.width / renderedImageStyle.width;
        const imageScaleY = imageDimensions.height / renderedImageStyle.height;

        const imageDeltaX = (deltaX / transformScale) * imageScaleX;
        const imageDeltaY = (deltaY / transformScale) * imageScaleY;

        let newXMin = resizeStart.detection.xMin;
        let newYMin = resizeStart.detection.yMin;
        let newXMax = resizeStart.detection.xMax;
        let newYMax = resizeStart.detection.yMax;

        // Apply the delta to the appropriate box edges based on which handle is being dragged.
        if (resizeHandle.includes("l")) newXMin += imageDeltaX;
        if (resizeHandle.includes("r")) newXMax += imageDeltaX;
        if (resizeHandle.includes("t")) newYMin += imageDeltaY;
        if (resizeHandle.includes("b")) newYMax += imageDeltaY;

        // Constrain the new box dimensions to the image boundaries.
        newXMin = Math.max(0, newXMin);
        newYMin = Math.max(0, newYMin);
        newXMax = Math.min(imageDimensions.width, newXMax);
        newYMax = Math.min(imageDimensions.height, newYMax);

        // Enforce a minimum size to prevent the box from collapsing.
        if (newXMax - newXMin < 20) return;
        if (newYMax - newYMin < 20) return;

        updateDetectionNoHistory(selectedDetectionId!, {
          xMin: newXMin,
          yMin: newYMin,
          xMax: newXMax,
          yMax: newYMax,
        });
      }
    },
    [
      // The dependency array is extensive to ensure `useCallback` has the latest state and props.
      isDragging,
      dragStart,
      draggedDetectionId,
      isResizing,
      resizeStart,
      resizeHandle,
      detections,
      imageDimensions,
      renderedImageStyle,
      transformScale,
      selectedDetectionId,
      updateDetectionNoHistory,
    ]
  );

  /**
   * A memoized `mouseup` event handler to terminate dragging or resizing operations and clean up state.
   */
  const handleMouseUp = useCallback(() => {
    // After an interaction, briefly show the tooltip to provide feedback on the final position/size.
    if (isDragging && draggedDetectionId) {
      setShowTooltipFor(draggedDetectionId);
      setTimeout(() => setShowTooltipFor(null), 2000);
    }
    if (isResizing && selectedDetectionId) {
      setShowTooltipFor(selectedDetectionId);
      setTimeout(() => setShowTooltipFor(null), 2000);
    }

    // Reset all interaction-related state.
    setIsDragging(false);
    setDragStart(null);
    setDraggedDetectionId(null);
    setIsResizing(false);
    setResizeHandle(null);
    setResizeStart(null);
  }, [isDragging, draggedDetectionId, isResizing, selectedDetectionId]);

  /**
   * A side effect that attaches global `mousemove` and `mouseup` event listeners to the `window` only when a
   * drag or resize operation is active. The cleanup function removes these listeners to prevent memory leaks.
   */
  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  /**
   * Initiates a drag operation for a detection.
   */
  const startDrag = useCallback(
    (detectionId: string, clientX: number, clientY: number) => {
      saveStateBeforeEdit();
      setIsDragging(true);
      setDragStart({ x: clientX, y: clientY });
      setDraggedDetectionId(detectionId);
    },
    [saveStateBeforeEdit]
  );

  /**
   * Initiates a resize operation for a detection.
   */
  const startResize = useCallback(
    (handle: string, clientX: number, clientY: number, detection: Detection) => {
      saveStateBeforeEdit();
      setIsResizing(true);
      setResizeHandle(handle);
      setResizeStart({ x: clientX, y: clientY, detection });
    },
    [saveStateBeforeEdit]
  );

  return {
    // Selection state
    selectedDetectionId,
    selectDetection,
    isLocked,
    // Interaction state
    isDragging,
    isResizing,
    showTooltipFor,
    // Interaction handlers
    startDrag,
    startResize,
  };
};
