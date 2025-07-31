import { type UseMutationResult } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { CaptureImageThumbnail } from "@/features/cases/components/capture-image-thumbnail";
import { type ServerActionResponse } from "@/features/cases/constants/types";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the CaptureThumbnailList component.
 */
type CaptureThumbnailListProps = {
  /** An array of file objects to be displayed as thumbnails. */
  cameraFiles: UploadableFile[];
  /** A callback function to initiate the removal of a specific file. */
  onRemoveFile: (file: UploadableFile) => void;
  /** A boolean to apply mobile-specific layout and styling. */
  isMobile: boolean;
  /** The mutation result object from Tanstack Query for handling file deletions. */
  deleteMutation: UseMutationResult<ServerActionResponse, Error, { key: string }, unknown>;
};

/**
 * Renders a memoized, scrollable, and animated list of captured image thumbnails.
 * It handles the display and removal of individual items with animations.
 */
export const CaptureThumbnailList = React.memo(
  ({ cameraFiles, onRemoveFile, isMobile, deleteMutation }: CaptureThumbnailListProps) => {
    // If there are no files, the component renders nothing.
    if (cameraFiles.length === 0) {
      return null;
    }

    return (
      // Animates the entire thumbnail list container into view.
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={cn(
          "shrink-0",
          isMobile ? "absolute bottom-[88px] left-0 z-10 w-full px-4" : "px-6 pb-0"
        )}
      >
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-3 px-1 py-3">
            {/* Enables exit animations for items when they are removed from the list. */}
            <AnimatePresence>
              {cameraFiles.map((uploadableFile) => (
                <CaptureImageThumbnail
                  key={uploadableFile.id}
                  uploadableFile={uploadableFile}
                  onRemove={() => onRemoveFile(uploadableFile)}
                  isMobile={isMobile}
                  // Determines if this specific thumbnail is the one currently being deleted.
                  isDeleting={
                    deleteMutation.isPending && deleteMutation.variables?.key === uploadableFile.key
                  }
                />
              ))}
            </AnimatePresence>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </motion.div>
    );
  }
);

CaptureThumbnailList.displayName = "CaptureThumbnailList";
