"use client";

import { useEffect, useRef, useState } from "react";

import { type detections } from "@/db/schema";
import { useRenderedImage } from "@/features/images/hooks/use-rendered-image";
import { useListNavigation } from "@/features/results/hooks/use-list-navigation";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Defines the shape of the viewing box data used for a minimap component.
 */
export interface ViewingBox {
  content?: { width: number; height: number };
  wrapper?: { width: number; height: number };
}
/**
 * Defines the TypeScript type for a single detection, inferred from the database schema.
 */
export type Detection = typeof detections.$inferSelect;
/**
 * Defines the client-side data structure for a single image file.
 */
export interface ImageFile {
  id: string;
  name: string;
  url: string;
  size: number;
  dateUploaded: Date;
  version: number;
  detections?: Detection[];
}

/**
 * Defines the props required by the useResultsImageViewer hook.
 */
interface UseResultsImageViewerProps {
  /** The image object passed from the parent component; null if no image is selected. */
  image: ImageFile | null;
  /** The full list of all available images for navigation purposes. */
  images: ImageFile[];
  /** The visibility state of the parent modal, used to trigger state resets. */
  isOpen: boolean;
}

/**
 * A smart orchestrator hook that composes multiple specialized hooks to manage all
 * state and logic for the results image viewer modal.
 *
 * @param {UseResultsImageViewerProps} props The props to configure the hook.
 * @returns A unified API of all state, refs, and derived data required by the `ResultsImagesModal` component.
 */
export const useResultsImageViewer = ({ image, images, isOpen }: UseResultsImageViewerProps) => {
  /** An internal state to track the currently active image, which is kept in sync with the `image` prop. */
  const [activeImage, setActiveImage] = useState<ImageFile | null>(image);
  /** A ref to the direct container of the image, passed to child hooks for DOM measurements. */
  const imageContainerRef = useRef<HTMLDivElement>(null);
  /** A custom hook to determine the current viewport for responsive logic. */
  const isMobile = useIsMobile();

  /**
   * Syncs the internal `activeImage` state with the `image` prop passed from the parent component.
   */
  useEffect(() => {
    setActiveImage(image);
  }, [image]);

  /**
   * Resets the `activeImage` to null when the modal is closed. This is a cleanup
   * step to ensure the modal doesn't briefly show the old image when re-opened.
   */
  useEffect(() => {
    if (!isOpen) {
      setActiveImage(null);
    }
  }, [isOpen]);

  /** A specialized hook to manage navigation logic (calculating `hasNext` and `hasPrevious`). */
  const { hasNext, hasPrevious } = useListNavigation(images, activeImage);

  /** A specialized hook to manage the complex logic of image loading and dimension calculation for overlays. */
  const { isImageLoaded, imageDimensions, renderedImageStyle } = useRenderedImage({
    imageUrl: activeImage ? `${activeImage.url}?v=${activeImage.version}` : null,
    containerRef: imageContainerRef,
  });

  // Exposes a single, unified API by aggregating all state and derived data from the constituent hooks.
  return {
    activeImage,
    isImageLoaded,
    imageDimensions,
    isMobile,
    imageContainerRef,
    renderedImageStyle,
    hasNext,
    hasPrevious,
  };
};
