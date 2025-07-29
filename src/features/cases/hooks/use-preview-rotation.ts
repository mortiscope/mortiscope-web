import { useEffect, useState } from "react";

import { type UploadableFile } from "@/features/analyze/store/analyze-store";

/**
 * A custom hook that encapsulates the logic for rotating an image within a preview modal.
 * It manages the rotation angle, tracks whether the rotation has been modified, and provides
 * handlers to manipulate the state.
 *
 * @param activeFile - The file currently being viewed. Used as a dependency to reset state.
 * @param isOpen - The open state of the preview modal. Also used as a dependency for state reset.
 * @returns An object containing the rotation state and handler functions.
 */
export const usePreviewRotation = (activeFile: UploadableFile | null, isOpen: boolean) => {
  // State to store the current rotation angle in degrees (0, 90, 180, 270).
  const [rotation, setRotation] = useState(0);
  // State to track if the user has modified the rotation from its default state.
  const [isRotationDirty, setIsRotationDirty] = useState(false);

  // Resets the rotation state to its default (0 degrees) whenever the active file
  // changes or the modal is re-opened. This ensures each image is initially viewed without rotation.
  useEffect(() => {
    if (activeFile) {
      setRotation(0);
      setIsRotationDirty(false);
    }
  }, [activeFile, isOpen]);

  /**
   * Cycles the rotation angle by 90 degrees and marks the state as dirty.
   */
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    setIsRotationDirty(true);
  };

  /**
   * Resets the rotation angle to 0 and clears the dirty flag.
   */
  const resetRotation = () => {
    setRotation(0);
    setIsRotationDirty(false);
  };

  return {
    rotation,
    isRotationDirty,
    setIsRotationDirty,
    handleRotate,
    resetRotation,
  };
};
