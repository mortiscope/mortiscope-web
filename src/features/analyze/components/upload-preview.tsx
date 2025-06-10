"use client";

import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { GoCheckCircle } from "react-icons/go";
import { IoGridOutline, IoListOutline } from "react-icons/io5";
import {
  LuArrowDownAZ,
  LuArrowUpDown,
  LuArrowUpZA,
  LuCalendarClock,
  LuCalendarDays,
  LuLoaderCircle,
  LuRotateCw,
  LuScaling,
  LuTrash2,
} from "react-icons/lu";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { deleteUpload } from "@/features/analyze/actions/delete-upload";
import { UploadPreviewModal } from "@/features/analyze/components/upload-preview-modal";
import {
  type UploadableFile,
  useAnalyzeStore,
  type ViewMode,
} from "@/features/analyze/store/analyze-store";
import { SORT_OPTIONS, type SortOptionValue } from "@/lib/constants";
import { cn, formatBytes } from "@/lib/utils";

/**
 * A small component to render an icon for each sort option.
 */
const SortIcon = ({ value }: { value: SortOptionValue }) => {
  const commonProps = { className: "mr-2 h-4 w-4 text-slate-600" };
  switch (value) {
    case "date-uploaded-desc":
      return <LuCalendarClock {...commonProps} />;
    case "date-modified-desc":
      return <LuCalendarDays {...commonProps} />;
    case "name-asc":
      return <LuArrowDownAZ {...commonProps} />;
    case "name-desc":
      return <LuArrowUpZA {...commonProps} />;
    case "size-asc":
    case "size-desc":
      return <LuScaling {...commonProps} />;
    default:
      return null;
  }
};

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
const Thumbnail = ({
  uploadableFile,
  className,
}: {
  uploadableFile: UploadableFile;
  className?: string;
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    // If the file has a persisted URL, use it directly.
    if (uploadableFile.url) {
      setPreviewUrl(uploadableFile.url);
      return;
    }

    // Otherwise, if it's a new file, create a temporary blob URL.
    if (uploadableFile.file) {
      const objectUrl = URL.createObjectURL(uploadableFile.file);
      setPreviewUrl(objectUrl);

      // Cleanup function to revoke the object URL to free up memory.
      return () => {
        URL.revokeObjectURL(objectUrl);
      };
    }
  }, [uploadableFile]);

  // Render a skeleton loader while the image is loading.
  if (!previewUrl) {
    return (
      <div className={cn("flex-shrink-0 rounded-md bg-slate-200", className || "h-10 w-10")} />
    );
  }

  return (
    // Enforces the aspect ratio and clips the image.
    <div
      className={cn("relative flex-shrink-0 overflow-hidden", className || "h-10 w-10 rounded-md")}
    >
      <Image
        src={previewUrl}
        alt={`Preview of ${uploadableFile.name}`}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
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
  const viewMode = useAnalyzeStore((state) => state.viewMode);
  const sortOption = useAnalyzeStore((state) => state.sortOption);
  const setViewMode = useAnalyzeStore((state) => state.setViewMode);
  const setSortOption = useAnalyzeStore((state) => state.setSortOption);
  const removeFile = useAnalyzeStore((state) => state.removeFile);
  const retryUpload = useAnalyzeStore((state) => state.retryUpload);

  /**
   * Memoize the current sort option's label to display in the trigger.
   * This avoids re-calculating the label on every render.
   */
  const currentSortLabel = useMemo(() => {
    // Find the option object that matches the current sortOption value.
    const currentOption = SORT_OPTIONS.find((option) => option.value === sortOption);
    // Return the label of the found option, or a default string if not found.
    return currentOption?.label ?? "Sort by";
  }, [sortOption]);

  // State to manage the currently viewed file in the modal. If a file is set, the modal will open.
  const [viewingFile, setViewingFile] = useState<UploadableFile | null>(null);
  // State to track the ID of the file being deleted to show a spinner on the correct item.
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  /**
   * Memoize the sorted files to prevent re-sorting on every render.
   * The sorting logic is applied here based on the current sortOption from the store.
   */
  const sortedFiles = useMemo(() => {
    // Create a shallow copy to avoid mutating the original array in the store.
    const sorted = [...files];
    switch (sortOption) {
      case "name-asc":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case "size-asc":
        return sorted.sort((a, b) => a.size - b.size);
      case "size-desc":
        return sorted.sort((a, b) => b.size - a.size);
      case "date-modified-desc":
        return sorted.sort((a, b) => b.dateUploaded.getTime() - a.dateUploaded.getTime());
      case "date-uploaded-desc":
      default:
        // Sort by upload date, newest first.
        return sorted.sort((a, b) => b.dateUploaded.getTime() - a.dateUploaded.getTime());
    }
  }, [files, sortOption]);

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
          toast.success(`${deletedFile.name} deleted successfully.`);
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
        toast.success(`${fileToRemove.name} removed.`);
      }
      setDeletingFileId(null);
      return;
    }

    // Trigger the mutation to delete the file from S3 and the database.
    deleteMutation.mutate({ key: fileKey, fileId });
  };

  /**
   * Handles navigation between files in the preview modal.
   * @param direction - "next" or "previous" to determine which file to show.
   */
  const handleNavigate = (direction: "next" | "previous") => {
    if (!viewingFile) return;
    const currentIndex = sortedFiles.findIndex((f) => f.id === viewingFile.id);
    if (currentIndex === -1) return;

    if (direction === "next" && currentIndex < sortedFiles.length - 1) {
      setViewingFile(sortedFiles[currentIndex + 1]);
    } else if (direction === "previous" && currentIndex > 0) {
      setViewingFile(sortedFiles[currentIndex - 1]);
    }
  };

  /**
   * Handles selecting a file directly from the modal's thumbnail strip.
   * This keeps the parent's `viewingFile` state in sync with the modal's internal state.
   * @param fileId - The unique ID of the file selected in the modal.
   */
  const handleSelectFile = (fileId: string) => {
    const fileToView = sortedFiles.find((f) => f.id === fileId);
    if (fileToView) {
      setViewingFile(fileToView);
    }
  };

  // If there are no files, this component renders nothing.
  if (files.length === 0) {
    return null;
  }

  return (
    <>
      <TooltipProvider>
        <div className="mt-6 w-full">
          {/* View mode and sort controls */}
          <motion.div
            layout
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="mb-4 flex items-center justify-end gap-2"
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="flex h-10 cursor-pointer items-center gap-2 border-2 border-slate-200 px-3 hover:bg-slate-50 focus-visible:ring-0 focus-visible:ring-offset-0"
                >
                  <span className="font-inter text-sm font-normal text-slate-800">
                    {currentSortLabel}
                  </span>
                  <LuArrowUpDown className="h-4 w-4 shrink-0 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64">
                {SORT_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => setSortOption(option.value as SortOptionValue)}
                    className={cn(
                      "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 hover:[&_svg]:!text-emerald-600"
                    )}
                  >
                    <SortIcon value={option.value as SortOptionValue} />
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <ToggleGroup
              type="single"
              variant="outline"
              value={viewMode}
              onValueChange={(value) => {
                if (value) setViewMode(value as ViewMode);
              }}
              aria-label="View mode"
              className="border border-slate-200"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value="list"
                    aria-label="List view"
                    className="cursor-pointer data-[state=off]:hover:bg-slate-50 data-[state=on]:!bg-emerald-200 data-[state=on]:!text-emerald-600"
                  >
                    <IoListOutline className="h-5 w-5" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-inter">List view</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value="grid"
                    aria-label="Grid view"
                    className="cursor-pointer data-[state=off]:hover:bg-slate-50 data-[state=on]:!bg-emerald-200 data-[state=on]:!text-emerald-600"
                  >
                    <IoGridOutline className="h-5 w-5" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-inter">Grid view</p>
                </TooltipContent>
              </Tooltip>
            </ToggleGroup>
          </motion.div>

          {/* Container for the file list, with view-switch animation. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={viewMode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={cn(
                "grid gap-3",
                viewMode === "list"
                  ? "grid-cols-1 md:grid-cols-2"
                  : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
              )}
            >
              <AnimatePresence>
                {sortedFiles.map((uploadableFile) => (
                  <motion.div
                    key={uploadableFile.id}
                    layout
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{
                      layout: { type: "tween", duration: 0.6, ease: "easeInOut" },
                      opacity: { duration: 0.4 },
                      scale: { duration: 0.4 },
                    }}
                    className={cn(
                      "font-inter group relative rounded-lg border-2 border-slate-200 bg-slate-50 transition-colors duration-300 ease-in-out hover:border-emerald-300 hover:bg-emerald-50 md:rounded-xl",
                      {
                        "flex cursor-pointer items-center justify-between p-2 sm:p-3":
                          viewMode === "list",
                        "flex aspect-square cursor-pointer flex-col overflow-hidden":
                          viewMode === "grid",
                      }
                    )}
                  >
                    {viewMode === "list" ? (
                      <>
                        {/* List View Layout */}
                        <div className="flex min-w-0 flex-grow items-center gap-3">
                          <Thumbnail uploadableFile={uploadableFile} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-normal text-slate-700 sm:text-base">
                              {uploadableFile.name}
                            </p>
                            <p className="text-xs text-slate-500 sm:text-sm">
                              {formatBytes(uploadableFile.size)}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-1">
                          <StatusIcon file={uploadableFile} onRetry={retryUpload} />
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setViewingFile(uploadableFile)}
                                aria-label={`View ${uploadableFile.name}`}
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
                                aria-label={`Remove ${uploadableFile.name}`}
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
                      </>
                    ) : (
                      <>
                        {/* Grid View Layout */}
                        <Thumbnail uploadableFile={uploadableFile} className="min-h-0 flex-1" />
                        <div className="flex w-full flex-col items-center justify-center p-2">
                          <div className="flex flex-shrink-0 items-center gap-1">
                            <StatusIcon file={uploadableFile} onRetry={retryUpload} />
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setViewingFile(uploadableFile)}
                                  aria-label={`View ${uploadableFile.name}`}
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
                                  aria-label={`Remove ${uploadableFile.name}`}
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
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </AnimatePresence>
        </div>
      </TooltipProvider>

      {/* Render the modal component outside the list. */}
      <UploadPreviewModal
        file={viewingFile}
        isOpen={!!viewingFile}
        onClose={() => setViewingFile(null)}
        onNext={() => handleNavigate("next")}
        onPrevious={() => handleNavigate("previous")}
        onSelectFile={handleSelectFile}
      />
    </>
  );
};
