"use client";

import Image from "next/image";
import { type ReactZoomPanPinchState } from "react-zoom-pan-pinch";

import { cn } from "@/lib/utils";

/**
 * Dimensions of the content and wrapper for calculating the minimap viewport.
 */
interface ViewingBox {
  content?: { width: number; height: number };
  wrapper?: { width: number; height: number };
}

interface ResultsImagesMinimapProps {
  /**
   * The URL of the image to display.
   */
  previewUrl: string;
  /**
   * The alt text for the minimap image.
   */
  alt: string;
  /**
   * The current transformation state from react-zoom-pan-pinch.
   */
  transformState: ReactZoomPanPinchState;
  /**
   * The calculated dimensions of the main image container.
   */
  viewingBox: ViewingBox;
}

/**
 * A minimap component that visualizes the current view of a larger, pannable image.
 * It displays a scaled-down version of the image and an overlay that represents
 * the currently visible area in the main `react-zoom-pan-pinch` component.
 *
 * @param {ResultsImagesMinimapProps} props The component props.
 * @returns A React component representing the minimap, or null if dimensions are not available.
 */
export const ResultsImagesMinimap = ({
  previewUrl,
  alt,
  transformState,
  viewingBox,
}: ResultsImagesMinimapProps) => {
  // Destructure the state and dimension props for easier access.
  const { scale, positionX, positionY } = transformState;
  const { content, wrapper } = viewingBox;

  // Render nothing if we don't have the dimensions yet.
  if (!content || !wrapper) {
    return null;
  }

  /**
   * Calculates the style for the viewport rectangle based on real dimensions.
   */
  const getViewportStyle = () => {
    // Total size of the pannable content.
    const scaledContentWidth = content.width * scale;
    const scaledContentHeight = content.height * scale;

    // The size of the viewport relative to the scaled content.
    const viewportWidth = (wrapper.width / scaledContentWidth) * 100;
    const viewportHeight = (wrapper.height / scaledContentHeight) * 100;

    // The position of the viewport, based on the pan.
    const viewportLeft = (-positionX / scaledContentWidth) * 100;
    const viewportTop = (-positionY / scaledContentHeight) * 100;

    return {
      width: `${viewportWidth}%`,
      height: `${viewportHeight}%`,
      left: `${viewportLeft}%`,
      top: `${viewportTop}%`,
    };
  };

  const viewportStyle = getViewportStyle();

  return (
    // The main container for the minimap interface.
    <div
      className={cn(
        "absolute right-8 bottom-4 z-10 h-32 w-32 overflow-hidden rounded-lg border-2 border-emerald-400 bg-slate-100/20 py-1 shadow-lg backdrop-blur-sm"
      )}
      aria-hidden="true"
    >
      {/* The background image is a scaled-down version of the main preview. */}
      <Image
        key={previewUrl}
        src={previewUrl}
        alt={alt}
        fill
        unoptimized
        className="object-contain"
        sizes="128px"
      />

      {/* The viewport overlay is only shown when the user has zoomed in. */}
      {scale > 1 && (
        <div
          // This div represents the area currently visible in the main viewport.
          className="absolute border-2 border-emerald-400 bg-emerald-400/20"
          style={viewportStyle}
        />
      )}
    </div>
  );
};

ResultsImagesMinimap.displayName = "ResultsImageMinimap";
