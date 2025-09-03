import { memo, useRef } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BoundingBoxHandles } from "@/features/annotation/components/bounding-box-handles";
import { type Detection } from "@/features/annotation/hooks/use-editor-image";
import { eventCoordinates } from "@/features/annotation/utils/event-coordinates";
import { useIsMobile } from "@/hooks/use-mobile";
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
  onSelect: (detectionId: string, shouldOpenPanel?: boolean) => void;
  /** Callback to open the detection panel. */
  onOpenPanel: () => void;
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
  onOpenPanel,
  onStartDrag,
  onStartResize,
}: BoundingBoxItemProps) {
  // Detect if the device is mobile
  const isMobile = useIsMobile();

  // Track last tap time for double-tap detection (mobile only)
  const lastTapRef = useRef<{ time: number; detectionId: string } | null>(null);
  // Track if touch was used to prevent click event from firing after touch
  const touchUsedRef = useRef<number>(0);

  /**
   * Handles click on the bounding box on mouse only.
   */
  const handleClick = (e: React.MouseEvent) => {
    if (isLocked) return;

    // Always stop propagation to prevent bubbling to parent's clear selection
    e.stopPropagation();

    // Ignore click if it's a ghost click after touch (within 500ms)
    if (Date.now() - touchUsedRef.current < 500) {
      return;
    }

    // On desktop, select and open panel immediately
    if (!isMobile) {
      onSelect(detection.id, true);
    }
  };

  /**
   * Handles touch on the bounding box on touch only.
   */
  const handleTouch = (e: React.TouchEvent) => {
    if (isLocked) return;
    e.stopPropagation();

    // Mark that touch was used
    touchUsedRef.current = Date.now();

    // On mobile, use double-tap logic
    const now = Date.now();
    const lastTap = lastTapRef.current;

    // Check for double-tap within 300ms on the same detection
    if (lastTap && now - lastTap.time < 300 && lastTap.detectionId === detection.id) {
      // Open panel when double-tap is detected
      onOpenPanel();
      lastTapRef.current = null;
    } else {
      // Select the detection without opening panel on single tap
      onSelect(detection.id, false);
      lastTapRef.current = { time: now, detectionId: detection.id };
    }
  };

  /**
   * Handles mouse/touch down to initiate dragging.
   */
  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (isLocked) return;
    // Initiates a drag operation only if the box is already selected.
    if (isSelected) {
      e.stopPropagation();
      const { clientX, clientY } = eventCoordinates(e);
      onStartDrag(detection.id, clientX, clientY);
    }
  };

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
          onClick={handleClick}
          onTouchEnd={handleTouch}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
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
          {detection.status === "user_confirmed" ||
          detection.status === "user_edited_confirmed" ||
          detection.confidence === null
            ? formatLabel(detection.label)
            : `${formatLabel(detection.label)}: ${formatConfidence(detection.confidence)}`}
        </p>
      </TooltipContent>
    </Tooltip>
  );
});

BoundingBoxItem.displayName = "BoundingBoxItem";
