import { memo } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BoundingBoxHandles } from "@/features/annotation/components/bounding-box-handles";
import { type Detection } from "@/features/annotation/hooks/use-editor-image";
import { formatConfidence, formatLabel, getColorForClass } from "@/lib/utils";

/**
 * Defines the props for the bounding box item component.
 */
interface BoundingBoxItemProps {
  /** The detection object to be rendered as a bounding box. */
  detection: Detection;
  /** A boolean indicating if this detection is currently selected. */
  isSelected: boolean;
  /** A boolean indicating if the editor is currently locked. */
  isLocked: boolean;
  /** A boolean indicating if a resize operation is currently active. */
  isResizing: boolean;
  /** The border width for the bounding box. */
  borderWidth: number;
  /** The natural, original dimensions of the image file, used for coordinate calculations. */
  imageDimensions: { width: number; height: number };
  /** A boolean indicating if the tooltip should be shown for this detection. */
  showTooltip: boolean;
  /** Callback to select this detection. */
  onSelect: (detectionId: string) => void;
  /** Callback to initiate a drag operation. */
  onStartDrag: (detectionId: string, clientX: number, clientY: number) => void;
  /** Callback to initiate a resize operation. */
  onStartResize: (handle: string, clientX: number, clientY: number, detection: Detection) => void;
}

/**
 * A presentational component that renders a single interactive bounding box for a detection.
 * Handles selection, dragging initiation, and conditionally renders resize handles.
 *
 * @param {BoundingBoxItemProps} props The props for the component.
 * @returns A React component representing a single bounding box.
 */
export const BoundingBoxItem = memo(function BoundingBoxItem({
  detection,
  isSelected,
  isLocked,
  isResizing,
  borderWidth,
  imageDimensions,
  showTooltip,
  onSelect,
  onStartDrag,
  onStartResize,
}: BoundingBoxItemProps) {
  return (
    <Tooltip open={showTooltip || undefined}>
      <TooltipTrigger asChild>
        <div
          className="absolute box-border transition-all duration-150"
          style={{
            cursor: isLocked ? "pointer" : isSelected && !isResizing ? "move" : "pointer",
            // The core rendering logic
            top: `${(detection.yMin / imageDimensions.height) * 100}%`,
            left: `${(detection.xMin / imageDimensions.width) * 100}%`,
            width: `${((detection.xMax - detection.xMin) / imageDimensions.width) * 100}%`,
            height: `${((detection.yMax - detection.yMin) / imageDimensions.height) * 100}%`,
            borderColor: getColorForClass(detection.label),
            borderWidth: `${borderWidth}px`,
            zIndex: isSelected ? 10 : 1,
          }}
          onClick={(e) => {
            if (isLocked) return;
            e.stopPropagation();
            onSelect(detection.id);
          }}
          onMouseDown={(e) => {
            if (isLocked) return;
            // Initiates a drag operation only if the box is already selected.
            if (isSelected) {
              e.stopPropagation();
              onStartDrag(detection.id, e.clientX, e.clientY);
            }
          }}
        >
          {/* Renders the resize handles only when the bounding box is selected. */}
          {isSelected && (
            <BoundingBoxHandles
              detection={detection}
              borderWidth={borderWidth}
              onStartResize={onStartResize}
            />
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-inter">
          {detection.status === "user_confirmed" || detection.confidence === null
            ? formatLabel(detection.label)
            : `${formatLabel(detection.label)}: ${formatConfidence(detection.confidence)}`}
        </p>
      </TooltipContent>
    </Tooltip>
  );
});

BoundingBoxItem.displayName = "BoundingBoxItem";
