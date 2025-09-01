"use client";

import { motion, type Variants } from "framer-motion";
import React, { memo, useMemo } from "react";
import { LuX } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { type ImageFile } from "@/features/images/hooks/use-results-image-viewer";
import { STATUS_CONFIG } from "@/lib/constants";
import { formatBytes } from "@/lib/utils";

/**
 * Defines the props for the results modal header component.
 */
interface ResultsModalHeaderProps {
  /** The currently active image file whose details are to be displayed. */
  activeImage: ImageFile;
  /** The natural dimensions of the image, or null if not yet loaded. */
  imageDimensions: { width: number; height: number } | null;
  /** A boolean to apply the mobile-specific layout. */
  isMobile: boolean;
  /** A callback function to close the modal. */
  onClose: () => void;
  /** Framer Motion variants for the entrance animation. */
  variants: Variants;
}

/**
 * A memoized component that renders the header for the results image modal.
 * It features two distinct layouts: a floating bar with a close button for mobile,
 * and a traditional header with file metadata for desktop.
 */
export const ResultsModalHeader = memo(
  ({ activeImage, imageDimensions, isMobile, onClose, variants }: ResultsModalHeaderProps) => {
    // Determine the verification status of the image
    const verificationStatus = useMemo(() => {
      const detections = activeImage.detections || [];
      const hasDetections = detections.length > 0;

      if (!hasDetections) {
        return "no_detections";
      }

      const unverifiedCount = detections.filter((d) => d.status === "model_generated").length;
      const totalCount = detections.length;

      if (unverifiedCount === 0) {
        return "verified";
      } else if (unverifiedCount === totalCount) {
        return "unverified";
      } else {
        return "in_progress";
      }
    }, [activeImage.detections]);

    // Get the icon and color from STATUS_CONFIG
    const statusConfig = STATUS_CONFIG[verificationStatus];
    const StatusIcon = statusConfig.icon;

    // Renders a floating bar at the top of the screen containing the title and a close button.
    if (isMobile) {
      return (
        <>
          <DialogTitle className="sr-only">{activeImage.name}</DialogTitle>
          {/* The main animated container for the floating header. */}
          <motion.div
            variants={variants}
            className="absolute top-0 right-0 left-0 z-20 flex items-center justify-between gap-4 rounded-none bg-emerald-600/80 p-4 shadow-lg backdrop-blur-sm"
          >
            {/* File name section with verification indicator. */}
            <div className="min-w-0 flex-grow">
              <div className="flex items-center gap-2">
                <StatusIcon className="h-5 w-5 flex-shrink-0 text-white" />
                <h2 className="font-plus-jakarta-sans truncate text-lg font-semibold text-white">
                  {activeImage.name}
                </h2>
              </div>
            </div>
            {/* Close button section. */}
            <div className="flex flex-shrink-0 items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200"
                aria-label="Close"
              >
                <LuX className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        </>
      );
    }

    // Renders a standard dialog header with the file title and metadata.
    return (
      <motion.div variants={variants} className="px-6 pt-0 pb-0 md:pt-6">
        <DialogHeader>
          <DialogTitle
            className={`font-plus-jakarta-sans mx-auto flex w-full max-w-sm items-center justify-center gap-2 text-center text-xl font-bold md:max-w-md md:text-2xl ${
              verificationStatus === "verified"
                ? "text-emerald-600"
                : verificationStatus === "in_progress"
                  ? "text-sky-600"
                  : verificationStatus === "unverified"
                    ? "text-amber-500"
                    : "text-rose-500"
            }`}
          >
            <StatusIcon className="h-5 w-5 flex-shrink-0 md:h-6 md:w-6" />
            <span className="min-w-0 truncate">{activeImage.name}</span>
          </DialogTitle>
          {/* Renders file metadata (date, dimensions, size). */}
          <DialogDescription className="font-inter flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-slate-600">
            <span>{new Date(activeImage.dateUploaded).toLocaleDateString()}</span>
            {imageDimensions && (
              <>
                <span className="hidden text-slate-400 sm:inline">•</span>
                <span>
                  {imageDimensions.width} x {imageDimensions.height}
                </span>
              </>
            )}
            <span className="hidden text-slate-400 sm:inline">•</span>
            <span>{formatBytes(activeImage.size)}</span>
          </DialogDescription>
        </DialogHeader>
      </motion.div>
    );
  }
);

ResultsModalHeader.displayName = "ResultsModalHeader";
