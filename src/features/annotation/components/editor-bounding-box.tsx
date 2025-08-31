import { memo, useMemo } from "react";

import { BoundingBoxItem } from "@/features/annotation/components/bounding-box-item";
import { useBoundingBox } from "@/features/annotation/hooks/use-bounding-box";
import { type Detection } from "@/features/annotation/hooks/use-editor-image";

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
 * A smart container component that renders highly interactive bounding boxes for detections in the annotation editor.
 * It orchestrates selection, dragging, and resizing of boxes, synchronizing state with a global Zustand store.
 */
export const EditorBoundingBox = memo(
  ({ detections, imageDimensions, renderedImageStyle }: EditorBoundingBoxProps) => {
    // Use the bounding box hook to manage interactions
    const {
      selectedDetectionId,
      selectDetection,
      openPanel,
      isLocked,
      isResizing,
      showTooltipFor,
      startDrag,
      startResize,
    } = useBoundingBox({ detections, imageDimensions, renderedImageStyle });

    // Calculates a dynamic border width based on the rendered image size to maintain a consistent visual thickness.
    const baseBorderWidth = useMemo(
      () => Math.max(2, renderedImageStyle.width * 0.0025),
      [renderedImageStyle.width]
    );

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
            <BoundingBoxItem
              key={det.id}
              detection={det}
              isSelected={isSelected}
              isLocked={isLocked}
              isResizing={isResizing}
              borderWidth={borderWidth}
              imageDimensions={imageDimensions}
              showTooltip={showTooltipFor === det.id}
              onSelect={selectDetection}
              onOpenPanel={openPanel}
              onStartDrag={startDrag}
              onStartResize={startResize}
            />
          );
        })}
      </div>
    );
  }
);

EditorBoundingBox.displayName = "EditorBoundingBox";
