import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { useNavigationGuard } from "@/features/annotation/hooks/use-navigation-guard";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

/**
 * Custom hook for handling navigation in the annotation editor.
 * Manages navigation with unsaved changes guard and provides navigation handlers.
 */
export const useEditorNavigation = (
  resultsId: string,
  images: Array<{ id: string; name: string }>,
  currentImageIndex: number
) => {
  const router = useRouter();

  // Get store state and actions
  const isLocked = useAnnotationStore((state) => state.isLocked);
  const setIsLocked = useAnnotationStore((state) => state.setIsLocked);
  const clearSelection = useAnnotationStore((state) => state.clearSelection);
  const setDrawMode = useAnnotationStore((state) => state.setDrawMode);
  const setSelectMode = useAnnotationStore((state) => state.setSelectMode);
  const detections = useAnnotationStore((state) => state.detections);
  const originalDetections = useAnnotationStore((state) => state.originalDetections);

  // Navigation guard hook
  const { hasUnsavedChanges } = useNavigationGuard({ detections, originalDetections });

  // State for unsaved changes modal
  const [isUnsavedChangesModalOpen, setIsUnsavedChangesModalOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  /** Wraps navigation with unsaved changes check. */
  const guardedNavigation = useCallback(
    (navigationFn: () => void) => {
      if (hasUnsavedChanges) {
        setPendingNavigation(() => navigationFn);
        setIsUnsavedChangesModalOpen(true);
      } else {
        navigationFn();
      }
    },
    [hasUnsavedChanges]
  );

  /** Navigates the user back to the main results page for the current case. */
  const handleBackNavigation = useCallback(() => {
    guardedNavigation(() => {
      router.push(`/results/${resultsId}` as `/results/${string}`);
    });
  }, [guardedNavigation, router, resultsId]);

  /** Navigates to the previous image in the sequence, if one exists. */
  const handlePreviousImage = useCallback(() => {
    if (currentImageIndex <= 0) return;
    guardedNavigation(() => {
      const previousImage = images[currentImageIndex - 1];
      router.push(
        `/results/${resultsId}/image/${previousImage.id}/edit` as `/results/${string}/image/${string}/edit`
      );
    });
  }, [currentImageIndex, guardedNavigation, images, router, resultsId]);

  /** Navigates to the next image in the sequence, if one exists. */
  const handleNextImage = useCallback(() => {
    if (currentImageIndex >= images.length - 1) return;
    guardedNavigation(() => {
      const nextImage = images[currentImageIndex + 1];
      router.push(
        `/results/${resultsId}/image/${nextImage.id}/edit` as `/results/${string}/image/${string}/edit`
      );
    });
  }, [currentImageIndex, guardedNavigation, images, router, resultsId]);

  /** Toggles the lock state of the editor. */
  const handleToggleLock = useCallback(() => {
    const newLockedState = !isLocked;
    setIsLocked(newLockedState);

    // When locking, force pan mode
    if (newLockedState) {
      clearSelection();
      setDrawMode(false);
      setSelectMode(false);
    }
  }, [isLocked, setIsLocked, clearSelection, setDrawMode, setSelectMode]);

  return {
    isLocked,
    hasUnsavedChanges,
    isUnsavedChangesModalOpen,
    setIsUnsavedChangesModalOpen,
    pendingNavigation,
    setPendingNavigation,
    handleBackNavigation,
    handlePreviousImage,
    handleNextImage,
    handleToggleLock,
  };
};
