"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { memo } from "react";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { IoIosArrowRoundBack } from "react-icons/io";
import { LuChevronRight, LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";
import { PiFloppyDiskBack } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { useAnnotatedData } from "@/features/annotation/hooks/use-annotated-data";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

/**
 * Defines the props for the editor header component.
 */
type EditorHeaderProps = {
  /** A boolean indicating if the mobile sidebar is currently open. */
  isMobileSidebarOpen: boolean;
  /** A callback function to toggle the visibility of the mobile sidebar. */
  onToggleMobileSidebar: () => void;
  /** A boolean indicating if any details panel is currently open. */
  hasOpenPanel: boolean;
};

/**
 * A smart presentational component that renders the main header for the annotation editor.
 * It manages navigation logic, derives its state from URL parameters and a custom data-fetching hook,
 * and provides controls for navigating back, toggling sidebars, and moving between images.
 */
export const EditorHeader = memo(
  ({ isMobileSidebarOpen, onToggleMobileSidebar, hasOpenPanel }: EditorHeaderProps) => {
    const router = useRouter();
    const params = useParams();

    // Extracts and types the `resultsId` and `imageId` from the URL parameters.
    const resultsId = params.resultsId as string;
    const imageId = params.imageId as string;

    // A hook to fetch all necessary data for the annotation context.
    const { caseName, images, totalImages } = useAnnotatedData(resultsId);

    // Get lock state and actions from store
    const isLocked = useAnnotationStore((state) => state.isLocked);
    const setIsLocked = useAnnotationStore((state) => state.setIsLocked);
    const clearSelection = useAnnotationStore((state) => state.clearSelection);
    const setDrawMode = useAnnotationStore((state) => state.setDrawMode);
    const setSelectMode = useAnnotationStore((state) => state.setSelectMode);

    /** The index of the current image within the fetched `images` array. */
    const currentImageIndex = images.findIndex((img) => img.id === imageId);
    /** The 1-based position of the current image for display. */
    const currentPosition = currentImageIndex >= 0 ? currentImageIndex + 1 : 0;
    /** The name of the current image being viewed. */
    const currentImageName = currentImageIndex >= 0 ? images[currentImageIndex].name : "";

    /** Navigates the user back to the main results page for the current case. */
    const handleBackNavigation = () => {
      router.push(`/results/${resultsId}` as `/results/${string}`);
    };

    /** Toggles the lock state of the editor. */
    const handleToggleLock = () => {
      const newLockedState = !isLocked;
      setIsLocked(newLockedState);

      // When locking, force pan mode
      if (newLockedState) {
        clearSelection();
        setDrawMode(false);
        setSelectMode(false);
      }
    };

    /** Navigates to the previous image in the sequence, if one exists. */
    const handlePreviousImage = () => {
      if (currentImageIndex <= 0) return;
      const previousImage = images[currentImageIndex - 1];
      router.push(
        `/results/${resultsId}/image/${previousImage.id}/edit` as `/results/${string}/image/${string}/edit`
      );
    };

    /** Navigates to the next image in the sequence, if one exists. */
    const handleNextImage = () => {
      if (currentImageIndex >= totalImages - 1) return;
      const nextImage = images[currentImageIndex + 1];
      router.push(
        `/results/${resultsId}/image/${nextImage.id}/edit` as `/results/${string}/image/${string}/edit`
      );
    };

    return (
      // The main sticky header container.
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 bg-emerald-900 px-4 md:h-20 md:px-6">
        {/* Left section */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {/* Back navigation button. */}
          <Button
            onClick={handleBackNavigation}
            variant="ghost"
            size="icon"
            className="group h-8 w-8 flex-shrink-0 bg-transparent text-white hover:cursor-pointer hover:bg-transparent hover:text-white focus:outline-none md:h-10 md:w-10 [&_svg]:!size-6 md:[&_svg]:!size-7"
            aria-label="Go back to results"
          >
            <IoIosArrowRoundBack className="transition-all duration-200 group-hover:-translate-x-1 group-hover:text-emerald-200" />
          </Button>

          {/* MORTISCOPE title, visible only on medium devices */}
          <span className="font-plus-jakarta-sans hidden text-2xl font-semibold md:block lg:hidden">
            <span className="text-amber-400">MORTI</span>
            <span className="text-white">SCOPE</span>
            <span className="text-amber-400">.</span>
          </span>

          {/* Mobile sidebar toggle button, hidden on medium screens and above. */}
          <div
            className={`flex-shrink-0 md:hidden ${hasOpenPanel && isMobileSidebarOpen ? "cursor-not-allowed" : "cursor-pointer"}`}
          >
            <div
              onClick={hasOpenPanel && isMobileSidebarOpen ? undefined : onToggleMobileSidebar}
              className={`text-white transition-colors ${hasOpenPanel && isMobileSidebarOpen ? "opacity-50" : "hover:text-emerald-300"}`}
              aria-label={isMobileSidebarOpen ? "Close sidebar" : "Open sidebar"}
              aria-disabled={hasOpenPanel && isMobileSidebarOpen}
            >
              {isMobileSidebarOpen ? (
                <LuPanelLeftClose className="h-6 w-6" strokeWidth={1.5} />
              ) : (
                <LuPanelLeftOpen className="h-6 w-6" strokeWidth={1.5} />
              )}
            </div>
          </div>

          {/* Breadcrumb-style title, visible on larger screens. */}
          <h1 className="font-inter flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-100 md:text-sm">
            <span className="hidden max-w-48 truncate lg:block xl:max-w-64" title={caseName}>
              {caseName}
            </span>
            {caseName && currentImageName && (
              <LuChevronRight className="hidden h-3.5 w-3.5 flex-shrink-0 text-slate-300 lg:block" />
            )}
            <span
              className="hidden max-w-48 truncate lg:block xl:max-w-64"
              title={currentImageName}
            >
              {currentImageName}
            </span>
          </h1>
        </div>

        {/* Center section */}
        <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2">
          {/* Previous image button */}
          <div className={currentImageIndex <= 0 ? "cursor-not-allowed" : ""}>
            <Button
              onClick={handlePreviousImage}
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

          {/* Next image button. */}
          <div className={currentImageIndex >= totalImages - 1 ? "cursor-not-allowed" : ""}>
            <Button
              onClick={handleNextImage}
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

        {/* Right section */}
        <div className="flex flex-shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleLock}
            aria-label={isLocked ? "Unlock editor" : "Lock editor"}
            className="group h-8 w-8 bg-transparent text-slate-100 hover:cursor-pointer hover:bg-transparent hover:text-slate-100 focus:outline-none md:h-10 md:w-10 [&_svg]:!size-5 md:[&_svg]:!size-6"
          >
            {isLocked ? (
              <HiOutlineLockClosed className="transition-colors duration-200 group-hover:text-amber-200" />
            ) : (
              <HiOutlineLockOpen className="transition-colors duration-200 group-hover:text-emerald-200" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Save"
            className="group h-8 w-8 bg-transparent text-slate-100 hover:cursor-pointer hover:bg-transparent hover:text-slate-100 focus:outline-none md:h-10 md:w-10 [&_svg]:!size-5 md:[&_svg]:!size-6"
          >
            <PiFloppyDiskBack className="transition-colors duration-200 group-hover:text-emerald-200" />
          </Button>
        </div>
      </header>
    );
  }
);

EditorHeader.displayName = "EditorHeader";
