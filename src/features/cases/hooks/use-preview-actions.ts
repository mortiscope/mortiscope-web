import { useMemo } from "react";
import { toast } from "sonner";

import { type UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { useClientFileProcessor } from "@/features/cases/hooks/use-client-file-processor";
import { usePreviewMutations } from "@/features/cases/hooks/use-preview-mutations";

/**
 * Defines the props required by the use preview actions hook.
 * It now receives data, not UI state setters.
 */
interface UsePreviewActionsProps {
  activeFile: UploadableFile | null;
  previewUrl: string;
  rotation: number;
  isRotationDirty: boolean;
  /** The new name for the file if it has changed, otherwise null. */
  newName: string | null;
  /** An optional callback to run on successful save, allowing the parent to reset its state. */
  onSuccess?: () => void;
  /** A callback to close the parent modal, used after a successful deletion. */
  onClose: () => void;
}

/**
 * A custom hook that centralizes the implementation of user actions like saving, deleting,
 * and downloading. It is decoupled from the parent's UI state management.
 */
export const usePreviewActions = ({
  activeFile,
  previewUrl,
  rotation,
  isRotationDirty,
  newName,
  onSuccess,
  onClose,
}: UsePreviewActionsProps) => {
  // Specialized hooks for logic and server communication
  const { ensureFileBlob, processRotation, downloadFile } = useClientFileProcessor();
  const { presignedUrlMutation, renameMutation, updateUploadMutation, deleteMutation } =
    usePreviewMutations();

  // Zustand store access
  const { caseId, updateFile, removeFile, setUploadStatus } = useAnalyzeStore();

  // The saving state is now derived directly from the pending status of the mutations.
  const isSaving = useMemo(
    () =>
      presignedUrlMutation.isPending || renameMutation.isPending || updateUploadMutation.isPending,
    [presignedUrlMutation.isPending, renameMutation.isPending, updateUploadMutation.isPending]
  );

  /**
   * The core logic for saving changes (rename and/or rotation) to a file.
   */
  const save = async () => {
    if (!activeFile || isSaving || deleteMutation.isPending) return;
    if (!caseId) {
      toast.error("Cannot save changes. Case ID is missing.");
      return;
    }

    setUploadStatus(activeFile.id, "uploading");

    try {
      // Ensure we have the file's binary data.
      let fileToProcess = await ensureFileBlob(activeFile);
      let key = activeFile.key;
      let url = activeFile.url;

      // Handle file rename if a new name is provided.
      if (newName) {
        if (!key) throw new Error("Cannot rename file: S3 key is missing.");
        const result = await renameMutation.mutateAsync({ oldKey: key, newFileName: newName });
        if (!result.success || !result.data)
          throw new Error(result.error || "Rename failed on server.");

        fileToProcess = new File([fileToProcess], newName, { type: fileToProcess.type });
        key = result.data.newKey;
        url = result.data.newUrl;
      }

      // Handle image rotation if necessary.
      if (isRotationDirty) {
        if (!key) throw new Error("Cannot save rotation: S3 key is missing.");
        const rotatedFile = await processRotation(fileToProcess, rotation);
        const presignResult = await presignedUrlMutation.mutateAsync({
          fileName: rotatedFile.name,
          fileType: rotatedFile.type,
          fileSize: rotatedFile.size,
          key,
          caseId,
        });
        if (!presignResult.success || !presignResult.data)
          throw new Error("Failed to prepare re-upload for rotated image.");

        const s3Response = await fetch(presignResult.data.url, {
          method: "PUT",
          body: rotatedFile,
        });
        if (!s3Response.ok) throw new Error("Failed to upload rotated image.");
        fileToProcess = rotatedFile;
      }

      // Update the file's metadata in the database.
      const updateDbResult = await updateUploadMutation.mutateAsync({
        id: activeFile.id,
        name: fileToProcess.name,
        size: fileToProcess.size,
        type: fileToProcess.type,
        key,
        url,
      });
      if (!updateDbResult.success)
        throw new Error(updateDbResult.error || "Failed to update file details in database.");

      // On complete success, update client state and notify the parent.
      updateFile(activeFile.id, fileToProcess);
      setUploadStatus(activeFile.id, "success");
      toast.success(`${fileToProcess.name} changes saved.`);
      onSuccess?.();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An unknown error occurred during save."
      );
      setUploadStatus(activeFile.id, "error");
    }
  };

  /**
   * Handles the deletion of the active file.
   */
  const remove = async () => {
    if (!activeFile || isSaving || deleteMutation.isPending) return;
    if (!activeFile.key) {
      removeFile(activeFile.id);
      toast.success(`${activeFile.name} removed.`);
      onClose();
      return;
    }
    await deleteMutation.mutateAsync(
      { key: activeFile.key },
      {
        onSuccess: (result) => {
          if (!result.success) {
            toast.error(result.error || "Failed to delete file on server.");
            return;
          }
          removeFile(activeFile.id);
          toast.success(`${activeFile.name} deleted successfully.`);
          onClose();
        },
        onError: (error) =>
          toast.error(error instanceof Error ? error.message : "Could not delete file."),
      }
    );
  };

  /**
   * Handles downloading the currently previewed file.
   */
  const download = () => {
    if (!activeFile) return;
    downloadFile(activeFile, previewUrl, rotation);
  };

  return {
    save,
    remove,
    download,
    isSaving,
    isDeleting: deleteMutation.isPending,
    renameMutation,
  };
};
