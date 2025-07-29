import { toast } from "sonner";

import { type UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { usePreviewMutations } from "@/features/cases/hooks/use-preview-mutations";

/**
 * Defines the props required by the use preview actions hook. 
 * It receives both state and state setters from the orchestrator hook to perform its actions.
 */
interface UsePreviewActionsProps {
  activeFile: UploadableFile | null;
  previewUrl: string;
  rotation: number;
  fileNameBase: string;
  fileExtension: string;
  isNameDirty: boolean;
  isRotationDirty: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  setIsSaving: (saving: boolean) => void;
  setIsDeleting: (deleting: boolean) => void;
  setIsNameDirty: (dirty: boolean) => void;
  setIsRotationDirty: (dirty: boolean) => void;
  setIsRenaming: (renaming: boolean) => void;
  setDisplayFileName: (name: string) => void;
  onClose: () => void;
}

/**
 * A custom hook that centralizes the implementation of user actions like saving, deleting,
 * and downloading a file from the preview modal. It orchestrates server mutations and
 * updates global client-side state.
 */
export const usePreviewActions = ({
  activeFile,
  previewUrl,
  rotation,
  fileNameBase,
  fileExtension,
  isNameDirty,
  isRotationDirty,
  isSaving,
  isDeleting,
  setIsSaving,
  setIsDeleting,
  setIsNameDirty,
  setIsRotationDirty,
  setIsRenaming,
  setDisplayFileName,
  onClose,
}: UsePreviewActionsProps) => {
  // Hooks and State Management
  const caseId = useAnalyzeStore((state) => state.caseId);
  const updateFile = useAnalyzeStore((state) => state.updateFile);
  const removeFile = useAnalyzeStore((state) => state.removeFile);
  const setUploadStatus = useAnalyzeStore((state) => state.setUploadStatus);

  // Initializes all necessary TanStack Query mutations for server-side operations.
  const { presignedUrlMutation, renameMutation, updateUploadMutation, deleteMutation } =
    usePreviewMutations();

  /**
   * The core logic for saving changes (rename and/or rotation) to a file.
   * This is a multi-step, asynchronous process that may involve server calls and
   * client-side canvas manipulation.
   */
  const handleSave = async () => {
    // Pre-flight checks: Ensure an action can be performed.
    const currentFileState = useAnalyzeStore
      .getState()
      .data.files.find((f) => f.id === activeFile?.id);
    if (!currentFileState || (!isNameDirty && !isRotationDirty) || isSaving || isDeleting) return;
    if (!caseId) {
      toast.error("Cannot save changes. Case ID is missing.");
      return;
    }

    // Set interface to a pending state.
    setIsSaving(true);
    setUploadStatus(currentFileState.id, "uploading");

    // Create mutable variables to track the file's state through the process.
    let tempFile = currentFileState.file;
    let tempKey = currentFileState.key;
    let tempUrl = currentFileState.url;

    // Ensure the file's binary data is available for client-side processing if needed.
    if (!tempFile && tempUrl) {
      try {
        const response = await fetch(tempUrl);
        const blob = await response.blob();
        tempFile = new File([blob], currentFileState.name, { type: currentFileState.type });
      } catch {
        toast.error("Could not fetch original image for editing.");
        setIsSaving(false);
        setUploadStatus(currentFileState.id, "error");
        return;
      }
    }
    if (!tempFile) {
      toast.error("File data is missing.");
      setIsSaving(false);
      setUploadStatus(currentFileState.id, "error");
      return;
    }

    try {
      // Handle file rename if the name is dirty.
      if (isNameDirty) {
        if (!tempKey) throw new Error("Cannot rename file: S3 key is missing.");
        const newName = `${fileNameBase.trim()}.${fileExtension}`;
        const result = await renameMutation.mutateAsync({ oldKey: tempKey, newFileName: newName });
        if (!result.success || !result.data)
          throw new Error(result.error || "Rename failed on server.");
        // Update temporary variables with the new name, key, and URL.
        tempFile = new File([tempFile], newName, { type: tempFile.type });
        tempKey = result.data.newKey;
        tempUrl = result.data.newUrl;
      }

      // Handle image rotation if the rotation is dirty.
      if (isRotationDirty) {
        if (!tempKey) throw new Error("Cannot save rotation: S3 key is missing.");
        const image = new window.Image();
        const url = URL.createObjectURL(tempFile);
        image.crossOrigin = "anonymous";
        // Process the rotation on a canvas and get the result as a Blob.
        const rotatedBlob = await new Promise<Blob | null>((resolve) => {
          image.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(null);
            // Swap width and height for 90/270 degree rotations.
            if (rotation === 90 || rotation === 270) {
              canvas.width = image.naturalHeight;
              canvas.height = image.naturalWidth;
            } else {
              canvas.width = image.naturalWidth;
              canvas.height = image.naturalHeight;
            }
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
            canvas.toBlob(resolve, tempFile!.type, 1.0);
          };
          image.onerror = () => resolve(null);
          image.src = url;
        });
        URL.revokeObjectURL(url);
        if (!rotatedBlob) throw new Error("Could not process image for rotation.");
        // Create a new File object from the rotated blob.
        tempFile = new File([rotatedBlob], tempFile.name, { type: tempFile.type });
        // Get a new presigned URL and re-upload the modified image data.
        const presignResult = await presignedUrlMutation.mutateAsync({
          fileName: tempFile.name,
          fileType: tempFile.type,
          fileSize: tempFile.size,
          key: tempKey,
          caseId: caseId,
        });
        if (!presignResult.success || !presignResult.data)
          throw new Error("Failed to prepare re-upload for rotated image.");
        const s3Response = await fetch(presignResult.data.url, { method: "PUT", body: tempFile });
        if (!s3Response.ok) throw new Error("Failed to upload rotated image.");
      }

      // Update the file's metadata in the database with the final state.
      const updateDbResult = await updateUploadMutation.mutateAsync({
        id: currentFileState.id,
        name: tempFile.name,
        size: tempFile.size,
        type: tempFile.type,
        key: tempKey,
        url: tempUrl,
      });
      if (!updateDbResult.success)
        throw new Error(updateDbResult.error || "Failed to update file details in database.");

      // On success, update the client-side state and reset dirty flags.
      updateFile(currentFileState.id, tempFile);
      setUploadStatus(currentFileState.id, "success");
      setDisplayFileName(tempFile.name);
      toast.success(`${tempFile.name} changes saved.`);
      setIsNameDirty(false);
      setIsRotationDirty(false);
      setIsRenaming(false);
    } catch (error) {
      // Handle any errors during the save process.
      toast.error(
        error instanceof Error ? error.message : "An unknown error occurred during save."
      );
      setUploadStatus(currentFileState.id, "error");
    } finally {
      // Always reset the saving state, regardless of outcome.
      setIsSaving(false);
    }
  };

  /**
   * Handles the deletion of the active file, either locally or from the server.
   */
  const handleDelete = async () => {
    if (!activeFile || isDeleting || isSaving) return;
    // If there's no key, the file is local-only.
    if (!activeFile.key) {
      removeFile(activeFile.id);
      toast.success(`${activeFile.name} removed.`);
      onClose();
      return;
    }
    // Otherwise, trigger the server-side deletion mutation.
    setIsDeleting(true);
    try {
      const result = await deleteMutation.mutateAsync({ key: activeFile.key });
      if (!result.success) throw new Error(result.error || "Failed to delete file on server.");
      removeFile(activeFile.id);
      toast.success(`${activeFile.name} deleted successfully.`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete file.");
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handles downloading the currently previewed file, applying any client-side rotation.
   */
  const handleDownload = async () => {
    if (!activeFile || !previewUrl) return;

    try {
      // Fetch the image data from its preview URL (local or remote).
      const response = await fetch(previewUrl);
      if (!response.ok) throw new Error("Failed to fetch image");

      const blob = await response.blob();

      // If no rotation is applied, download the blob directly for efficiency.
      if (rotation === 0) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = activeFile.name;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`${activeFile.name} downloaded successfully.`);
        return;
      }

      // If rotated, process the image on a canvas before downloading.
      const imageUrl = URL.createObjectURL(blob);
      const image = new Image();

      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Could not create canvas context");

          // Adjust canvas dimensions for rotation.
          if (rotation === 90 || rotation === 270) {
            canvas.width = image.naturalHeight;
            canvas.height = image.naturalWidth;
          } else {
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
          }

          // Apply rotation and draw the image.
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

          // Convert the canvas to a blob and trigger the download.
          canvas.toBlob(
            (rotatedBlob) => {
              if (!rotatedBlob) {
                toast.error("Could not process rotated image.");
                return;
              }

              const url = URL.createObjectURL(rotatedBlob);
              const link = document.createElement("a");
              link.href = url;
              link.download = activeFile.name;
              link.style.display = "none";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
              toast.success(`${activeFile.name} downloaded successfully.`);
            },
            activeFile.type || "image/png",
            1.0
          );
        } catch (error) {
          console.error("Canvas processing error:", error);
          toast.error("Could not process image for download.");
        } finally {
          URL.revokeObjectURL(imageUrl);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(imageUrl);
        toast.error("Failed to load image for processing.");
      };

      image.src = imageUrl;
    } catch (error) {
      console.error("Download error:", error);
      // Attempt a direct link download if fetching fails.
      try {
        const link = document.createElement("a");
        link.href = previewUrl;
        link.download = activeFile.name;
        link.target = "_self";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        toast.error("Download failed. Please try again.");
      }
    }
  };

  // Exposes the action handlers for the interface component to consume.
  return {
    handleSave,
    handleDelete,
    handleDownload,
    renameMutation,
  };
};
