"use client";

import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { GoCheckCircle } from "react-icons/go";
import { LuLoaderCircle, LuRotateCw, LuTrash2 } from "react-icons/lu";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { deleteUpload } from "@/features/analyze/actions/delete-upload";
import { UploadPreviewModal } from "@/features/analyze/components/upload-preview-modal";
import { type UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { cn, formatBytes } from "@/lib/utils";

/**
 * Renders an animated status icon based on the file's upload status.
 * For failed uploads, it provides a retry mechanism.
 */
const StatusIcon = ({
  file,
  onRetry,
}: {
  file: UploadableFile;
  onRetry: (fileId: string) => void;
}) => {
  const iconVariants = {
    initial: { opacity: 0, scale: 0.5 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.5 },
  };

  const { status, id } = file;

  // Configuration for each status.
  const statusConfig = {
    uploading: {
      tooltip: "Uploading",
      className: "text-slate-500 hover:bg-transparent",
    },
    success: {
      tooltip: "Upload successful",
      className: "text-emerald-500 hover:bg-emerald-100 hover:text-emerald-600",
    },
    error: {
      tooltip: "Retry",
      className: "text-slate-500 hover:bg-rose-100 hover:text-rose-600",
    },
    pending: {
      tooltip: "Pending",
      className: "text-slate-500 hover:bg-slate-100",
    },
  };

  // Gets the current status configuration or defaults to uploading.
  const currentStatus = statusConfig[status] || statusConfig.uploading;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-colors duration-300 ease-in-out",
            currentStatus.className
          )}
          onClick={() => {
            if (status === "error") {
              onRetry(id);
            }
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            {status === "uploading" && (
              <motion.div
                key="uploading"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <LuLoaderCircle className="h-5 w-5 animate-spin" />
              </motion.div>
            )}
            {status === "success" && (
              <motion.div
                key="success"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <GoCheckCircle className="h-5 w-5" />
              </motion.div>
            )}
            {status === "error" && (
              <motion.div
                key="error"
                variants={iconVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <LuRotateCw className="h-5 w-5" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-inter">{currentStatus.tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
};

/**
 * A small component that creates a temporary local URL for a File object and renders it as an image thumbnail.
 */
const Thumbnail = ({ file }: { file: File }) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    // Create a blob URL from the file.
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Cleanup function to revoke the object URL to free up memory when the component unmounts.
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  // Render a skeleton loader while the image is loading.
  if (!previewUrl) {
    return <div className="h-10 w-10 flex-shrink-0 rounded-md bg-slate-200" />;
  }

  return (
    // Enforces the square aspect ratio and clips the image.
    <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
      <Image
        src={previewUrl}
        alt={`Preview of ${file.name}`}
        fill
        className="object-cover"
        sizes="40px"
      />
    </div>
  );
};

/**
 * Renders a list of the currently uploaded files, with animations for adding and removing items.
 */
export const UploadPreview = () => {
  // Retrieves the list of files and the actions from the store.
  const files = useAnalyzeStore((state) => state.data.files);
  const removeFile = useAnalyzeStore((state) => state.removeFile);
  const retryUpload = useAnalyzeStore((state) => state.retryUpload);

  // State to manage the currently viewed file in the modal. If a file is set, the modal will open.
  const [viewingFile, setViewingFile] = useState<UploadableFile | null>(null);
  // State to track the ID of the file being deleted to show a spinner on the correct item.
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  /**
   * TanStack Query mutation for handling the S3 file deletion server action.
   */
  const deleteMutation = useMutation({
    mutationFn: (variables: { key: string; fileId: string }) =>
      deleteUpload({ key: variables.key }),
    onSuccess: (data, variables) => {
      if (data.success) {
        // Find the file in the store to get its name for the toast message.
        const deletedFile = files.find((f) => f.id === variables.fileId);

        // On successful deletion from S3, remove the file from the local Zustand store.
        removeFile(variables.fileId);

        // Show a more specific toast message including the file name.
        if (deletedFile) {
          toast.success(`${deletedFile.file.name} deleted successfully.`);
        } else {
          // Fallback message in case the file is not found (shouldn't happen).
          toast.success("File deleted successfully.");
        }
      } else {
        // If the server action returns success: false, show the error.
        toast.error(data.error || "Failed to delete file from server.");
      }
    },
    onError: (error) => {
      // Handle network errors or exceptions from the server action.
      toast.error(error.message || "An error occurred during deletion.");
    },
    onSettled: () => {
      // Clear the deleting state regardless of outcome.
      setDeletingFileId(null);
    },
  });

  /**
   * Handles the file deletion process.
   * If the file has a key, it's deleted from S3. Otherwise, it's just removed locally.
   * @param fileId - The unique ID of the file in the store.
   * @param fileKey - The S3 object key, if the file has been uploaded.
   */
  const handleDeleteFile = (fileId: string, fileKey: string | null) => {
    setDeletingFileId(fileId);

    // If there's no key, the file hasn't been uploaded to S3 yet.
    if (!fileKey) {
      // Find the file before removing it to use its name in the toast.
      const fileToRemove = files.find((f) => f.id === fileId);
      removeFile(fileId);
      if (fileToRemove) {
        toast.success(`${fileToRemove.file.name} removed.`);
      }
      setDeletingFileId(null);
      return;
    }

    // Trigger the mutation to delete the file from S3.
    deleteMutation.mutate({ key: fileKey, fileId });
  };

  // If there are no files, this component renders nothing.
  if (files.length === 0) {
    return null;
  }

  return (
    <>
      <TooltipProvider>
        <div className="mt-6 w-full">
          {/* Container for the file list, using a responsive grid layout. */}
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
            <AnimatePresence>
              {files.map((uploadableFile) => (
                <motion.div
                  key={uploadableFile.id}
                  // Animates the item's position when the layout changes.
                  layout
                  // Initial state before entering.
                  initial={{ opacity: 0, y: -10 }}
                  // State to animate to on entering.
                  animate={{ opacity: 1, y: 0 }}
                  // State to animate to on exiting.
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{
                    layout: { type: "tween", duration: 0.6, ease: "easeInOut" },
                    opacity: { duration: 0.4 },
                    scale: { duration: 0.4 },
                  }}
                  className="font-inter group relative flex cursor-pointer items-center justify-between rounded-lg border-2 border-slate-200 bg-slate-50 p-2 transition-colors duration-300 ease-in-out hover:border-emerald-300 hover:bg-emerald-50 sm:p-3"
                >
                  {/* Left section containing the thumbnail and file details. */}
                  <div className="flex min-w-0 flex-grow items-center gap-3">
                    <Thumbnail file={uploadableFile.file} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-normal text-slate-700 sm:text-base">
                        {uploadableFile.file.name}
                      </p>
                      <p className="text-xs text-slate-500 sm:text-sm">
                        {formatBytes(uploadableFile.file.size)}
                      </p>
                    </div>
                  </div>
                  {/* Right section with the status icon and action buttons. */}
                  <div className="flex flex-shrink-0 items-center gap-1">
                    <StatusIcon file={uploadableFile} onRetry={retryUpload} />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingFile(uploadableFile)}
                          aria-label={`View ${uploadableFile.file.name}`}
                          className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-amber-100 hover:text-amber-600"
                          disabled={deletingFileId === uploadableFile.id}
                        >
                          <MdOutlineRemoveRedEye className="h-5 w-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-inter">View</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            handleDeleteFile(uploadableFile.id, uploadableFile.key ?? null)
                          }
                          aria-label={`Remove ${uploadableFile.file.name}`}
                          className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-rose-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={deletingFileId === uploadableFile.id}
                        >
                          {deletingFileId === uploadableFile.id ? (
                            <LuLoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <LuTrash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-inter">Remove file</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </TooltipProvider>

      {/* Render the modal component outside the list. */}
      <UploadPreviewModal
        file={viewingFile}
        isOpen={!!viewingFile}
        onClose={() => setViewingFile(null)}
      />
    </>
  );
};
