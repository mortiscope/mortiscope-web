"use client";

import { useEffect, useMemo, useState } from "react";

/**
 * Defines the props required by the use rendered image hook.
 */
interface UseRenderedImageProps {
  /** The URL of the image to be loaded and measured. */
  imageUrl: string | null | undefined;
  /** A ref to the direct container element of the image, which will be measured. */
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * A custom hook that encapsulates the complex logic of loading an image, measuring its
 * container, and calculating its final rendered dimensions and position. This is crucial
 * for accurately placing overlays (like bounding boxes) on an image that has been
 * scaled by the browser to fit its container (simulating `object-fit: contain`).
 *
 * @param {UseRenderedImageProps} props The props for the hook.
 * @returns An object containing the loading state, the image's natural dimensions, and the
 * calculated on-screen style for the image.
 */
export const useRenderedImage = ({ imageUrl, containerRef }: UseRenderedImageProps) => {
  /** Tracks the loading status of the image from the provided URL. */
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  /** Stores the natural (original) dimensions of the image file once it has been successfully loaded. */
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(
    null
  );
  /** Stores the on-screen dimensions of the container element, measured by a ResizeObserver. */
  const [containerDimensions, setContainerDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  /**
   * An effect to asynchronously load the image from the provided URL. It sets the loading
   * state and, upon successful load, captures the image's natural dimensions.
   */
  useEffect(() => {
    // If there is no URL, reset all state.
    if (!imageUrl) {
      setImageDimensions(null);
      setIsImageLoaded(false);
      return;
    }
    // Set loading to true when a new URL is provided.
    setIsImageLoaded(false);
    const img = new window.Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setIsImageLoaded(true);
    };
    img.onerror = () => setIsImageLoaded(false);
    img.src = imageUrl;
  }, [imageUrl]);

  /**
   * An effect to measure the dimensions of the image's container element using a `ResizeObserver`.
   */
  useEffect(() => {
    const element = containerRef.current;
    // Only attach the observer if the element exists and the image has finished loading.
    if (!element || !isImageLoaded) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Ensure we don't set dimensions of 0.
        if (width > 0 && height > 0) setContainerDimensions({ width, height });
      }
    });
    resizeObserver.observe(element);
    // Disconnect the observer when the component unmounts or dependencies change.
    return () => resizeObserver.disconnect();
  }, [containerRef, isImageLoaded]);

  /**
   * A memoized calculation to determine the final on-screen dimensions and position of the image.
   */
  const renderedImageStyle = useMemo(() => {
    if (!imageDimensions || !containerDimensions || !isImageLoaded) return null;
    const { width: naturalWidth, height: naturalHeight } = imageDimensions;
    const { width: containerWidth, height: containerHeight } = containerDimensions;
    // Guard against division by zero or invalid dimensions.
    if (naturalWidth <= 0 || naturalHeight <= 0 || containerWidth <= 0 || containerHeight <= 0)
      return null;

    const imageRatio = naturalWidth / naturalHeight;
    const containerRatio = containerWidth / containerHeight;

    let renderedWidth, renderedHeight, top, left;

    // Determine if the image is wider or taller than the container's aspect ratio.
    if (imageRatio > containerRatio) {
      // If image is wider, it will be constrained by the container's width ("letterboxed").
      renderedWidth = containerWidth;
      renderedHeight = containerWidth / imageRatio;
      top = (containerHeight - renderedHeight) / 2;
      left = 0;
    } else {
      // If the image is taller or same ratio, it will be constrained by the container's height ("pillarboxed").
      renderedHeight = containerHeight;
      renderedWidth = containerHeight * imageRatio;
      left = (containerWidth - renderedWidth) / 2;
      top = 0;
    }
    return { width: renderedWidth, height: renderedHeight, top, left };
  }, [imageDimensions, containerDimensions, isImageLoaded]);

  // Exposes the final calculated state for the consuming component.
  return {
    isImageLoaded,
    imageDimensions,
    renderedImageStyle,
  };
};
