import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { saveDetections } from "@/features/annotation/actions/save-detections";
import { shouldShowSaveConfirmation } from "@/features/annotation/components/save-confirmation-modal";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";
import { calculateDetectionChanges } from "@/features/annotation/utils/calculate-detection-changes";

/**
 * Custom hook for handling save operations in the annotation editor.
 * Manages save state, modal visibility, and the actual save logic.
 */
export const useEditorSaveHandler = (imageId: string, resultsId: string) => {
  const queryClient = useQueryClient();

  // Get store state and actions
  const hasChanges = useAnnotationStore((state) => state.hasChanges());
  const detections = useAnnotationStore((state) => state.detections);
  const originalDetections = useAnnotationStore((state) => state.originalDetections);
  const commitChanges = useAnnotationStore((state) => state.commitChanges);

  // Local state for save operations
  const [isSaving, setIsSaving] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  /** Performs the actual save operation. */
  const handleSave = useCallback(async () => {
    setIsSaving(true);

    try {
      const changes = calculateDetectionChanges(detections, originalDetections, imageId);

      if (
        changes.added.length === 0 &&
        changes.modified.length === 0 &&
        changes.deleted.length === 0
      ) {
        setIsSaving(false);
        return;
      }

      const result = await saveDetections(imageId, resultsId, changes);

      if (result.success) {
        commitChanges();
        await queryClient.invalidateQueries({ queryKey: ["case", resultsId] });
      }
    } catch (error) {
      console.error("Error saving detections:", error);
    } finally {
      setIsSaving(false);
    }
  }, [detections, originalDetections, imageId, resultsId, commitChanges, queryClient]);

  /** Handles the save button click. Shows the modal or saves directly based on user preference. */
  const handleSaveClick = useCallback(() => {
    if (shouldShowSaveConfirmation()) {
      setIsSaveModalOpen(true);
    } else {
      handleSave();
    }
  }, [handleSave]);

  return {
    isSaving,
    hasChanges,
    isSaveModalOpen,
    setIsSaveModalOpen,
    handleSave,
    handleSaveClick,
  };
};
