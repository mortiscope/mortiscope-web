"use client";

import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import React, { useEffect, useState } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { type detections, type uploads } from "@/db/schema";
import { ImageGrid } from "@/features/images/components/image-grid";
import { ImageToolbar } from "@/features/images/components/image-toolbar";
import { useResultsImages } from "@/features/images/hooks/use-results-images";
import { ResultsNoSearchResults } from "@/features/results/components/results-no-search-results";
import { ResultsImagesSkeleton } from "@/features/results/components/results-skeleton";

// Add a local `loading` fallback to each dynamic import.
const ResultsImagesModal = dynamic(
  () =>
    import("@/features/images/components/results-images-modal").then(
      (module) => module.ResultsImagesModal
    ),
  { loading: () => null }
);
const ExportImageModal = dynamic(
  () =>
    import("@/features/export/components/export-image-modal").then(
      (module) => module.ExportImageModal
    ),
  { loading: () => null }
);
const DeleteImageModal = dynamic(
  () =>
    import("@/features/images/components/delete-image-modal").then(
      (module) => module.DeleteImageModal
    ),
  { loading: () => null }
);

/**
 * Defines the client-side data structure for a single image file, which is mapped from the server data.
 * This type is exported for use in child components like `ImageCard` and various hooks.
 */
export type ImageFile = {
  id: string;
  name: string;
  url: string;
  size: number;
  dateUploaded: Date;
  version: number;
  detections?: (typeof detections.$inferSelect)[];
};

/**
 * Defines the props for the ResultsImages component, which receives data fetched on the server.
 */
type ResultsImagesProps = {
  /** The initial list of images and their detections, passed from a server component. */
  initialImages?: (typeof uploads.$inferSelect & {
    detections: (typeof detections.$inferSelect)[];
  })[];
  /** If true, the component will render its skeleton loading state. */
  isLoading?: boolean;
};

/**
 * A 'smart' container component that renders the list of analyzed case images.
 * It uses the `useResultsImages` hook to manage all client-side state and logic,
 * and orchestrates the rendering of the toolbar, image grid, and various modals.
 */
export const ResultsImages = ({ initialImages, isLoading }: ResultsImagesProps) => {
  // State to ensure components with random IDs only render on the client.
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Initializes the master hook that provides all state and logic for this component.
  const {
    searchTerm,
    setSearchTerm,
    sortOption,
    setSortOption,
    isSortDisabled,
    sortedFiles,
    previewModal,
    isExportModalOpen,
    setIsExportModalOpen,
    imageToExport,
    handleOpenExportModal,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    imageToDelete,
    handleOpenDeleteModal,
    totalImages,
  } = useResultsImages(initialImages);

  // If the data is still loading, display a skeleton placeholder.
  if (isLoading) {
    return <ResultsImagesSkeleton />;
  }

  /**
   * A handler to bridge the `onView` callback from a child component (which provides an ID)
   * to the `previewModal.open` action (which requires the full item object).
   *
   * @param imageId The ID of the image to open in the preview modal.
   */
  const handleOpenModal = (imageId: string) => {
    const imageToOpen = sortedFiles.find((f) => f.id === imageId);
    if (imageToOpen) {
      previewModal.open(imageToOpen);
    }
  };

  return (
    <>
      <TooltipProvider>
        <div className="w-full">
          {isMounted ? (
            <ImageToolbar
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              sortOption={sortOption}
              onSortOptionChange={setSortOption}
              isSortDisabled={isSortDisabled}
            />
          ) : (
            // Render a skeleton placeholder to prevent layout shift during hydration.
            <div className="mb-4 flex items-center justify-between gap-2">
              <Skeleton className="h-10 w-full max-w-sm bg-white" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-10 w-11 shrink-0 bg-white sm:w-[190px]" />
              </div>
            </div>
          )}
          {/* Manages the animated transition between the image grid and the "no results" message. */}
          <AnimatePresence mode="wait">
            {sortedFiles.length > 0 ? (
              <ImageGrid
                images={sortedFiles}
                sortOption={sortOption}
                onView={handleOpenModal}
                onExport={handleOpenExportModal}
                onDelete={handleOpenDeleteModal}
              />
            ) : searchTerm ? (
              // Only show "No Results" if a search term is active and has yielded no results.
              <ResultsNoSearchResults
                title="No Images Found"
                description="Your search term did not match any images."
              />
            ) : null}
          </AnimatePresence>
        </div>
      </TooltipProvider>

      {/* Conditionally render the lazily-loaded modals based on their state. */}
      {previewModal.isOpen && (
        <ResultsImagesModal
          isOpen={previewModal.isOpen}
          onClose={previewModal.close}
          image={previewModal.selectedItem}
          images={sortedFiles}
          onNext={previewModal.next}
          onPrevious={previewModal.previous}
          onSelectImage={previewModal.selectById}
        />
      )}
      {isExportModalOpen && (
        <ExportImageModal
          isOpen={isExportModalOpen}
          onOpenChange={setIsExportModalOpen}
          image={imageToExport}
        />
      )}
      {isDeleteModalOpen && (
        <DeleteImageModal
          key={imageToDelete?.id}
          isOpen={isDeleteModalOpen}
          onOpenChange={setIsDeleteModalOpen}
          imageId={imageToDelete?.id ?? null}
          imageName={imageToDelete?.name ?? null}
          totalImages={totalImages}
        />
      )}
    </>
  );
};

ResultsImages.displayName = "ResultsImages";
