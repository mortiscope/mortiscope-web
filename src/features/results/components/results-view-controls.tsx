import { motion, type Variants } from "framer-motion";
import React, { memo } from "react";
import { LuChevronLeft, LuChevronRight, LuFocus, LuZoomIn, LuZoomOut } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the results view controls component.
 */
interface ResultsViewControlsProps {
  /** A boolean to apply mobile-specific layouts and styling. */
  isMobile: boolean;
  /** A boolean to conditionally render the 'previous' navigation arrow. */
  hasPrevious: boolean;
  /** A boolean to conditionally render the 'next' navigation arrow. */
  hasNext: boolean;
  /** An optional callback to navigate to the previous file. */
  onPrevious?: () => void;
  /** An optional callback to navigate to the next file. */
  onNext?: () => void;
  /** A callback function to trigger a zoom-in action. */
  zoomIn: () => void;
  /** A callback function to trigger a zoom-out action. */
  zoomOut: () => void;
  /** A callback function to reset the pan and zoom to their default state. */
  resetTransform: () => void;
  /** A callback function to center the image within the view. */
  centerView: () => void;
  /** Framer Motion variants passed from the parent for container-level animations. */
  variants: Variants;
}

/**
 * A memoized component that renders the control bar for the results image previewer.
 * It provides interface for navigation, zooming, and panning, with distinct layouts for mobile and desktop.
 */
export const ResultsViewControls = memo(
  ({
    isMobile,
    hasPrevious,
    hasNext,
    onPrevious,
    onNext,
    zoomIn,
    zoomOut,
    resetTransform,
    centerView,
    variants,
  }: ResultsViewControlsProps) => {
    return (
      // The main animated container for the controls, adapting its position for mobile and desktop views.
      <motion.div
        variants={variants}
        className={cn(
          isMobile ? "absolute bottom-0 left-0 z-10 w-full" : "shrink-0 px-6 pt-0 pb-6 md:pt-4"
        )}
      >
        <DialogFooter
          className={cn(
            "flex-row items-center !justify-between",
            isMobile && "bg-black/75 px-2 py-4"
          )}
        >
          {/* Conditionally renders the previous navigation button. */}
          {hasPrevious ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={onPrevious}
                  aria-label="Previous image"
                  className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 md:hover:bg-amber-100 md:hover:text-amber-600"
                >
                  <LuChevronLeft className="!h-6 !w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">Previous</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="h-10 w-10" />
          )}
          {/* Container for the central view manipulation controls. */}
          <div className="flex flex-row items-center justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => zoomOut()}
                  aria-label="Zoom out"
                  className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 md:hover:bg-amber-100 md:hover:text-amber-600"
                >
                  <LuZoomOut className="!h-6 !w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">Zoom out</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => {
                    resetTransform();
                    centerView();
                  }}
                  aria-label="Center focus"
                  className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 md:hover:bg-amber-100 md:hover:text-amber-600"
                >
                  <LuFocus className="!h-6 !w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">Center focus</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => zoomIn()}
                  aria-label="Zoom in"
                  className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 md:hover:bg-amber-100 md:hover:text-amber-600"
                >
                  <LuZoomIn className="!h-6 !w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">Zoom in</p>
              </TooltipContent>
            </Tooltip>
          </div>
          {/* Conditionally renders the next navigation button, with a placeholder for layout consistency. */}
          {hasNext ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={onNext}
                  aria-label="Next image"
                  className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 md:hover:bg-amber-100 md:hover:text-amber-600"
                >
                  <LuChevronRight className="!h-6 !w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">Next</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="h-10 w-10" />
          )}
        </DialogFooter>
      </motion.div>
    );
  }
);

ResultsViewControls.displayName = "ResultsViewControls";
