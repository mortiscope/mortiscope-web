"use client";

import { useEffect, useMemo, useState } from "react";

import { type detections, type uploads } from "@/db/schema";
import { useSelectionNavigator } from "@/features/cases/hooks/use-selection-navigator";
import { type ImageFile } from "@/features/images/components/results-images";
import { type SortOptionValue } from "@/lib/constants";

// Type definitions for the initial data passed from the server.
type InitialImages = (typeof uploads.$inferSelect & { detections: Detection[] })[];
type Detection = typeof detections.$inferSelect;

/**
 * A 'smart' hook that encapsulates all state management and logic for the `ResultsImages` component.
 * It handles data mapping, local state for UI controls (sorting, filtering), and orchestrates
 * child hooks and modals for previewing, exporting, and deleting images.
 *
 * @param initialImages The initial list of images passed from a server component.
 * @returns A unified API of all state and handlers required by the `ResultsImages` component.
 */
export const useResultsImages = (initialImages?: InitialImages) => {
  /**
   * Memoizes the transformation of raw server data into the `ImageFile` format used by the client.
   * This runs only when the initial server data changes, preventing unnecessary re-mapping.
   */
  const mappedImages: ImageFile[] = useMemo(() => {
    const mapped =
      initialImages?.map((img) => ({
        id: img.id,
        name: img.name,
        url: img.url,
        size: img.size,
        dateUploaded: img.createdAt,
        version: img.createdAt.getTime(),
        detections: img.detections,
      })) || [];

    return mapped;
  }, [initialImages]);

  // Local State Management
  const [files, setFiles] = useState<ImageFile[]>(mappedImages);
  const [sortOption, setSortOption] = useState<SortOptionValue>("date-uploaded-desc");
  const [searchTerm, setSearchTerm] = useState("");

  // State to control the visibility and data context for the export and delete modals.
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [imageToExport, setImageToExport] = useState<ImageFile | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<ImageFile | null>(null);

  /**
   * Memoizes the list of files filtered by the current search term.
   */
  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    return files.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [files, searchTerm]);

  /**
   * Memoizes the final sorted list of files to be rendered, based on the filtered list.
   */
  const sortedFiles = useMemo(() => {
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
      case "date-uploaded-desc":
      default:
        return sorted.sort((a, b) => b.dateUploaded.getTime() - a.dateUploaded.getTime());
      case "date-uploaded-asc":
        return sorted.sort((a, b) => a.dateUploaded.getTime() - b.dateUploaded.getTime());
    }
  }, [filteredFiles, sortOption]);

  /** A generic navigator hook to manage the state of the main image preview modal. */
  const previewModal = useSelectionNavigator({ items: sortedFiles });

  /**
   * A side effect to synchronize the local `files` state with the `initialImages` prop.
   * This is useful if the server data can be refetched or updated after the initial render.
   */
  useEffect(() => {
    setFiles(mappedImages);
  }, [mappedImages]);

  /** Opens the export modal and sets the context for the selected image. */
  const handleOpenExportModal = (imageFile: ImageFile) => {
    setImageToExport(imageFile);
    setIsExportModalOpen(true);
  };
  /** Opens the delete modal and sets the context for the selected image. */
  const handleOpenDeleteModal = (imageFile: ImageFile) => {
    setImageToDelete(imageFile);
    setIsDeleteModalOpen(true);
  };

  // Exposes a single, unified API for the results images component to consume.
  return {
    // Toolbar state and handlers
    searchTerm,
    setSearchTerm,
    sortOption,
    setSortOption,
    isSortDisabled: files.length <= 1,
    // Grid data
    sortedFiles,
    // Preview modal controller
    previewModal,
    // Export modal state and handlers
    isExportModalOpen,
    setIsExportModalOpen,
    imageToExport,
    handleOpenExportModal,
    // Delete modal state and handlers
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    imageToDelete,
    handleOpenDeleteModal,
    // Additional derived data
    totalImages: files.length,
  };
};
