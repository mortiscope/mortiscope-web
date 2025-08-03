"use client";

import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { usePreviewActions } from "@/features/images/hooks/use-preview-actions";
import { usePreviewEditing } from "@/features/images/hooks/use-preview-editing";
import { usePreviewFileState } from "@/features/images/hooks/use-preview-file-state";
import { usePreviewImage } from "@/features/images/hooks/use-preview-image";
import { usePreviewNavigation } from "@/features/images/hooks/use-preview-navigation";
import { usePreviewRotation } from "@/features/images/hooks/use-preview-rotation";
import { usePreviewTransform } from "@/features/images/hooks/use-preview-transform";
import { useIsMobile } from "@/hooks/use-mobile";

// Re-exports the viewing box type for components that need it without importing the source hook.
export type { ViewingBox } from "@/features/images/hooks/use-preview-transform";

/**
 * Defines the props required by the usePreviewModal hook.
 */
interface UsePreviewModalProps {
  /** The file object to be displayed in the modal. Null if no file is selected. */
  file: UploadableFile | null;
  /** A boolean that controls the modal's visibility and triggers state resets in child hooks. */
  isOpen: boolean;
  /** A callback function to close the modal. */
  onClose: () => void;
  /** An optional callback to inform the parent component to navigate to the next file. */
  onNext?: () => void;
  /** An optional callback to inform the parent component to navigate to the previous file. */
  onPrevious?: () => void;
}

/**
 * A comprehensive orchestrator hook that combines all state and logic for the image preview modal.
 *
 * @param {UsePreviewModalProps} props The props to configure the hook.
 * @returns A unified API of all state and handlers required by the `UploadPreviewModal` component.
 */
export const usePreviewModal = ({
  file,
  isOpen,
  onNext,
  onPrevious,
  onClose,
}: UsePreviewModalProps) => {
  // Custom hook to determine the current viewport for responsive logic.
  const isMobile = useIsMobile();

  // Manages the core state of the currently active file, including its name and extension.
  const {
    activeFile,
    setActiveFile,
    fileNameBase,
    setFileNameBase,
    fileExtension,
    displayFileName,
    setDisplayFileName,
  } = usePreviewFileState({ file, isOpen });

  // Manages the generation of the preview URL and fetching the image's dimensions.
  const { previewUrl, imageDimensions } = usePreviewImage(activeFile);

  // Encapsulates all state and logic related to image rotation.
  const { rotation, isRotationDirty, setIsRotationDirty, handleRotate, resetRotation } =
    usePreviewRotation(activeFile, isOpen);

  // Handles all editing-related states like renaming status. It no longer manages isSaving/isDeleting.
  const {
    isNameDirty,
    setIsNameDirty,
    isRenaming,
    setIsRenaming,
    titleInputRef,
    handleNameChange: baseHandleNameChange,
  } = usePreviewEditing(activeFile, isOpen);

  // Manages the state for panning and zooming the image.
  const { transformState, setTransformState, viewingBox, setViewingBox } = usePreviewTransform(
    activeFile,
    isOpen
  );

  // Derives navigation state from the global store.
  const { sortedFiles, hasNext, hasPrevious } = usePreviewNavigation(activeFile);

  // Contains the implementation of server-side actions like save, delete, and download.
  const { save, remove, download, isSaving, isDeleting, renameMutation } = usePreviewActions({
    activeFile,
    previewUrl,
    rotation,
    isRotationDirty,
    newName: isNameDirty ? `${fileNameBase.trim()}.${fileExtension}` : null,
    onSuccess: () => {
      // After a successful save, the orchestrator is responsible for resetting its own UI state.
      setIsNameDirty(false);
      setIsRotationDirty(false);
      setIsRenaming(false);
      // Update the display name if it was changed.
      if (activeFile && isNameDirty) {
        setDisplayFileName(`${fileNameBase.trim()}.${fileExtension}`);
      }
    },
    onClose,
  });

  // A wrapper function to connect the generic `handleNameChange` from the editing hook.
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    baseHandleNameChange(e, setFileNameBase);
  };

  /**
   * A simplified save handler that only calls the decoupled save action if changes are pending.
   */
  const handleSave = () => {
    if (isNameDirty || isRotationDirty) {
      void save();
    }
  };

  // Exposes a single, unified API by aggregating all state and handlers from the constituent hooks.
  return {
    activeFile,
    setActiveFile,
    previewUrl,
    imageDimensions,
    rotation,
    isRotationDirty,
    isNameDirty,
    isSaving,
    isDeleting,
    isRenaming,
    setIsRenaming,
    fileNameBase,
    displayFileName,
    transformState,
    setTransformState,
    viewingBox,
    setViewingBox,
    titleInputRef,
    isMobile,
    sortedFiles,
    hasNext,
    hasPrevious,
    renameMutation,
    handleRotate,
    resetRotation,
    handleNameChange,
    handleSave,
    handleDelete: remove,
    handleDownload: download,
    onNext,
    onPrevious,
  };
};
