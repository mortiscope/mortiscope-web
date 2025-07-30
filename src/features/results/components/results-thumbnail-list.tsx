import { AnimatePresence, motion, type Variants } from "framer-motion";
import React, { memo, useLayoutEffect, useRef } from "react";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ResultsThumbnail } from "@/features/results/components/results-thumbnail";
import { type ImageFile } from "@/features/results/hooks/use-results-image-viewer";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the ResultsThumbnailList component.
 */
interface ResultsThumbnailListProps {
  /** The full, sorted array of images to be displayed as thumbnails. */
  images: ImageFile[];
  /** The currently active image, used to highlight the correct thumbnail and trigger scroll restoration. */
  activeImage: ImageFile;
  /** A boolean to apply mobile-specific layout and styling. */
  isMobile: boolean;
  /** An optional callback function invoked when a thumbnail is clicked to select a new image. */
  onSelectImage?: (imageId: string) => void;
  /** Framer Motion variants passed from the parent for container-level animations. */
  variants: Variants;
}

/**
 * A memoized component that displays a scrollable, animated row of all image thumbnails.
 * A key feature is its ability to preserve the horizontal scroll position when the active
 * image changes, providing a seamless navigation experience for the user.
 */
export const ResultsThumbnailList = memo(
  ({ images, activeImage, isMobile, onSelectImage, variants }: ResultsThumbnailListProps) => {
    // A ref to hold a reference to the scrollable container div.
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    // A ref to store the last known scroll position.
    const lastScrollPosition = useRef(0);

    /**
     * A `useLayoutEffect` hook to restore the scroll position.
     */
    useLayoutEffect(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = lastScrollPosition.current;
      }
    }, [activeImage]);

    return (
      // The main animated container for the entire thumbnail strip.
      <motion.div
        variants={variants}
        className={cn(
          "shrink-0",
          isMobile ? "absolute bottom-[88px] left-0 z-10 w-full px-4" : "px-6 pt-2"
        )}
      >
        <ScrollArea className="w-full whitespace-nowrap">
          <div
            ref={scrollContainerRef}
            onScroll={(e) => {
              lastScrollPosition.current = e.currentTarget.scrollLeft;
            }}
            className="flex w-max space-x-4 p-3"
          >
            {/* Enables exit animations for individual thumbnails when they are removed. */}
            <AnimatePresence>
              {images.map((img) => (
                <ResultsThumbnail
                  key={img.id}
                  imageFile={img}
                  isActive={img.id === activeImage.id}
                  isMobile={isMobile}
                  onClick={() => onSelectImage?.(img.id)}
                />
              ))}
            </AnimatePresence>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </motion.div>
    );
  }
);

ResultsThumbnailList.displayName = "ResultsThumbnailList";
