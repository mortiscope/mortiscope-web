import { motion } from "framer-motion";
import Image from "next/image";
import { forwardRef, memo, useRef } from "react";
import BeatLoader from "react-spinners/BeatLoader";
import {
  type ReactZoomPanPinchRef,
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";

import { EditorBoundingBox } from "@/features/annotation/components/editor-bounding-box";
import { type EditorImage } from "@/features/annotation/hooks/use-editor-image";
import { useImageDisplayState } from "@/features/annotation/hooks/use-image-display-state";
import { useImageDrawing } from "@/features/annotation/hooks/use-image-drawing";
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
 * A memoized smart container component that renders the main image viewing area for the annotation editor.
 * It displays a pannable/zoomable image with detection bounding boxes overlaid on top.
 */
export const EditorImageDisplay = memo(
  forwardRef<ReactZoomPanPinchRef, EditorImageDisplayProps>(({ image, onTransformed }, ref) => {
    const isMobile = useIsMobile();
    const imageContainerRef = useRef<HTMLDivElement>(null);

    // Use the image display state hook for state management
    const {
      clearSelection,
      detections,
      drawMode,
      selectMode,
      transformScale,
      viewMode,
      handleTransformed,
    } = useImageDisplayState({ image, onTransformed });

    // Presigned URLs include unique query parameters that serve as natural cache-busters.
    const imageUrl = image.url;

    // Use the rendered image hook to calculate dimensions and loading state.
    const { isImageLoaded, imageDimensions, renderedImageStyle } = useRenderedImage({
      imageUrl,
      containerRef: imageContainerRef,
    });

    // Use the image drawing hook for drawing functionality
    const {
      isDrawing,
      drawStart,
      drawCurrent,
      justFinishedDrawing,
      handleDrawStart,
      handleDrawMove,
      handleDrawEnd,
    } = useImageDrawing({
      imageId: image.id,
      drawMode,
      transformScale,
      imageDimensions,
      renderedImageStyle,
    });

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
          maxScale={100}
          centerOnInit
          limitToBounds={false}
          panning={{ disabled: drawMode || selectMode, velocityDisabled: false }}
          wheel={{ step: 0.08 }}
          doubleClick={{ mode: "reset" }}
          onTransformed={(ref, state) => {
            handleTransformed(ref, state);
            if (imageContainerRef.current) {
              imageContainerRef.current.style.setProperty("--zoom-scale", state.scale.toString());
            }
          }}
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
                // Initialize custom property to avoid calculation errors before first transform
                ["--zoom-scale" as string]: transformScale,
              }}
              onClick={(e) => {
                // Prevent click from bubbling to parent and clearing selection when in draw mode or just finished drawing
                if (drawMode || justFinishedDrawing.current) {
                  e.stopPropagation();
                }
              }}
              onMouseDown={handleDrawStart}
              onMouseMove={handleDrawMove}
              onMouseUp={handleDrawEnd}
              onTouchStart={handleDrawStart}
              onTouchMove={handleDrawMove}
              onTouchEnd={handleDrawEnd}
            >
              {/* Renders a loading spinner overlay while the image is being fetched. */}
              {!isImageLoaded && viewMode !== "annotations_only" && viewMode !== "none" && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <BeatLoader color="#059669" loading={true} size={12} aria-label="Loading image" />
                </div>
              )}
              {viewMode !== "annotations_only" && viewMode !== "none" && (
                <Image
                  key={imageUrl}
                  src={imageUrl}
                  alt={`Annotation view of ${image.name}`}
                  fill
                  className="object-contain"
                  sizes="100vw"
                  unoptimized
                  priority
                />
              )}
              {renderedImageStyle && isImageLoaded && (
                <div
                  className="pointer-events-none absolute"
                  style={{
                    width: `${renderedImageStyle.width}px`,
                    height: `${renderedImageStyle.height}px`,
                    top: `${renderedImageStyle.top}px`,
                    left: `${renderedImageStyle.left}px`,
                    boxShadow:
                      viewMode === "none" || viewMode === "annotations_only"
                        ? "inset 0 0 0 calc(2px / var(--zoom-scale)) #6ee7b7" // emerald-300
                        : "0 25px 50px -12px rgba(148, 163, 184, 0.15), 0 12px 24px -8px rgba(148, 163, 184, 0.1)",
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
                  className="pointer-events-none absolute border-emerald-400 bg-emerald-400/10"
                  style={{
                    left: Math.min(drawStart.x, drawCurrent.x) / transformScale,
                    top: Math.min(drawStart.y, drawCurrent.y) / transformScale,
                    width: Math.abs(drawCurrent.x - drawStart.x),
                    height: Math.abs(drawCurrent.y - drawStart.y),
                    transform: `scale(${1 / transformScale})`,
                    transformOrigin: "top left",
                    borderWidth: "2px",
                    borderStyle: "dashed",
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
