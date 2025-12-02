"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import {
  type UploadableFile,
  useAnalyzeStore,
  type ViewMode,
} from "@/features/analyze/store/analyze-store";
import { deleteUpload } from "@/features/upload/actions/delete-upload";
import { updateUpload } from "@/features/upload/actions/update-upload";
import { UploadFileList } from "@/features/upload/components/upload-file-list";
import { UploadNoResults } from "@/features/upload/components/upload-no-results";
import { UploadToolbar } from "@/features/upload/components/upload-toolbar";
import { SORT_OPTIONS, type SortOptionValue } from "@/lib/constants";

// Dynamically load the upload preview modal.
const UploadPreviewModal = dynamic(
  () =>
    import("@/features/upload/components/upload-preview-modal").then((module) => ({
      default: module.UploadPreviewModal,
    })),
  { ssr: false }
);

// Dynamically load the image type modal.
const ImageTypeModal = dynamic(
  () =>
    import("@/features/upload/components/image-type-modal").then((module) => ({
      default: module.ImageTypeModal,
    })),
  { ssr: false }
);

/**
 * Renders a list of the currently uploaded files, with controls for searching, sorting, and viewing.
 * This component acts as the main orchestrator for the file preview section.
 */
export const UploadPreview = () => {
  const queryClient = useQueryClient();
  // Retrieves all necessary state and actions from the global Zustand store.
  const {
    data: { files },
    caseId,
    viewMode,
    sortOption,
    searchTerm,
    setViewMode,
    setSortOption,
    setSearchTerm,
    removeFile,
    retryUpload,
    setImageType,
  } = useAnalyzeStore();

  /** A memoized value for the display label of the currently selected sort option. */
  const currentSortLabel = useMemo(
    () => SORT_OPTIONS.find((option) => option.value === sortOption)?.label ?? "Sort by",
    [sortOption]
  );
  /** State to manage which file is currently being viewed in the modal. Null means the modal is closed. */
  const [viewingFile, setViewingFile] = useState<UploadableFile | null>(null);
  // State to track the ID of the file being deleted to show a spinner on the correct item.
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  // State to track the file whose image type is being specified. Null means the modal is closed.
  const [imageTypeFile, setImageTypeFile] = useState<UploadableFile | null>(null);

  /**
   * Memoizes the list of files filtered by the current search term.
   * This is a performance optimization that prevents re-filtering unless the data or search term changes.
   */
  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    return files.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [files, searchTerm]);

  /**
   * Memoizes the sorted files to prevent re-sorting on every render.
   * The sorting logic is applied here based on the current sortOption from the store.
   */
  const sortedFiles = useMemo(() => {
    // Create a shallow copy to avoid mutating the original array in the store.
    const sorted = [...filteredFiles];
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
      case "date-modified-asc":
        return sorted.sort((a, b) => a.dateUploaded.getTime() - b.dateUploaded.getTime());
      default:
        // Default sort is by most recently uploaded.
        return sorted.sort((a, b) => b.dateUploaded.getTime() - a.dateUploaded.getTime());
    }
  }, [filteredFiles, sortOption]);

  /**
   * Initializes a mutation with Tanstack Query to handle server-side file deletions.
   * It includes logic for success, error, and settlement states to provide user feedback
   * and update the local state and server cache.
   */
  const deleteMutation = useMutation({
    mutationFn: (variables: { key: string; fileId: string }) =>
      deleteUpload({ key: variables.key }),
    onSuccess: (data, variables) => {
      if (data.success) {
        const deletedFile = files.find((f) => f.id === variables.fileId);
        removeFile(variables.fileId);
        toast.success(`${deletedFile?.name ?? "File"} deleted successfully.`);
      } else {
        toast.error(data.error || "Failed to delete file from server.");
      }
    },
    onError: (error) => toast.error(error.message || "An error occurred during deletion."),
    onSettled: () => {
      // Invalidate queries to refetch data from the server and reset the pending state.
      queryClient.invalidateQueries({ queryKey: ["uploads", caseId] });
      setDeletingFileId(null);
    },
  });

  /**
   * Mutation to persist the image type selection for a file in the database.
   */
  const imageTypeMutation = useMutation({
    mutationFn: (variables: { id: string; imageType: "macro" | "field" }) =>
      updateUpload(variables),
    onSuccess: (data, variables) => {
      if (data.success) {
        setImageType(variables.id, variables.imageType);
        const file = files.find((f) => f.id === variables.id);
        const label = variables.imageType === "macro" ? "macro" : "field";
        toast.success(`${file?.name || "File"} has been set to ${label}.`);
      } else {
        toast.error(data.error || "Failed to update image type.");
      }
    },
    onError: (error) => toast.error(error.message || "An error occurred while saving image type."),
  });

  /**
   * Handles the confirmation of an image type selection from the modal.
   */
  const handleImageTypeConfirm = (fileId: string, imageType: "macro" | "field") => {
    const file = files.find((f) => f.id === fileId);
    if (!file) return;

    if (file.status === "success") {
      imageTypeMutation.mutate({ id: fileId, imageType });
    } else {
      setImageType(fileId, imageType);
      const label = imageType === "macro" ? "macro" : "field";
      toast.success(`The image type for ${file.name} will be saved as ${label}.`);
    }
  };

  /**
   * Handles the deletion of a file. It removes locally for non-uploaded files or
   * triggers the server mutation for already uploaded files.
   *
   * @param fileId The local ID of the file to remove.
   * @param fileKey The server-side key of the file to delete (if uploaded).
   */
  const handleDeleteFile = (fileId: string, fileKey: string | null) => {
    setDeletingFileId(fileId);
    // If there's no file key, the file hasn't been uploaded, so just remove it from local state.
    if (!fileKey) {
      const fileToRemove = files.find((f) => f.id === fileId);
      removeFile(fileId);
      if (fileToRemove) toast.success(`${fileToRemove.name} removed.`);
      setDeletingFileId(null);
      return;
    }
    // Otherwise, trigger the server-side deletion mutation.
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
   *
   * @param fileId - The unique ID of the file selected in the modal.
   */
  const handleSelectFile = (fileId: string) => {
    const fileToView = sortedFiles.find((f) => f.id === fileId);
    if (fileToView) setViewingFile(fileToView);
  };

  // If there are no files to display, render nothing.
  if (files.length === 0) {
    return null;
  }

  return (
    <>
      <TooltipProvider>
        {/* The main animated container for the toolbar and file list. */}
        <motion.div
          layout
          transition={{ layout: { type: "tween", duration: 0.6, ease: "easeInOut" } }}
          className="mt-6 w-full"
        >
          {/* Animated container for the toolbar. */}
          <motion.div
            layout
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <UploadToolbar
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              currentSortLabel={currentSortLabel}
              sortOption={sortOption}
              onSortOptionChange={(value) => setSortOption(value as SortOptionValue)}
              viewMode={viewMode}
              onViewModeChange={(value) => setViewMode(value as ViewMode)}
            />
          </motion.div>

          {/* Manages the animated transition between the file list and the "no results" message. */}
          <AnimatePresence mode="wait">
            {sortedFiles.length > 0 ? (
              <UploadFileList
                files={sortedFiles}
                viewMode={viewMode}
                onViewFile={setViewingFile}
                onDeleteFile={handleDeleteFile}
                onRetry={retryUpload}
                deletingFileId={deletingFileId}
                onSetImageType={setImageTypeFile}
              />
            ) : (
              <UploadNoResults />
            )}
          </AnimatePresence>
        </motion.div>
      </TooltipProvider>

      {/* Dynamic import handles the loading of the preview modal component. */}
      <UploadPreviewModal
        file={viewingFile}
        isOpen={!!viewingFile}
        onClose={() => setViewingFile(null)}
        onNext={() => handleNavigate("next")}
        onPrevious={() => handleNavigate("previous")}
        onSelectFile={handleSelectFile}
      />

      {/* Modal for specifying the image type (Macro or Field). */}
      <ImageTypeModal
        file={imageTypeFile}
        isOpen={!!imageTypeFile}
        onOpenChange={(open) => {
          if (!open) setImageTypeFile(null);
        }}
        onConfirm={handleImageTypeConfirm}
        isPending={imageTypeMutation.isPending}
      />
    </>
  );
};

UploadPreview.displayName = "UploadPreview";
