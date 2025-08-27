"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";
import { memo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { HiOutlineLockClosed, HiOutlineLockOpen } from "react-icons/hi2";
import { IoIosArrowRoundBack } from "react-icons/io";
import { LuChevronRight, LuLoaderCircle, LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";
import { PiFloppyDiskBack } from "react-icons/pi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  type DetectionChanges,
  type ModifiedDetection,
  type NewDetection,
  saveDetections,
} from "@/features/annotation/actions/save-detections";
import { shouldShowSaveConfirmation } from "@/features/annotation/components/save-confirmation-modal";
import { useAnnotatedData } from "@/features/annotation/hooks/use-annotated-data";
import { useNavigationGuard } from "@/features/annotation/hooks/use-navigation-guard";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";
import { type Detection } from "@/features/images/hooks/use-results-image-viewer";
import { KEYBOARD_SHORTCUTS } from "@/lib/constants";

// Dynamically import modal components
const SaveConfirmationModal = dynamic(
  () =>
    import("@/features/annotation/components/save-confirmation-modal").then(
      (module) => module.SaveConfirmationModal
    ),
  { ssr: false }
);

const UnsavedChangesModal = dynamic(
  () =>
    import("@/features/annotation/components/unsaved-changes-modal").then(
      (module) => module.UnsavedChangesModal
    ),
  { ssr: false }
);

/**
 * Helper function to calculate changes between current and original detections.
 */
const calculateChanges = (
  currentDetections: Detection[],
  originalDetections: Detection[],
  imageId: string
): DetectionChanges => {
  const originalMap = new Map(originalDetections.map((d) => [d.id, d]));
  const currentMap = new Map(currentDetections.map((d) => [d.id, d]));

  const added: NewDetection[] = currentDetections
    .filter((d) => !originalMap.has(d.id))
    .map((d) => ({
      uploadId: imageId,
      label: d.label,
      confidence: d.confidence,
      originalConfidence: d.originalConfidence,
      xMin: d.xMin,
      yMin: d.yMin,
      xMax: d.xMax,
      yMax: d.yMax,
      status: d.status as "user_created" | "user_confirmed" | "user_edited",
    }));

  const deleted: string[] = originalDetections
    .filter((d) => !currentMap.has(d.id))
    .map((d) => d.id);

  const modified: ModifiedDetection[] = currentDetections
    .filter((d) => {
      const original = originalMap.get(d.id);
      if (!original) return false;
      return (
        d.label !== original.label ||
        d.confidence !== original.confidence ||
        d.xMin !== original.xMin ||
        d.yMin !== original.yMin ||
        d.xMax !== original.xMax ||
        d.yMax !== original.yMax ||
        d.status !== original.status
      );
    })
    .map((d) => ({
      id: d.id,
      label: d.label,
      confidence: d.confidence,
      xMin: d.xMin,
      yMin: d.yMin,
      xMax: d.xMax,
      yMax: d.yMax,
      status: d.status,
    }));

  return { added, modified, deleted };
};

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
    const queryClient = useQueryClient();

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
    const hasChanges = useAnnotationStore((state) => state.hasChanges());
    const detections = useAnnotationStore((state) => state.detections);
    const originalDetections = useAnnotationStore((state) => state.originalDetections);
    const commitChanges = useAnnotationStore((state) => state.commitChanges);

    // Navigation guard hook
    const { hasUnsavedChanges } = useNavigationGuard({ detections, originalDetections });

    // State for modals and saving status
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [isUnsavedChangesModalOpen, setIsUnsavedChangesModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

    /** The index of the current image within the fetched `images` array. */
    const currentImageIndex = images.findIndex((img) => img.id === imageId);
    /** The 1-based position of the current image for display. */
    const currentPosition = currentImageIndex >= 0 ? currentImageIndex + 1 : 0;
    /** The name of the current image being viewed. */
    const currentImageName = currentImageIndex >= 0 ? images[currentImageIndex].name : "";

    /** Wraps navigation with unsaved changes check. */
    const guardedNavigation = (navigationFn: () => void) => {
      if (hasUnsavedChanges) {
        setPendingNavigation(() => navigationFn);
        setIsUnsavedChangesModalOpen(true);
      } else {
        navigationFn();
      }
    };

    /** Navigates the user back to the main results page for the current case. */
    const handleBackNavigation = () => {
      guardedNavigation(() => {
        router.push(`/results/${resultsId}` as `/results/${string}`);
      });
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
      guardedNavigation(() => {
        const previousImage = images[currentImageIndex - 1];
        router.push(
          `/results/${resultsId}/image/${previousImage.id}/edit` as `/results/${string}/image/${string}/edit`
        );
      });
    };

    /** Navigates to the next image in the sequence, if one exists. */
    const handleNextImage = () => {
      if (currentImageIndex >= totalImages - 1) return;
      guardedNavigation(() => {
        const nextImage = images[currentImageIndex + 1];
        router.push(
          `/results/${resultsId}/image/${nextImage.id}/edit` as `/results/${string}/image/${string}/edit`
        );
      });
    };

    /** Handles the save button click. Shows the modal or saves directly based on user preference. */
    const handleSaveClick = () => {
      if (shouldShowSaveConfirmation()) {
        setIsSaveModalOpen(true);
      } else {
        handleSave();
      }
    };

    /** Performs the actual save operation. */
    const handleSave = async () => {
      setIsSaving(true);

      try {
        const changes = calculateChanges(detections, originalDetections, imageId);

        if (
          changes.added.length === 0 &&
          changes.modified.length === 0 &&
          changes.deleted.length === 0
        ) {
          toast.info("No changes to save");
          setIsSaving(false);
          return;
        }

        const result = await saveDetections(imageId, resultsId, changes);

        if (result.success) {
          commitChanges();
          await queryClient.invalidateQueries({ queryKey: ["case", resultsId] });
          toast.success("Changes saved successfully.");
        } else {
          toast.error(result.error || "Failed to save changes.");
        }
      } catch (error) {
        console.error("Error saving detections:", error);
        toast.error("An unexpected error occurred while saving.");
      } finally {
        setIsSaving(false);
      }
    };

    /** Handles the unsaved changes modal proceed action. */
    const handleUnsavedChangesProceed = async (action: "leave" | "save-and-leave") => {
      if (action === "leave") {
        setIsUnsavedChangesModalOpen(false);
        if (pendingNavigation) {
          pendingNavigation();
          setPendingNavigation(null);
        }
        return;
      }

      if (action === "save-and-leave") {
        await handleSave();
        setIsUnsavedChangesModalOpen(false);
        if (pendingNavigation) {
          pendingNavigation();
          setPendingNavigation(null);
        }
      }
    };

    // Keyboard shortcuts for the header
    useHotkeys(KEYBOARD_SHORTCUTS.BACK_NAVIGATION, handleBackNavigation, {
      preventDefault: true,
    });

    useHotkeys(KEYBOARD_SHORTCUTS.PREVIOUS_IMAGE, handlePreviousImage, {
      enabled: currentImageIndex > 0,
      preventDefault: true,
    });

    useHotkeys(KEYBOARD_SHORTCUTS.NEXT_IMAGE, handleNextImage, {
      enabled: currentImageIndex < totalImages - 1,
      preventDefault: true,
    });

    useHotkeys(KEYBOARD_SHORTCUTS.TOGGLE_LOCK, handleToggleLock, {
      preventDefault: true,
    });

    useHotkeys(KEYBOARD_SHORTCUTS.SAVE, handleSaveClick, {
      enabled: hasChanges && !isSaving,
      preventDefault: true,
    });

    return (
      <>
        {/* The main sticky header container. */}
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
            <div className={!hasChanges || isSaving ? "cursor-not-allowed" : ""}>
              <Button
                variant="ghost"
                size="icon"
                disabled={!hasChanges || isSaving}
                onClick={handleSaveClick}
                aria-label="Save"
                className={`group h-8 w-8 bg-transparent focus:outline-none md:h-10 md:w-10 [&_svg]:!size-5 md:[&_svg]:!size-6 ${
                  hasChanges && !isSaving
                    ? "text-slate-100 hover:cursor-pointer hover:bg-transparent hover:text-slate-100"
                    : "cursor-not-allowed text-slate-100/30 hover:bg-transparent hover:text-slate-100/30"
                }`}
              >
                {isSaving ? (
                  <LuLoaderCircle className="animate-spin" />
                ) : (
                  <PiFloppyDiskBack
                    className={`transition-colors duration-200 ${hasChanges ? "group-hover:text-emerald-200" : ""}`}
                  />
                )}
              </Button>
            </div>
          </div>
        </header>

        {/* Save confirmation modal */}
        <SaveConfirmationModal
          imageName={currentImageName}
          isOpen={isSaveModalOpen}
          onOpenChange={setIsSaveModalOpen}
          onConfirm={handleSave}
        />

        {/* Unsaved changes modal */}
        <UnsavedChangesModal
          isOpen={isUnsavedChangesModalOpen}
          onOpenChange={setIsUnsavedChangesModalOpen}
          onProceed={handleUnsavedChangesProceed}
          isPending={isSaving}
        />
      </>
    );
  }
);

EditorHeader.displayName = "EditorHeader";
