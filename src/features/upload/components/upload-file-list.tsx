import { AnimatePresence, motion } from "framer-motion";
import { memo } from "react";

import { type UploadableFile, type ViewMode } from "@/features/analyze/store/analyze-store";
import { UploadFileItem } from "@/features/upload/components/upload-file-item";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the upload file list component.
 */
type UploadFileListProps = {
  /** The array of file objects to be rendered. */
  files: UploadableFile[];
  /** The current display mode ('list' or 'grid'), which controls the layout. */
  viewMode: ViewMode;
  /** A callback function passed to each child item to handle view/preview actions. */
  onViewFile: (file: UploadableFile) => void;
  /** A callback function passed to each child item to handle file deletion. */
  onDeleteFile: (fileId: string, fileKey: string | null) => void;
  /** A callback function passed to each child item to handle retrying a failed upload. */
  onRetry: (fileId: string) => void;
  /** The ID of the file currently being deleted, to show a pending state on the correct child item. */
  deletingFileId: string | null;
};

/**
 * Renders an animated grid or list of uploaded files. This memoized component
 * orchestrates the layout and animations of its `UploadFileItem` children.
 */
export const UploadFileList = memo(
  ({ files, viewMode, onViewFile, onDeleteFile, onRetry, deletingFileId }: UploadFileListProps) => {
    return (
      <motion.div
        layout
        key={viewMode}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          layout: { type: "tween", duration: 0.6, ease: "easeInOut" },
          opacity: { duration: 0.3 },
        }}
        // Dynamically applies the correct CSS grid classes based on the current view mode.
        className={cn(
          "grid gap-3",
          viewMode === "list"
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        )}
      >
        <AnimatePresence>
          {files.map((file) => (
            <UploadFileItem
              key={file.id}
              file={file}
              viewMode={viewMode}
              onViewFile={onViewFile}
              onDeleteFile={onDeleteFile}
              onRetry={onRetry}
              deletingFileId={deletingFileId}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    );
  }
);

UploadFileList.displayName = "UploadFileList";
