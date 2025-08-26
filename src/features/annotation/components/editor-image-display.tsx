import { motion } from "framer-motion";
import Image from "next/image";
import React, { forwardRef, memo, useRef } from "react";
import BeatLoader from "react-spinners/BeatLoader";
import {
  type ReactZoomPanPinchRef,
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";

import { EditorBoundingBox } from "@/features/annotation/components/editor-bounding-box";
import { type EditorImage } from "@/features/annotation/hooks/use-editor-image";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";
import { useRenderedImage } from "@/features/images/hooks/use-rendered-image";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Defines the props required by the editor image display component.
 */
interface EditorImageDisplayProps {
  /** The image data to display, including detections. */
  image: EditorImage;
  /** Optional callback fired when the transform state changes for minimap. */
  onTransformed?: (
    ref: ReactZoomPanPinchRef,
    state: { scale: number; positionX: number; positionY: number }
  ) => void;
}

/**
 * A memoized component that renders the main image viewing area for the annotation editor.
 * It displays a pannable/zoomable image with detection bounding boxes overlaid on top.
 */
export const EditorImageDisplay = memo(
  forwardRef<ReactZoomPanPinchRef, EditorImageDisplayProps>(({ image, onTransformed }, ref) => {
    const isMobile = useIsMobile();
    const imageContainerRef = useRef<HTMLDivElement>(null);
    const clearSelection = useAnnotationStore((state) => state.clearSelection);
    const setDetections = useAnnotationStore((state) => state.setDetections);
    const setTransformScale = useAnnotationStore((state) => state.setTransformScale);
    const allDetections = useAnnotationStore((state) => state.detections);
    const displayFilter = useAnnotationStore((state) => state.displayFilter);
    const drawMode = useAnnotationStore((state) => state.drawMode);
    const selectMode = useAnnotationStore((state) => state.selectMode);
    const addDetection = useAnnotationStore((state) => state.addDetection);
    const transformScale = useAnnotationStore((state) => state.transformScale);

    // Filter detections based on display filter
    const detections = React.useMemo(() => {
      if (displayFilter === "all") return allDetections;
      if (displayFilter === "verified")
        return allDetections.filter((det) => det.status === "user_confirmed");
      if (displayFilter === "unverified")
        return allDetections.filter((det) => det.status !== "user_confirmed");
      return allDetections;
    }, [allDetections, displayFilter]);

    // Drawing state
    const [isDrawing, setIsDrawing] = React.useState(false);
    const [drawStart, setDrawStart] = React.useState<{ x: number; y: number } | null>(null);
    const [drawCurrent, setDrawCurrent] = React.useState<{ x: number; y: number } | null>(null);
    const justFinishedDrawing = useRef(false);

    // Handle transform changes to track zoom scale
    const handleTransformed = React.useCallback(
      (
        ref: ReactZoomPanPinchRef,
        state: { scale: number; positionX: number; positionY: number }
      ) => {
        setTransformScale(state.scale);
        onTransformed?.(ref, state);
      },
      [setTransformScale, onTransformed]
    );

    // Append a cache-busting query parameter to ensure the latest image is shown.
    const imageUrl = `${image.url}?t=${image.dateUploaded.getTime()}`;

    // Use the rendered image hook to calculate dimensions and loading state.
    const { isImageLoaded, imageDimensions, renderedImageStyle } = useRenderedImage({
      imageUrl,
      containerRef: imageContainerRef,
    });

    // Initialize detections in store when image loads
    React.useEffect(() => {
      if (image.detections) {
        setDetections(image.detections);
      }
    }, [image.id, image.detections, setDetections]);

    // Drawing handlers
    const handleDrawMouseDown = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!drawMode || !renderedImageStyle || !imageDimensions) return;
        e.stopPropagation();

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setIsDrawing(true);
        setDrawStart({ x, y });
        setDrawCurrent({ x, y });
      },
      [drawMode, renderedImageStyle, imageDimensions]
    );

    const handleDrawMouseMove = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isDrawing || !drawStart) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        setDrawCurrent({ x, y });
      },
      [isDrawing, drawStart]
    );

    const handleDrawMouseUp = React.useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
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
          uploadId: image.id,
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
        image.id,
      ]
    );

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="relative z-0 flex h-[calc(100vh-4rem)] w-full cursor-grab items-center justify-center overflow-hidden md:h-[calc(100vh-5rem)]"
        onClick={clearSelection}
      >
        {/* This transform wrapper enables interactive panning and zooming. */}
        <TransformWrapper
          ref={ref}
          initialScale={1}
          minScale={0.1}
          maxScale={10}
          centerOnInit
          limitToBounds={false}
          panning={{ disabled: drawMode || selectMode, velocityDisabled: false }}
          wheel={{ step: 0.1 }}
          doubleClick={{ mode: "reset" }}
          onTransformed={handleTransformed}
        >
          <TransformComponent
            wrapperClass="!w-full !h-full"
            contentClass="!w-full !h-full flex items-center justify-center"
          >
            {/* A relative container to hold the image and its overlays. */}
            <div
              ref={imageContainerRef}
              className={isMobile ? "relative h-full w-full" : "relative h-3/4 w-3/4"}
              style={{
                cursor: drawMode ? "crosshair" : selectMode ? "default" : "grab",
              }}
              onClick={(e) => {
                // Prevent click from bubbling to parent and clearing selection when in draw mode or just finished drawing
                if (drawMode || justFinishedDrawing.current) {
                  e.stopPropagation();
                }
              }}
              onMouseDown={handleDrawMouseDown}
              onMouseMove={handleDrawMouseMove}
              onMouseUp={handleDrawMouseUp}
            >
              {/* Renders a loading spinner overlay while the image is being fetched. */}
              {!isImageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BeatLoader color="#059669" loading={true} size={12} aria-label="Loading image" />
                </div>
              )}
              <Image
                key={imageUrl}
                src={imageUrl}
                alt={`Annotation view of ${image.name}`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                priority
              />
              {renderedImageStyle && isImageLoaded && (
                <div
                  className="pointer-events-none absolute"
                  style={{
                    width: `${renderedImageStyle.width}px`,
                    height: `${renderedImageStyle.height}px`,
                    top: `${renderedImageStyle.top}px`,
                    left: `${renderedImageStyle.left}px`,
                    boxShadow:
                      "0 25px 50px -12px rgba(148, 163, 184, 0.15), 0 12px 24px -8px rgba(148, 163, 184, 0.1)",
                  }}
                />
              )}
              {/* Render bounding boxes once the image is loaded and dimensions are calculated. */}
              {renderedImageStyle && isImageLoaded && imageDimensions && detections.length > 0 && (
                <EditorBoundingBox
                  detections={detections}
                  imageDimensions={imageDimensions}
                  renderedImageStyle={renderedImageStyle}
                />
              )}

              {/* Render drawing preview box */}
              {isDrawing && drawStart && drawCurrent && (
                <div
                  className="pointer-events-none absolute border-2 border-dashed border-emerald-400 bg-emerald-400/10"
                  style={{
                    left: Math.min(drawStart.x, drawCurrent.x) / transformScale,
                    top: Math.min(drawStart.y, drawCurrent.y) / transformScale,
                    width: Math.abs(drawCurrent.x - drawStart.x) / transformScale,
                    height: Math.abs(drawCurrent.y - drawStart.y) / transformScale,
                  }}
                />
              )}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </motion.div>
    );
  })
);

EditorImageDisplay.displayName = "EditorImageDisplay";
