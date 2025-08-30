"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { memo } from "react";

import { Button } from "@/components/ui/button";

/**
 * Defines the props for the editor header navigation component.
 */
interface EditorHeaderNavigationProps {
  /** Handler for navigating to the previous image. */
  onPreviousImage: () => void;
  /** Handler for navigating to the next image. */
  onNextImage: () => void;
  /** The current image index (0-based). */
  currentImageIndex: number;
  /** The current image position (1-based) for display. */
  currentPosition: number;
  /** The total number of images. */
  totalImages: number;
}

/**
 * The center section of the editor header containing image navigation controls.
 */
export const EditorHeaderNavigation = memo(
  ({
    onPreviousImage,
    onNextImage,
    currentImageIndex,
    currentPosition,
    totalImages,
  }: EditorHeaderNavigationProps) => {
    return (
      <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
        {/* Previous image button */}
        <div className={currentImageIndex <= 0 ? "cursor-not-allowed" : ""}>
          <Button
            onClick={onPreviousImage}
            variant="ghost"
            size="icon"
            disabled={currentImageIndex <= 0}
            className="group h-8 w-8 bg-transparent text-white hover:cursor-pointer hover:bg-transparent hover:text-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:h-10 md:w-10 [&_svg]:!size-4 md:[&_svg]:!size-5"
            aria-label="Previous image"
          >
            <ChevronLeft className="transition-colors duration-200 group-hover:text-emerald-200" />
          </Button>
        </div>

        {/* Image position indicator */}
        <span className="font-plus-jakarta-sans min-w-[3rem] px-2 text-center text-sm font-medium text-slate-100 md:text-base">
          {currentPosition} / {totalImages}
        </span>

        {/* Next image button */}
        <div className={currentImageIndex >= totalImages - 1 ? "cursor-not-allowed" : ""}>
          <Button
            onClick={onNextImage}
            variant="ghost"
            size="icon"
            disabled={currentImageIndex >= totalImages - 1}
            className="group h-8 w-8 bg-transparent text-white hover:cursor-pointer hover:bg-transparent hover:text-white focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:h-10 md:w-10 [&_svg]:!size-4 md:[&_svg]:!size-5"
            aria-label="Next image"
          >
            <ChevronRight className="transition-colors duration-200 group-hover:text-emerald-200" />
          </Button>
        </div>
      </div>
    );
  }
);

EditorHeaderNavigation.displayName = "EditorHeaderNavigation";
