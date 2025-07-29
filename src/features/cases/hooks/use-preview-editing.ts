import { useEffect, useRef, useState } from "react";

import { type UploadableFile } from "@/features/analyze/store/analyze-store";

/**
 * A custom hook that encapsulates all interface state related to editing a file in the preview modal.
 * It manages flags for renaming, saving, and deleting, and handles side effects like auto-focusing the input field.
 *
 * @param activeFile - The file currently being viewed. Used as a dependency to reset editing states.
 * @param isOpen - The visibility state of the parent modal, also used to trigger state resets.
 * @returns An object containing all editing-related states, a ref for the title input, and a name change handler.
 */
export const usePreviewEditing = (activeFile: UploadableFile | null, isOpen: boolean) => {
  /** A boolean to track if the file's name has been modified by the user. */
  const [isNameDirty, setIsNameDirty] = useState(false);
  /** A boolean to track the pending state of a save operation. */
  const [isSaving, setIsSaving] = useState(false);
  /** A boolean to track the pending state of a delete operation. */
  const [isDeleting, setIsDeleting] = useState(false);
  /** A boolean to toggle the UI between a static title and an editable input field. */
  const [isRenaming, setIsRenaming] = useState(false);
  /** A ref to directly access the DOM element of the title input for focusing and selecting. */
  const titleInputRef = useRef<HTMLInputElement>(null);

  /**
   * Resets all editing-related states to their default values whenever the active file
   * changes or the modal is re-opened. This ensures a clean state for each file
   * viewing session and prevents state from "leaking" between views.
   */
  useEffect(() => {
    if (activeFile) {
      setIsNameDirty(false);
      setIsSaving(false);
      setIsDeleting(false);
      setIsRenaming(false);
    }
  }, [activeFile, isOpen]);

  /**
   * Automatically focuses the title input field and selects its text when the user enters renaming mode.
   */
  useEffect(() => {
    if (isRenaming && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isRenaming]);

  /**
   * A generic handler for the `onChange` event of the file name input.
   * It updates the parent's file name state via the provided setter function and
   * sets the local `isNameDirty` flag to true.
   *
   * @param e The React change event from the input element.
   * @param setFileNameBase A state setter function passed from the consuming hook.
   */
  const handleNameChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFileNameBase: (name: string) => void
  ) => {
    setFileNameBase(e.target.value);
    // Mark the name as dirty on the first change to enable the "Save" button.
    if (!isNameDirty) setIsNameDirty(true);
  };

  // Exposes the state, ref, and handlers for the interface component to consume.
  return {
    isNameDirty,
    setIsNameDirty,
    isSaving,
    setIsSaving,
    isDeleting,
    setIsDeleting,
    isRenaming,
    setIsRenaming,
    titleInputRef,
    handleNameChange,
  };
};
