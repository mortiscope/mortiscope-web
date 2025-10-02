import { memo } from "react";

import { type Detection } from "@/features/annotation/hooks/use-editor-image";
import { eventCoordinates } from "@/features/annotation/utils/event-coordinates";

/**
 * Defines the props for the bounding box handles component.
 */
interface BoundingBoxHandlesProps {
  /** The detection object for which handles are being rendered. */
  detection: Detection;
  /** The border width of the bounding box, used for handle positioning. */
  borderWidth: number;
  /** The current zoom scale, used directly for inverse scaling of handles. */
  zoomScale: number;
  /** Callback to initiate a resize operation. */
  onStartResize: (handle: string, clientX: number, clientY: number, detection: Detection) => void;
}

/**
 * A presentational component that renders resize handles for a selected bounding box.
 * Includes both corner handles (tl, tr, bl, br) and edge handles (t, r, b, l).
 *
 * @param {BoundingBoxHandlesProps} props The props for the component.
 * @returns A React component representing the resize handles.
 */
export const BoundingBoxHandles = memo(function BoundingBoxHandles({
  detection,
  zoomScale,
  onStartResize,
}: BoundingBoxHandlesProps) {
  // Define the visual thickness of the hit zone in screen pixels.
  const HIT_ZONE_SCREEN_SIZE = 20;

  // Calculate the physical size in the container's coordinate system.
  const zoneSize = HIT_ZONE_SCREEN_SIZE / zoomScale;
  const offset = zoneSize / 2;

  /**
   * Handles pointer down to initiate resize.
   */
  const handlePointerDown = (handle: string) => (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    const { clientX, clientY } = eventCoordinates(e);
    onStartResize(handle, clientX, clientY, detection);
  };

  /**
   * Base style for all interaction zones.
   */
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    zIndex: 20,
    backgroundColor: "transparent",
    touchAction: "none",
    userSelect: "none",
  };

  return (
    <>
      {/* Edge resize zones */}
      <div
        style={{
          ...baseStyle,
          top: -offset,
          left: 0,
          right: 0,
          height: zoneSize,
          cursor: "n-resize",
        }}
        onMouseDown={handlePointerDown("t")}
        onTouchStart={handlePointerDown("t")}
      />
      {/* Right: Full height, centered on right edge */}
      <div
        style={{
          ...baseStyle,
          top: 0,
          right: -offset,
          bottom: 0,
          width: zoneSize,
          cursor: "e-resize",
        }}
        onMouseDown={handlePointerDown("r")}
        onTouchStart={handlePointerDown("r")}
      />
      {/* Bottom: Full width, centered on bottom edge */}
      <div
        style={{
          ...baseStyle,
          bottom: -offset,
          left: 0,
          right: 0,
          height: zoneSize,
          cursor: "s-resize",
        }}
        onMouseDown={handlePointerDown("b")}
        onTouchStart={handlePointerDown("b")}
      />
      {/* Left: Full height, centered on left edge */}
      <div
        style={{
          ...baseStyle,
          top: 0,
          left: -offset,
          bottom: 0,
          width: zoneSize,
          cursor: "w-resize",
        }}
        onMouseDown={handlePointerDown("l")}
        onTouchStart={handlePointerDown("l")}
      />

      {/* Corner resize zones */}
      
      {/* Top Left */}
      <div
        style={{
          ...baseStyle,
          zIndex: 21,
          top: -offset,
          left: -offset,
          width: zoneSize,
          height: zoneSize,
          cursor: "nw-resize",
        }}
        onMouseDown={handlePointerDown("tl")}
        onTouchStart={handlePointerDown("tl")}
      />
      {/* Top Right */}
      <div
        style={{
          ...baseStyle,
          zIndex: 21,
          top: -offset,
          right: -offset,
          width: zoneSize,
          height: zoneSize,
          cursor: "ne-resize",
        }}
        onMouseDown={handlePointerDown("tr")}
        onTouchStart={handlePointerDown("tr")}
      />
      {/* Bottom Left */}
      <div
        style={{
          ...baseStyle,
          zIndex: 21,
          bottom: -offset,
          left: -offset,
          width: zoneSize,
          height: zoneSize,
          cursor: "sw-resize",
        }}
        onMouseDown={handlePointerDown("bl")}
        onTouchStart={handlePointerDown("bl")}
      />
      {/* Bottom Right */}
      <div
        style={{
          ...baseStyle,
          zIndex: 21,
          bottom: -offset,
          right: -offset,
          width: zoneSize,
          height: zoneSize,
          cursor: "se-resize",
        }}
        onMouseDown={handlePointerDown("br")}
        onTouchStart={handlePointerDown("br")}
      />
    </>
  );
});

BoundingBoxHandles.displayName = "BoundingBoxHandles";
