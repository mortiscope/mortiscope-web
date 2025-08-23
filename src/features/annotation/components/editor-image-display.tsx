import { motion } from "framer-motion";
import Image from "next/image";
import React, { memo, useRef } from "react";
import BeatLoader from "react-spinners/BeatLoader";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";

import { EditorBoundingBox } from "@/features/annotation/components/editor-bounding-box";
import { type EditorImage } from "@/features/annotation/hooks/use-editor-image";
import { useRenderedImage } from "@/features/images/hooks/use-rendered-image";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Defines the props required by the editor image display component.
 */
interface EditorImageDisplayProps {
  /** The image data to display, including detections. */
  image: EditorImage;
}

/**
 * A memoized component that renders the main image viewing area for the annotation editor.
 * It displays a pannable/zoomable image with detection bounding boxes overlaid on top.
 */
export const EditorImageDisplay = memo(({ image }: EditorImageDisplayProps) => {
  const isMobile = useIsMobile();
  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Append a cache-busting query parameter to ensure the latest image is shown.
  const imageUrl = `${image.url}?t=${image.dateUploaded.getTime()}`;

  // Use the rendered image hook to calculate dimensions and loading state.
  const { isImageLoaded, imageDimensions, renderedImageStyle } = useRenderedImage({
    imageUrl,
    containerRef: imageContainerRef,
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="relative flex h-[calc(100vh-4rem)] w-full cursor-grab items-center justify-center overflow-hidden md:h-[calc(100vh-5rem)]"
    >
      {/* This transform wrapper enables interactive panning and zooming. */}
      <TransformWrapper
        initialScale={1}
        minScale={0.1}
        maxScale={10}
        centerOnInit
        limitToBounds={false}
        panning={{ disabled: false, velocityDisabled: false }}
        wheel={{ step: 0.1 }}
        doubleClick={{ mode: "reset" }}
      >
        <TransformComponent
          wrapperClass="!w-full !h-full"
          contentClass="!w-full !h-full flex items-center justify-center"
        >
          {/* A relative container to hold the image and its overlays. */}
          <div
            ref={imageContainerRef}
            className={isMobile ? "relative h-full w-full" : "relative h-3/4 w-3/4"}
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
            {renderedImageStyle && isImageLoaded && imageDimensions && (
              <EditorBoundingBox
                image={image}
                imageDimensions={imageDimensions}
                renderedImageStyle={renderedImageStyle}
              />
            )}
          </div>
        </TransformComponent>
      </TransformWrapper>
    </motion.div>
  );
});

EditorImageDisplay.displayName = "EditorImageDisplay";
