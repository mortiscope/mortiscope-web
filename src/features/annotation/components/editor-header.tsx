"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { memo, useCallback, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { EditorHeaderActions } from "@/features/annotation/components/editor-header-actions";
import { EditorHeaderContext } from "@/features/annotation/components/editor-header-context";
import { EditorHeaderNavigation } from "@/features/annotation/components/editor-header-navigation";
import { useAnnotatedData } from "@/features/annotation/hooks/use-annotated-data";
import { useEditorNavigation } from "@/features/annotation/hooks/use-editor-navigation";
import { useEditorSaveHandler } from "@/features/annotation/hooks/use-editor-save-handler";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";
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

const VerifiedStatusModal = dynamic(
  () =>
    import("@/features/annotation/components/verified-status-modal").then(
      (module) => module.VerifiedStatusModal
    ),
  { ssr: false }
);

const UnverifiedStatusModal = dynamic(
  () =>
    import("@/features/annotation/components/unverified-status-modal").then(
      (module) => module.UnverifiedStatusModal
    ),
  { ssr: false }
);

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
    const params = useParams();

    // Extract route parameters
    const resultsId = params.resultsId as string;
    const imageId = params.imageId as string;

    // Fetch case and image data
    const { caseName, images, totalImages } = useAnnotatedData(resultsId);

    // Get detections from store
    const detections = useAnnotationStore((state) => state.detections);

    // Calculate current image info
    const currentImageIndex = images.findIndex((img) => img.id === imageId);
    const currentPosition = currentImageIndex >= 0 ? currentImageIndex + 1 : 0;
    const currentImageName = currentImageIndex >= 0 ? images[currentImageIndex].name : "";

    /** Check if all detections in the current image are verified. */
    const isImageFullyVerified =
      detections.length > 0 &&
      detections.every((detection) => detection.status === "user_confirmed");

    // Use custom hooks for save and navigation logic
    const {
      isSaving,
      hasChanges,
      isSaveModalOpen,
      setIsSaveModalOpen,
      handleSave,
      handleSaveClick,
    } = useEditorSaveHandler(imageId, resultsId);

    const {
      isLocked,
      isUnsavedChangesModalOpen,
      setIsUnsavedChangesModalOpen,
      pendingNavigation,
      setPendingNavigation,
      handleBackNavigation,
      handlePreviousImage,
      handleNextImage,
      handleToggleLock,
    } = useEditorNavigation(resultsId, images, currentImageIndex);

    // State for verification status modals
    const [isVerifiedModalOpen, setIsVerifiedModalOpen] = useState(false);
    const [isUnverifiedModalOpen, setIsUnverifiedModalOpen] = useState(false);

    /** Handles clicking the verification status icon. */
    const handleVerificationClick = useCallback((isVerified: boolean) => {
      if (isVerified) {
        setIsVerifiedModalOpen(true);
      } else {
        setIsUnverifiedModalOpen(true);
      }
    }, []);

    /** Handles the unsaved changes modal proceed action. */
    const handleUnsavedChangesProceed = useCallback(
      async (action: "leave" | "save-and-leave") => {
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
      },
      [pendingNavigation, handleSave, setIsUnsavedChangesModalOpen, setPendingNavigation]
    );

    // Keyboard shortcuts
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
        {/* The main sticky header container */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 bg-emerald-900 px-4 md:h-20 md:px-6">
          {/* Left section - Context */}
          <EditorHeaderContext
            onBackNavigation={handleBackNavigation}
            isMobileSidebarOpen={isMobileSidebarOpen}
            onToggleMobileSidebar={onToggleMobileSidebar}
            hasOpenPanel={hasOpenPanel}
            caseName={caseName}
            currentImageName={currentImageName}
          />

          {/* Center section - Navigation */}
          <EditorHeaderNavigation
            onPreviousImage={handlePreviousImage}
            onNextImage={handleNextImage}
            currentImageIndex={currentImageIndex}
            currentPosition={currentPosition}
            totalImages={totalImages}
          />

          {/* Right section - Actions */}
          <EditorHeaderActions
            hasDetections={detections.length > 0}
            isImageFullyVerified={isImageFullyVerified}
            onVerificationClick={handleVerificationClick}
            isLocked={isLocked}
            onToggleLock={handleToggleLock}
            hasChanges={hasChanges}
            isSaving={isSaving}
            onSaveClick={handleSaveClick}
          />
        </header>

        {/* Modals */}
        <SaveConfirmationModal
          imageName={currentImageName}
          isOpen={isSaveModalOpen}
          onOpenChange={setIsSaveModalOpen}
          onConfirm={handleSave}
        />

        <UnsavedChangesModal
          isOpen={isUnsavedChangesModalOpen}
          onOpenChange={setIsUnsavedChangesModalOpen}
          onProceed={handleUnsavedChangesProceed}
          isPending={isSaving}
        />

        <VerifiedStatusModal isOpen={isVerifiedModalOpen} onOpenChange={setIsVerifiedModalOpen} />

        <UnverifiedStatusModal
          isOpen={isUnverifiedModalOpen}
          onOpenChange={setIsUnverifiedModalOpen}
        />
      </>
    );
  }
);

EditorHeader.displayName = "EditorHeader";
