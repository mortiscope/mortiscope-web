import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { createUpload } from "@/features/upload/actions/create-upload";
import { deleteUpload } from "@/features/upload/actions/delete-upload";
import { renameUpload } from "@/features/upload/actions/rename-upload";
import { updateUpload } from "@/features/upload/actions/update-upload";

/**
 * A custom hook that encapsulates all TanStack Query mutations for the preview modal.
 * It provides a consistent interface for performing asynchronous server-side actions like
 * creating presigned URLs, renaming, updating, and deleting files.
 *
 * @returns An object containing the initialized mutation hooks for use in UI components.
 */
export const usePreviewMutations = () => {
  // Retrieves file data and updater functions from the global `useAnalyzeStore`.
  const allFiles = useAnalyzeStore((state) => state.data.files);
  const setUploadKey = useAnalyzeStore((state) => state.setUploadKey);
  const setUploadUrl = useAnalyzeStore((state) => state.setUploadUrl);

  /**
   * Initializes a mutation for creating a presigned URL for a new upload.
   * This is typically the first step in the upload process.
   */
  const presignedUrlMutation = useMutation({ mutationFn: createUpload });

  /**
   * Initializes a mutation for renaming a file on the server.
   */
  const renameMutation = useMutation({
    mutationFn: renameUpload,
    onSuccess: (data, variables) => {
      // Handle potential server-side errors returned in the success payload.
      if (!data.success || !data.data) {
        toast.error(data.error || "Server-side rename failed.");
        return;
      }
      // Find the corresponding file in the local Zustand store.
      const fileToUpdate = allFiles.find((f) => f.key === variables.oldKey);
      if (fileToUpdate) {
        // Update the file's `key` and `url` in the store to reflect the changes from the server.
        setUploadKey(fileToUpdate.id, data.data.newKey);
        setUploadUrl(fileToUpdate.id, data.data.newUrl);
      }
    },
  });

  /**
   * Initializes a mutation for updating a file's metadata.
   */
  const updateUploadMutation = useMutation({ mutationFn: updateUpload });
  /**
   * Initializes a mutation for deleting a file from server-side storage.
   */
  const deleteMutation = useMutation({ mutationFn: deleteUpload });

  // Exposes the initialized mutation hooks for consumption by interface components.
  return {
    presignedUrlMutation,
    renameMutation,
    updateUploadMutation,
    deleteMutation,
  };
};
