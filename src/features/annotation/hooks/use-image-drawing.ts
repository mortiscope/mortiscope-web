import { useCallback, useRef, useState } from "react";

import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

/**
 * Defines the props for the image drawing hook.
 */
type UseImageDrawingProps = {
  /** The ID of the current image. */
  imageId: string;
  /** A boolean indicating if draw mode is active. */
  drawMode: boolean;
  /** The current transform scale (zoom level). */
  transformScale: number;
  /** The natural, original dimensions of the image file. */
  imageDimensions: { width: number; height: number } | null;
  /** The actual, on-screen dimensions and position of the displayed image. */
  renderedImageStyle: { width: number; height: number; top: number; left: number } | null;
};

/**
 * Custom hook for managing image drawing functionality.
 * Handles drawing state, mouse events, coordinate transformations, and detection creation.
 *
 * @param {UseImageDrawingProps} props The props for the hook.
 * @returns An object containing all state, actions, and handlers for drawing.
 */
export const useImageDrawing = ({
  imageId,
  drawMode,
  transformScale,
  imageDimensions,
  renderedImageStyle,
}: UseImageDrawingProps) => {
  // Store actions
  const addDetection = useAnnotationStore((state) => state.addDetection);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawCurrent, setDrawCurrent] = useState<{ x: number; y: number } | null>(null);
  const justFinishedDrawing = useRef(false);

  /** Handles the pointer down event (mouse or touch) to start drawing. */
  const handleDrawStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      if (!drawMode || !renderedImageStyle || !imageDimensions) return;
      e.stopPropagation();

      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      setIsDrawing(true);
      setDrawStart({ x, y });
      setDrawCurrent({ x, y });
    },
    [drawMode, renderedImageStyle, imageDimensions]
  );

  /** Handles the pointer move event (mouse or touch) to update the drawing preview. */
  const handleDrawMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      if (!isDrawing || !drawStart) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      setDrawCurrent({ x, y });
    },
    [isDrawing, drawStart]
  );

  /** Handles the pointer up event (mouse or touch) to complete drawing and create a detection. */
  const handleDrawEnd = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      if (!isDrawing || !drawStart || !drawCurrent || !renderedImageStyle || !imageDimensions)
        return;

      // Prevent event from bubbling up and triggering clear selection on parent
      e.stopPropagation();

      // Calculate box dimensions in container space
      const containerXMin = Math.min(drawStart.x, drawCurrent.x);
      const containerYMin = Math.min(drawStart.y, drawCurrent.y);
      const containerXMax = Math.max(drawStart.x, drawCurrent.x);
      const containerYMax = Math.max(drawStart.y, drawCurrent.y);

      // Check minimum size (20px)
      if (containerXMax - containerXMin < 20 || containerYMax - containerYMin < 20) {
        setIsDrawing(false);
        setDrawStart(null);
        setDrawCurrent(null);
        return;
      }

      // Convert from transformed space to untransformed space by dividing by zoom scale
      const untransformedXMin = containerXMin / transformScale;
      const untransformedYMin = containerYMin / transformScale;
      const untransformedXMax = containerXMax / transformScale;
      const untransformedYMax = containerYMax / transformScale;

      // Calculate relative position within the rendered image
      const relativeXMin = untransformedXMin - renderedImageStyle.left;
      const relativeYMin = untransformedYMin - renderedImageStyle.top;
      const relativeXMax = untransformedXMax - renderedImageStyle.left;
      const relativeYMax = untransformedYMax - renderedImageStyle.top;

      // Convert to actual image pixel coordinates
      const imageScaleX = imageDimensions.width / renderedImageStyle.width;
      const imageScaleY = imageDimensions.height / renderedImageStyle.height;

      let xMin = relativeXMin * imageScaleX;
      let yMin = relativeYMin * imageScaleY;
      let xMax = relativeXMax * imageScaleX;
      let yMax = relativeYMax * imageScaleY;

      // Clamp to image boundaries
      xMin = Math.max(0, Math.min(imageDimensions.width, xMin));
      yMin = Math.max(0, Math.min(imageDimensions.height, yMin));
      xMax = Math.max(0, Math.min(imageDimensions.width, xMax));
      yMax = Math.max(0, Math.min(imageDimensions.height, yMax));

      // Create new detection (auto-verified since user drew it)
      addDetection({
        uploadId: imageId,
        label: "adult",
        confidence: null,
        xMin,
        yMin,
        xMax,
        yMax,
        status: "user_confirmed",
        originalConfidence: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: "",
        lastModifiedById: null,
        deletedAt: null,
      });

      // Mark that the user just finished drawing to prevent clear selection
      justFinishedDrawing.current = true;
      setTimeout(() => {
        justFinishedDrawing.current = false;
      }, 100);

      // Reset drawing state
      setIsDrawing(false);
      setDrawStart(null);
      setDrawCurrent(null);
    },
    [
      isDrawing,
      drawStart,
      drawCurrent,
      renderedImageStyle,
      imageDimensions,
      transformScale,
      addDetection,
      imageId,
    ]
  );

  return {
    // Drawing state
    isDrawing,
    drawStart,
    drawCurrent,
    justFinishedDrawing,
    // Drawing handlers
    handleDrawStart,
    handleDrawMove,
    handleDrawEnd,
  };
};
