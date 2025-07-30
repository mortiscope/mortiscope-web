import { motion } from "framer-motion";
import Image from "next/image";
import React, { memo } from "react";

import { type ImageFile } from "@/features/results/hooks/use-results-image-viewer";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the ResultsThumbnail component.
 */
interface ResultsThumbnailProps {
  /** The image file object containing its URL, name, and other metadata. */
  imageFile: ImageFile;
  /** A callback function invoked when the thumbnail is clicked. */
  onClick: () => void;
  /** A boolean to indicate if this thumbnail is the currently active/viewed one. */
  isActive: boolean;
  /** A boolean to apply mobile-specific styling. */
  isMobile: boolean;
}

/**
 * A memoized thumbnail component for the preview modal, displaying an image from the list.
 * It highlights the currently active image and allows switching to it on click. Its entry and exit
 * are animated using Framer Motion.
 */
export const ResultsThumbnail = memo(
  ({ imageFile, onClick, isActive, isMobile }: ResultsThumbnailProps) => {
    // Appends a version query to the URL to bypass browser cache and ensure the latest image is shown.
    const previewUrl = `${imageFile.url}?v=${imageFile.version}`;

    // Renders a skeleton loader if the preview URL is not yet available.
    if (!previewUrl)
      return (
        <div
          className={cn(
            "h-16 w-16 flex-shrink-0 animate-pulse rounded-lg",
            isMobile ? "bg-slate-800" : "bg-slate-200"
          )}
        />
      );

    return (
      // The main animated container using Framer Motion for entry, exit, and layout change effects.
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "tween", duration: 0.4, ease: "easeInOut" }}
        className="relative h-16 w-16 flex-shrink-0"
      >
        <button
          onClick={onClick}
          // Applies complex conditional styling for active, focus, and mobile/desktop states.
          className={cn(
            "relative h-full w-full cursor-pointer rounded-md transition-all duration-300 focus:outline-none disabled:cursor-default",
            // Desktop-specific styles for focus and active states.
            !isMobile && [
              "ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500",
              isActive && "ring-offset-background ring-2 ring-emerald-500 ring-offset-2",
            ],
            // Mobile-specific styles for focus and active states.
            isMobile && [
              "ring-2",
              isActive ? "ring-amber-400" : "ring-emerald-500",
              "focus-visible:ring-amber-400",
            ]
          )}
          aria-label={`View ${imageFile.name}`}
          // The button is disabled if it's already the active thumbnail to prevent redundant clicks.
          disabled={isActive}
        >
          <Image
            src={previewUrl}
            alt={`Thumbnail of ${imageFile.name}`}
            fill
            className="rounded-lg object-cover"
            sizes="64px"
          />
        </button>
      </motion.div>
    );
  }
);

ResultsThumbnail.displayName = "ResultsThumbnail";
