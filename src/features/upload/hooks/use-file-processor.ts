import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import { toast } from "sonner";

import { type UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { createUpload } from "@/features/upload/actions/create-upload";
import { saveUpload } from "@/features/upload/actions/save-upload";

/**
 * Extracts image dimensions from a `File` object
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

type UseFileProcessorProps = {
  files: UploadableFile[];
  caseId: string | null;
};

/**
 * A hook that encapsulates the entire file upload processing logic.
 * It watches for pending files and manages the multi-step upload process:
 * 1. Get a pre-signed URL from the server.
 * 2. Upload the file directly to S3.
 * 3. Save the file's metadata to the database.
 */
export const useFileProcessor = ({ files, caseId }: UseFileProcessorProps) => {
  // Get the necessary actions from the Zustand store.
  const { updateFileProgress, setUploadStatus, setUploadKey, setUploadUrl } = useAnalyzeStore();

  const presignedUrlMutation = useMutation({ mutationFn: createUpload });
  const saveUploadMutation = useMutation({
    mutationFn: saveUpload,
    onSuccess: (result, variables) => {
      if (result.success && result.data) {
        setUploadStatus(variables.id, "success");
        setUploadUrl(variables.id, result.data.url);
        toast.success(`${variables.name} uploaded.`);
      } else {
        setUploadStatus(variables.id, "error");
        toast.error(`Failed to save ${variables.name}: ${result.error}`);
      }
    },
    onError: (_error, variables) => {
      setUploadStatus(variables.id, "error");
      toast.error(`An error occurred while saving ${variables.name}.`);
    },
  });

  const uploadToS3 = useCallback(
    (url: string, uploadableFile: UploadableFile) => {
      if (!uploadableFile.file || !caseId) return;
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url, true);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = Math.round((event.loaded / event.total) * 100);
          updateFileProgress(uploadableFile.id, percentComplete);
        }
      };
      xhr.onload = async () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (uploadableFile.key && uploadableFile.file) {
            try {
              // Extract image dimensions before saving
              const { width, height } = await getImageDimensions(uploadableFile.file);

              saveUploadMutation.mutate({
                id: uploadableFile.id,
                key: uploadableFile.key,
                name: uploadableFile.name,
                size: uploadableFile.size,
                type: uploadableFile.type,
                width,
                height,
                caseId,
              });
            } catch (error) {
              setUploadStatus(uploadableFile.id, "error");
              toast.error(
                `Could not extract dimensions for ${uploadableFile.name}: ${error instanceof Error ? error.message : "Unknown error"}`
              );
            }
          } else {
            setUploadStatus(uploadableFile.id, "error");
            toast.error(`Could not save ${uploadableFile.name}: S3 key is missing.`);
          }
        } else {
          setUploadStatus(uploadableFile.id, "error");
          toast.error(`${uploadableFile.name} upload failed.`);
        }
      };
      xhr.onerror = () => {
        setUploadStatus(uploadableFile.id, "error");
        toast.error(`An error occurred while uploading ${uploadableFile.name}.`);
      };
      xhr.send(uploadableFile.file);
    },
    [caseId, updateFileProgress, setUploadStatus, saveUploadMutation]
  );

  useEffect(() => {
    if (!caseId) return;
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    pendingFiles.forEach(async (pendingFile) => {
      if (!pendingFile.file) return;
      const { file, id } = pendingFile;
      try {
        setUploadStatus(id, "uploading");
        const result = await presignedUrlMutation.mutateAsync({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          caseId,
        });
        if (!result.success || !result.data) {
          throw new Error(result.error || "Failed to prepare upload.");
        }
        setUploadKey(id, result.data.key);
        const fileToUpload = useAnalyzeStore.getState().data.files.find((f) => f.id === id);
        if (fileToUpload) {
          uploadToS3(result.data.url, fileToUpload);
        }
      } catch (error) {
        setUploadStatus(id, "error");
        toast.error(
          `${file.name} failed to upload. ${error instanceof Error ? error.message : "Unexpected error."}`
        );
      }
    });
  }, [files, caseId, presignedUrlMutation, setUploadKey, setUploadStatus, uploadToS3]);
};
