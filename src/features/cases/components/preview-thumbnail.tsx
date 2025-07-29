import { motion } from "framer-motion";
import Image from "next/image";
import React, { memo, useEffect, useState } from "react";

import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the preview thumbnail component.
 */
interface PreviewThumbnailProps {
  /** The file object containing the image data and metadata. */
  uploadableFile: UploadableFile;
  /** A callback function invoked when the thumbnail is clicked. */
  onClick: () => void;
  /** A boolean to indicate if this thumbnail is the currently active/viewed one. */
  isActive: boolean;
  /** A boolean to apply mobile-specific styling. */
  isMobile: boolean;
}

/**
 * A memoized thumbnail component for the preview modal, displaying an image from the list.
 * It highlights the currently active image and allows switching to it on click.
 */
export const PreviewThumbnail = memo(
  ({ uploadableFile, onClick, isActive, isMobile }: PreviewThumbnailProps) => {
    // State to hold the URL for the image preview, which can be remote or a local object URL.
    const [previewUrl, setPreviewUrl] = useState<string>("");

    /**
     * Generates the appropriate preview URL for the given file.
     * - For remote files with a `url`, it appends a version for cache busting.
     * - For local `File` objects, it creates a temporary object URL.
     * - It includes a crucial cleanup function to revoke the object URL and prevent memory leaks.
     */
    useEffect(() => {
      let objectUrl: string | undefined;
      if (uploadableFile.url) {
        const cacheBustedUrl = `${uploadableFile.url}?v=${uploadableFile.version}`;
        setPreviewUrl(cacheBustedUrl);
      } else if (uploadableFile.file) {
        objectUrl = URL.createObjectURL(uploadableFile.file);
        setPreviewUrl(objectUrl);
      }
      // Revokes the temporary object URL when the component unmounts or the dependency changes, preventing memory leaks.
      return () => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    }, [uploadableFile]);

    // Renders a skeleton loader while the preview URL is being generated.
    if (!previewUrl) {
      return (
        <div
          className={cn(
            "h-16 w-16 flex-shrink-0 animate-pulse rounded-lg",
            isMobile ? "bg-slate-800" : "bg-slate-200"
          )}
        />
      );
    }

    return (
      // The main animated container using Framer Motion for entry and exit effects.
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
            "h-full w-full cursor-pointer rounded-md transition-all duration-300 focus:outline-none disabled:cursor-default",
            // Desktop-specific styles
            !isMobile && [
              "ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500",
              isActive && "ring-offset-background ring-2 ring-emerald-500 ring-offset-2",
            ],
            // Mobile-specific styles
            isMobile && [
              "ring-2",
              isActive ? "ring-amber-400" : "ring-emerald-500",
              "focus-visible:ring-amber-400",
            ]
          )}
          aria-label={`View ${uploadableFile.name}`}
          // The button is disabled if it's already the active thumbnail to prevent redundant clicks.
          disabled={isActive}
        >
          <Image
            src={previewUrl}
            alt={`Thumbnail of ${uploadableFile.name}`}
            fill
            className="rounded-lg object-cover"
            sizes="64px"
          />
        </button>
      </motion.div>
    );
  }
);

PreviewThumbnail.displayName = "PreviewThumbnail";
