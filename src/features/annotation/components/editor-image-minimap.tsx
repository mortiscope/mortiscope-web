"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { type ReactZoomPanPinchState } from "react-zoom-pan-pinch";

/**
 * Dimensions of the content and wrapper for calculating the minimap viewport.
 */
interface ViewingBox {
  content?: { width: number; height: number };
  wrapper?: { width: number; height: number };
}

interface EditorImageMinimapProps {
  /**
   * The URL of the image to display.
   */
  imageUrl: string;
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
  /**
   * A boolean indicating if any details panel is currently open.
   */
  hasOpenPanel: boolean;
}

/**
 * A minimap component that visualizes the current view of a larger, pannable image.
 * It displays a scaled-down version of the image and an overlay that represents
 * the currently visible area in the main `react-zoom-pan-pinch` component.
 *
 * @param {EditorImageMinimapProps} props The component props.
 * @returns A React component representing the minimap, or null if dimensions are not available.
 */
export const EditorImageMinimap = ({
  imageUrl,
  alt,
  transformState,
  viewingBox,
}: EditorImageMinimapProps) => {
  // Destructure the state and dimension props for easier access.
  const { scale, positionX, positionY } = transformState;
  const { content, wrapper } = viewingBox;

  // Render nothing if there is no dimensions yet.
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      className="fixed top-[calc(50%+12.5rem)] right-[64px] z-[5] h-24 w-24 -translate-y-1/2 overflow-hidden rounded-lg border-2 border-emerald-400 bg-slate-100/20 py-1 shadow-lg backdrop-blur-sm md:top-[calc(50%+15rem)] md:right-[80px] md:z-40 md:h-32 md:w-32 md:rounded-2xl"
      aria-label="Image minimap"
    >
      {/* The background image is a scaled-down version of the main preview. */}
      <Image
        key={imageUrl}
        src={imageUrl}
        alt={alt}
        fill
        className="pointer-events-none object-contain"
        sizes="(max-width: 768px) 96px, 128px"
      />

      {/* The viewport overlay is only shown when the user has zoomed in. */}
      {scale > 1 && (
        <div
          // This div represents the area currently visible in the main viewport.
          className="pointer-events-none absolute border-2 border-emerald-400 bg-emerald-400/20"
          style={viewportStyle}
        />
      )}
    </motion.div>
  );
};

EditorImageMinimap.displayName = "EditorImageMinimap";
