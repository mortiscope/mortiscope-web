import React, { memo } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type Detection } from "@/features/annotation/hooks/use-editor-image";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";
import { formatConfidence, formatLabel, getColorForClass } from "@/lib/utils";

/**
 * Defines the props for the editor bounding box component.
 */
interface EditorBoundingBoxProps {
  /** The array of detection objects to be rendered as bounding boxes. */
  detections: Detection[];
  /** The natural, original dimensions of the image file, used for coordinate calculations. */
  imageDimensions: { width: number; height: number };
  /** The actual, on-screen dimensions and position of the displayed image, used for the overlay. */
  renderedImageStyle: { width: number; height: number; top: number; left: number };
}

/**
 * A memoized component that renders highly interactive bounding boxes for detections in the annotation editor.
 * It handles selection, dragging, and resizing of boxes, synchronizing state with a global Zustand store.
 */
export const EditorBoundingBox = memo(
  ({ detections, imageDimensions, renderedImageStyle }: EditorBoundingBoxProps) => {
    // Retrieves selection state and actions from the annotation store.
    const selectedDetectionId = useAnnotationStore((state) => state.selectedDetectionId);
    const selectDetection = useAnnotationStore((state) => state.selectDetection);
    const updateDetectionNoHistory = useAnnotationStore((state) => state.updateDetectionNoHistory);
    const saveStateBeforeEdit = useAnnotationStore((state) => state.saveStateBeforeEdit);
    const transformScale = useAnnotationStore((state) => state.transformScale);

    // Local state to manage the dragging interaction.
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragStart, setDragStart] = React.useState<{ x: number; y: number } | null>(null);
    const [draggedDetectionId, setDraggedDetectionId] = React.useState<string | null>(null);

    // Local state to manage the resizing interaction.
    const [isResizing, setIsResizing] = React.useState(false);
    const [resizeHandle, setResizeHandle] = React.useState<string | null>(null);
    const [resizeStart, setResizeStart] = React.useState<{
      x: number;
      y: number;
      detection: Detection;
    } | null>(null);

    // Local state to programmatically control tooltip visibility after an interaction.
    const [showTooltipFor, setShowTooltipFor] = React.useState<string | null>(null);

    // Calculates a dynamic border width based on the rendered image size to maintain a consistent visual thickness.
    const baseBorderWidth = Math.max(2, renderedImageStyle.width * 0.0025);

    /**
     * A memoized mouse move event handler for both dragging and resizing operations.
     * It calculates the change in mouse position and translates it into changes in the
     * bounding box's coordinates in the original image's pixel space.
     */
    const handleMouseMove = React.useCallback(
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
    const handleMouseUp = React.useCallback(() => {
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
    React.useEffect(() => {
      if (isDragging || isResizing) {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
          window.removeEventListener("mousemove", handleMouseMove);
          window.removeEventListener("mouseup", handleMouseUp);
        };
      }
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

    return (
      <div
        className="absolute"
        style={{
          width: `${renderedImageStyle.width}px`,
          height: `${renderedImageStyle.height}px`,
          top: `${renderedImageStyle.top}px`,
          left: `${renderedImageStyle.left}px`,
        }}
      >
        {detections.map((det: Detection) => {
          const isSelected = selectedDetectionId === det.id;
          const borderWidth = baseBorderWidth;

          return (
            <Tooltip key={det.id} open={showTooltipFor === det.id || undefined}>
              <TooltipTrigger asChild>
                <div
                  className="absolute box-border transition-all duration-150"
                  style={{
                    cursor: isSelected && !isResizing ? "move" : "pointer",
                    // The core rendering logic
                    top: `${(det.yMin / imageDimensions.height) * 100}%`,
                    left: `${(det.xMin / imageDimensions.width) * 100}%`,
                    width: `${((det.xMax - det.xMin) / imageDimensions.width) * 100}%`,
                    height: `${((det.yMax - det.yMin) / imageDimensions.height) * 100}%`,
                    borderColor: getColorForClass(det.label),
                    borderWidth: `${borderWidth}px`,
                    zIndex: isSelected ? 10 : 1,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    selectDetection(det.id);
                  }}
                  onMouseDown={(e) => {
                    // Initiates a drag operation only if the box is already selected.
                    if (isSelected) {
                      e.stopPropagation();
                      saveStateBeforeEdit();
                      setIsDragging(true);
                      setDragStart({ x: e.clientX, y: e.clientY });
                      setDraggedDetectionId(det.id);
                    }
                  }}
                >
                  {/* Renders the resize handles only when the bounding box is selected. */}
                  {isSelected && (
                    <>
                      {/* Corner resize handles */}
                      {["tl", "tr", "bl", "br"].map((handle) => {
                        const handleOffset = -(4 + borderWidth / 2);
                        return (
                          <div
                            key={handle}
                            className="absolute border border-black bg-white"
                            style={{
                              width: "8px",
                              height: "8px",
                              ...(handle === "tl" && {
                                top: `${handleOffset}px`,
                                left: `${handleOffset}px`,
                                cursor: "nw-resize",
                              }),
                              ...(handle === "tr" && {
                                top: `${handleOffset}px`,
                                right: `${handleOffset}px`,
                                cursor: "ne-resize",
                              }),
                              ...(handle === "bl" && {
                                bottom: `${handleOffset}px`,
                                left: `${handleOffset}px`,
                                cursor: "sw-resize",
                              }),
                              ...(handle === "br" && {
                                bottom: `${handleOffset}px`,
                                right: `${handleOffset}px`,
                                cursor: "se-resize",
                              }),
                            }}
                            onMouseDown={(e) => {
                              // Initiates a resize operation.
                              e.stopPropagation();
                              saveStateBeforeEdit();
                              setIsResizing(true);
                              setResizeHandle(handle);
                              setResizeStart({ x: e.clientX, y: e.clientY, detection: det });
                            }}
                          />
                        );
                      })}
                      {/* Edge resize handles */}
                      {["t", "r", "b", "l"].map((handle) => {
                        const handleOffset = -(4 + borderWidth / 2);
                        return (
                          <div
                            key={handle}
                            className="absolute border border-black bg-white"
                            style={{
                              ...(handle === "t" && {
                                width: "8px",
                                height: "8px",
                                top: `${handleOffset}px`,
                                left: "50%",
                                transform: "translateX(-50%)",
                                cursor: "n-resize",
                              }),
                              ...(handle === "r" && {
                                width: "8px",
                                height: "8px",
                                right: `${handleOffset}px`,
                                top: "50%",
                                transform: "translateY(-50%)",
                                cursor: "e-resize",
                              }),
                              ...(handle === "b" && {
                                width: "8px",
                                height: "8px",
                                bottom: `${handleOffset}px`,
                                left: "50%",
                                transform: "translateX(-50%)",
                                cursor: "s-resize",
                              }),
                              ...(handle === "l" && {
                                width: "8px",
                                height: "8px",
                                left: `${handleOffset}px`,
                                top: "50%",
                                transform: "translateY(-50%)",
                                cursor: "w-resize",
                              }),
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              saveStateBeforeEdit();
                              setIsResizing(true);
                              setResizeHandle(handle);
                              setResizeStart({ x: e.clientX, y: e.clientY, detection: det });
                            }}
                          />
                        );
                      })}
                    </>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">
                  {det.status === "user_confirmed" || det.confidence === null
                    ? formatLabel(det.label)
                    : `${formatLabel(det.label)}: ${formatConfidence(det.confidence)}`}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    );
  }
);

EditorBoundingBox.displayName = "EditorBoundingBox";
