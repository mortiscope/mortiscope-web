import { useCallback, useEffect, useState } from "react";

import { type Detection } from "@/features/annotation/hooks/use-editor-image";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

/**
 * Custom hook for managing detection panel state and behavior.
 * Handles detection selection, updates, verification, and deletion.
 *
 * @returns An object containing all state, actions, and handlers for the detection panel.
 */
export const useDetectionPanel = () => {
  // Retrieves state and actions from the global `useAnnotationStore`.
  const selectedDetectionId = useAnnotationStore((state) => state.selectedDetectionId);
  const detections = useAnnotationStore((state) => state.detections);
  const updateDetection = useAnnotationStore((state) => state.updateDetection);
  const removeDetection = useAnnotationStore((state) => state.removeDetection);
  const clearSelection = useAnnotationStore((state) => state.clearSelection);
  const setSelectMode = useAnnotationStore((state) => state.setSelectMode);

  // Finds the full object for the currently selected detection.
  const currentDetection = detections.find((det) => det.id === selectedDetectionId);

  // A local state to hold a snapshot of the detection being displayed.
  const [displayedDetection, setDisplayedDetection] = useState<Detection | undefined>(
    currentDetection
  );

  /** A side effect to update the local `displayedDetection` when the global selection changes. */
  useEffect(() => {
    if (currentDetection) {
      setDisplayedDetection(currentDetection);
    }
  }, [currentDetection]);

  /** Handles changes to the class label via the radio group. */
  const handleLabelChange = useCallback(
    (newLabel: string) => {
      if (selectedDetectionId) {
        updateDetection(selectedDetectionId, { label: newLabel });
      }
    },
    [selectedDetectionId, updateDetection]
  );

  /** Sets the detection's status to `user_confirmed`. */
  const handleVerify = useCallback(() => {
    if (selectedDetectionId) {
      updateDetection(selectedDetectionId, { status: "user_confirmed" });
    }
  }, [selectedDetectionId, updateDetection]);

  /** Removes the currently selected detection from the store. */
  const handleDelete = useCallback(() => {
    if (selectedDetectionId) {
      removeDetection(selectedDetectionId);
    }
  }, [selectedDetectionId, removeDetection]);

  /** Handles closing the panel (for mobile sheet). */
  const handleClose = useCallback(() => {
    clearSelection();
    setSelectMode(false);
  }, [clearSelection, setSelectMode]);

  return {
    selectedDetectionId,
    displayedDetection,
    handleLabelChange,
    handleVerify,
    handleDelete,
    handleClose,
  };
};
