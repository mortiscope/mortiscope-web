import { AnimatePresence, motion, type Variants } from "framer-motion";
import React, { memo } from "react";

import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { PreviewThumbnail } from "@/features/cases/components/preview-thumbnail";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the preview thumbnail list component.
 */
interface PreviewThumbnailListProps {
  /** The pre-sorted array of all files to be displayed as thumbnails. */
  sortedFiles: UploadableFile[];
  /** The file object that is currently being viewed, used to highlight the active thumbnail. */
  activeFile: UploadableFile;
  /** A boolean to apply mobile-specific layout and styling. */
  isMobile: boolean;
  /** A callback function invoked when a thumbnail is clicked, used to change the active file. */
  onSelectFile: (file: UploadableFile) => void;
  /** Framer Motion variants passed from the parent for container-level animations. */
  variants: Variants;
}

/**
 * A memoized component that displays a scrollable, animated row of all uploaded image thumbnails.
 * It highlights the currently active thumbnail and handles selection.
 */
export const PreviewThumbnailList = memo(
  ({ sortedFiles, activeFile, isMobile, onSelectFile, variants }: PreviewThumbnailListProps) => {
    return (
      // The main animated container for the entire thumbnail strip.
      <motion.div
        variants={variants}
        className={cn(
          "shrink-0",
          isMobile ? "absolute bottom-[88px] left-0 z-10 w-full px-4" : "px-6 pt-2"
        )}
      >
        {/* Provides a horizontally scrollable view for the list of thumbnails. */}
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-4 p-3">
            <AnimatePresence>
              {sortedFiles.map((uploadableFile) => (
                <PreviewThumbnail
                  key={uploadableFile.id}
                  uploadableFile={uploadableFile}
                  isActive={uploadableFile.id === activeFile.id}
                  isMobile={isMobile}
                  onClick={() => onSelectFile(uploadableFile)}
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

PreviewThumbnailList.displayName = "PreviewThumbnailList";
