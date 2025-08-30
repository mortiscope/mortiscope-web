import { memo } from "react";

import { type Detection } from "@/features/annotation/hooks/use-editor-image";

/**
 * Defines the props for the bounding box handles component.
 */
interface BoundingBoxHandlesProps {
  /** The detection object for which handles are being rendered. */
  detection: Detection;
  /** The border width of the bounding box, used for handle positioning. */
  borderWidth: number;
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
  borderWidth,
  onStartResize,
}: BoundingBoxHandlesProps) {
  const handleOffset = -(4 + borderWidth / 2);

  return (
    <>
      {/* Corner resize handles */}
      {["tl", "tr", "bl", "br"].map((handle) => (
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
            onStartResize(handle, e.clientX, e.clientY, detection);
          }}
        />
      ))}

      {/* Edge resize handles */}
      {["t", "r", "b", "l"].map((handle) => (
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
            onStartResize(handle, e.clientX, e.clientY, detection);
          }}
        />
      ))}
    </>
  );
});

BoundingBoxHandles.displayName = "BoundingBoxHandles";
