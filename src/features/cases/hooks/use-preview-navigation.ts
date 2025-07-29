import { useMemo } from "react";

import { type UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";

/**
 * A custom hook that encapsulates the logic for navigating between files in a preview modal.
 * It retrieves all files and the current sort option from the global store, memoizes the
 * sorted list, and calculates the current file's index and navigation possibilities (next/previous).
 *
 * @param activeFile - The file currently being viewed. Used to determine the current position in the sorted list.
 * @returns An object containing the sorted file list and navigation state.
 */
export const usePreviewNavigation = (activeFile: UploadableFile | null) => {
  // Retrieves the full list of files from the global Zustand store.
  const allFiles = useAnalyzeStore((state) => state.data.files);
  // Retrieves the current user-selected sort option from the store.
  const sortOption = useAnalyzeStore((state) => state.sortOption);

  /**
   * Memoizes the sorted list of files.
   */
  const sortedFiles = useMemo(() => {
    // Create a shallow copy to avoid mutating the original array from the store.
    const filesCopy = [...allFiles];
    switch (sortOption) {
      case "name-asc":
        return filesCopy.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return filesCopy.sort((a, b) => b.name.localeCompare(a.name));
      case "size-asc":
        return filesCopy.sort((a, b) => a.size - b.size);
      case "size-desc":
        return filesCopy.sort((a, b) => b.size - a.size);
      case "date-modified-desc":
        return filesCopy.sort((a, b) => b.dateUploaded.getTime() - a.dateUploaded.getTime());
      case "date-uploaded-desc":
      default:
        // The default sort order is by most recently uploaded.
        return filesCopy.sort((a, b) => b.dateUploaded.getTime() - a.dateUploaded.getTime());
    }
  }, [allFiles, sortOption]);

  /**
   * Memoizes the index of the currently active file within the sorted list.
   * Returns -1 if no file is active, preventing errors.
   */
  const currentIndex = useMemo(() => {
    if (!activeFile) return -1;
    return sortedFiles.findIndex((f) => f.id === activeFile.id);
  }, [activeFile, sortedFiles]);

  /**
   * A memoized boolean indicating if there is a next file available for navigation.
   * This is used to enable or disable the "next" button in the UI.
   */
  const hasNext = useMemo(
    () => currentIndex < sortedFiles.length - 1,
    [currentIndex, sortedFiles.length]
  );

  /**
   * A memoized boolean indicating if there is a previous file available for navigation.
   * This is used to enable or disable the "previous" button in the interface.
   */
  const hasPrevious = useMemo(() => currentIndex > 0, [currentIndex]);

  // Exposes the derived state for the interface component to consume.
  return {
    sortedFiles,
    currentIndex,
    hasNext,
    hasPrevious,
  };
};
