import { motion, type Variants } from "framer-motion";
import React, { memo } from "react";
import {
  LuChevronLeft,
  LuChevronRight,
  LuFocus,
  LuRefreshCw,
  LuZoomIn,
  LuZoomOut,
} from "react-icons/lu";
import { TbRotate } from "react-icons/tb";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the PreviewViewControls component.
 */
interface PreviewViewControlsProps {
  /** A boolean to apply mobile-specific layouts and styling. */
  isMobile: boolean;
  /** A boolean to conditionally render the 'previous' navigation arrow. */
  hasPrevious: boolean;
  /** A boolean to conditionally render the 'next' navigation arrow. */
  hasNext: boolean;
  /** A boolean to disable controls during a save operation. */
  isSaving: boolean;
  /** A boolean to disable controls during a delete operation. */
  isDeleting: boolean;
  /** Framer Motion variants passed from the parent for container-level animations. */
  variants: Variants;
  /** An optional callback to navigate to the previous file. */
  onPrevious?: () => void;
  /** An optional callback to navigate to the next file. */
  onNext?: () => void;
  /** A callback function to trigger a zoom-in action. */
  onZoomIn: () => void;
  /** A callback function to trigger a zoom-out action. */
  onZoomOut: () => void;
  /** A callback function to reset the pan and zoom to their default state. */
  onResetTransform: () => void;
  /** A callback function to center the image within the view. */
  onCenterView: () => void;
  /** A callback function to rotate the image. */
  onRotate: () => void;
}

/**
 * A memoized component that renders the control bar for the image previewer.
 * It provides interface for navigation, zooming, panning, and rotation, with distinct layouts for mobile and desktop.
 */
export const PreviewViewControls = memo(
  ({
    isMobile,
    hasPrevious,
    hasNext,
    isSaving,
    isDeleting,
    variants,
    onPrevious,
    onNext,
    onZoomIn,
    onZoomOut,
    onResetTransform,
    onCenterView,
    onRotate,
  }: PreviewViewControlsProps) => {
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
          {/* Conditionally renders the 'Previous' navigation button. */}
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
                  onClick={() => onZoomOut()}
                  aria-label="Zoom out"
                  className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 disabled:hover:bg-transparent md:hover:bg-amber-100 md:hover:text-amber-600"
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
                  onClick={onResetTransform}
                  aria-label="Reset view"
                  className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 disabled:hover:bg-transparent md:hover:bg-amber-100 md:hover:text-amber-600"
                >
                  <TbRotate className="!h-6 !w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">Reset view</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => onCenterView()}
                  aria-label="Center focus"
                  className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 disabled:hover:bg-transparent md:hover:bg-amber-100 md:hover:text-amber-600"
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
                  onClick={onRotate}
                  disabled={isSaving || isDeleting}
                  aria-label="Rotate image"
                  className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 disabled:hover:bg-transparent md:hover:bg-amber-100 md:hover:text-amber-600"
                >
                  <LuRefreshCw className="!h-6 !w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">Rotate</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={() => onZoomIn()}
                  aria-label="Zoom in"
                  className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 disabled:hover:bg-transparent md:hover:bg-amber-100 md:hover:text-amber-600"
                >
                  <LuZoomIn className="!h-6 !w-6" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">Zoom in</p>
              </TooltipContent>
            </Tooltip>
          </div>
          {/* Conditionally renders the 'Next' navigation button, with a placeholder for layout consistency. */}
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

PreviewViewControls.displayName = "PreviewViewControls";
