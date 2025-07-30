import { motion, type Variants } from "framer-motion";
import Image from "next/image";
import React, { memo } from "react";
import { LuLoaderCircle } from "react-icons/lu";
import { type ReactZoomPanPinchState, TransformComponent } from "react-zoom-pan-pinch";

import { ResultsBoundingBox } from "@/features/results/components/results-bounding-box";
import { ResultsImagesMinimap } from "@/features/results/components/results-images-minimap";
import { type ImageFile, type ViewingBox } from "@/features/results/hooks/use-results-image-viewer";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the results image viewer component.
 */
interface ResultsImageViewerProps {
  /** The currently active image file to display. */
  activeImage: ImageFile;
  /** A boolean indicating if the main image has finished loading. */
  isImageLoaded: boolean;
  /** A ref forwarded to the direct container of the image, used to calculate its on-screen dimensions. */
  imageContainerRef: React.Ref<HTMLDivElement>;
  /** The natural, original dimensions of the image file. */
  imageDimensions: { width: number; height: number } | null;
  /** The calculated on-screen dimensions and position of the displayed image, used for overlays. */
  renderedImageStyle: { width: number; height: number; top: number; left: number } | null;
  /** A boolean to apply mobile-specific layouts. */
  isMobile: boolean;
  /** The current pan/zoom state from `react-zoom-pan-pinch`. */
  transformState: ReactZoomPanPinchState;
  /** The viewing box data for the minimap. */
  viewingBox: ViewingBox;
  /** Framer Motion variants for container animations. */
  variants: Variants;
}

/**
 * A memoized component that renders the main interactive image viewing area. It orchestrates
 * the display of the pannable/zoomable image, the detection bounding boxes overlay, and the
 * navigation minimap, while also handling the image loading state.
 */
export const ResultsImageViewer = memo(
  ({
    activeImage,
    isImageLoaded,
    imageContainerRef,
    imageDimensions,
    renderedImageStyle,
    isMobile,
    transformState,
    viewingBox,
    variants,
  }: ResultsImageViewerProps) => {
    // Appends a version query to the URL to bypass browser cache and ensure the latest image is shown.
    const imageUrl = `${activeImage.url}?v=${activeImage.version}`;

    return (
      // The main animated container for the image viewer.
      <motion.div
        variants={variants}
        className={cn(
          "relative w-full cursor-grab overflow-hidden",
          isMobile ? "flex-grow" : "mt-2 h-96 px-6"
        )}
      >
        {/* The content that will be transformed (panned/zoomed) by the parent. */}
        <TransformComponent
          wrapperClass={cn("!w-full !h-full", !isMobile && "bg-slate-100 rounded-2xl")}
          contentClass="!w-full !h-full flex items-center justify-center"
        >
          {/* A relative container to hold the image and its overlays. */}
          <div ref={imageContainerRef} className="relative h-full w-full">
            {/* Renders a loading spinner overlay while the image is being fetched. */}
            {!isImageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-100">
                <LuLoaderCircle className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            )}
            <Image
              key={imageUrl}
              src={imageUrl}
              alt={`Preview of ${activeImage.name}`}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, 560px"
              priority
            />
            {renderedImageStyle && isImageLoaded && imageDimensions && (
              <ResultsBoundingBox
                imageFile={activeImage}
                imageDimensions={imageDimensions}
                renderedImageStyle={renderedImageStyle}
              />
            )}
          </div>
        </TransformComponent>
        {/* Renders the minimap for navigation. */}
        {!isMobile && isImageLoaded && (
          <ResultsImagesMinimap
            previewUrl={imageUrl}
            alt={`Minimap preview of ${activeImage.name}`}
            transformState={transformState}
            viewingBox={viewingBox}
          />
        )}
      </motion.div>
    );
  }
);

ResultsImageViewer.displayName = "ResultsImageViewer";
