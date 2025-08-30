import { motion, type Variants } from "framer-motion";
import React, { memo } from "react";
import { AiOutlineSave } from "react-icons/ai";
import { GoPencil } from "react-icons/go";
import { LuDownload, LuLoaderCircle, LuTrash2, LuX } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { cn, formatBytes } from "@/lib/utils";

/**
 * Defines the props required by the preview modal header component.
 */
interface PreviewModalHeaderProps {
  /** The currently active file being previewed. */
  activeFile: UploadableFile;
  /** The full file name currently displayed in the UI. */
  displayFileName: string;
  /** The base name of the file, used for editing. */
  fileNameBase: string;
  /** The natural dimensions of the image, or null if not yet loaded. */
  imageDimensions: { width: number; height: number } | null;
  /** A boolean to apply the mobile-specific layout. */
  isMobile: boolean;
  /** A boolean indicating if the component is in renaming mode. */
  isRenaming: boolean;
  /** A boolean indicating if a save operation is in progress. */
  isSaving: boolean;
  /** A boolean indicating if a delete operation is in progress. */
  isDeleting: boolean;
  /** A boolean indicating if the file's name has been changed by the user. */
  isNameDirty: boolean;
  /** A boolean indicating if the image's rotation has been changed. */
  isRotationDirty: boolean;
  /** A boolean indicating if a server-side rename mutation is pending. */
  renameMutationIsPending: boolean;
  /** A ref to the title input element for programmatic focus and selection. */
  titleInputRef: React.Ref<HTMLInputElement>;
  /** Framer Motion variants for container animations. */
  variants: Variants;
  /** A callback function to close the modal. */
  onClose: () => void;
  /** A callback function to initiate deleting the file. */
  onDelete: () => void;
  /** A callback function to initiate downloading the file. */
  onDownload: () => void;
  /** A callback function to handle changes to the file name input. */
  onNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** A callback function to toggle the renaming mode. */
  onRenameClick: () => void;
  /** A callback function to save pending changes. */
  onSave: () => void;
  /** A callback function to set the renaming state. */
  onSetIsRenaming: (isRenaming: boolean) => void;
}

/**
 * A memoized component that renders the header for the preview modal.
 * It features two distinct layouts: a floating bar with all actions for mobile,
 * and a traditional header with file metadata for desktop.
 */
export const PreviewModalHeader = memo(
  ({
    activeFile,
    displayFileName,
    fileNameBase,
    imageDimensions,
    isMobile,
    isRenaming,
    isSaving,
    isDeleting,
    isNameDirty,
    isRotationDirty,
    renameMutationIsPending,
    titleInputRef,
    variants,
    onClose,
    onDelete,
    onDownload,
    onNameChange,
    onRenameClick,
    onSave,
    onSetIsRenaming,
  }: PreviewModalHeaderProps) => {
    /**
     * Handles keyboard events for the rename input field.
     */
    const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // Blur the input to trigger the `onBlur` event, which handles exiting renaming mode.
        if (titleInputRef && typeof titleInputRef !== "function" && titleInputRef.current) {
          titleInputRef.current.blur();
        }
      }
      if (e.key === "Escape") onSetIsRenaming(false);
    };

    // Renders a floating bar at the top of the screen containing the title and all action buttons.
    if (isMobile) {
      return (
        <motion.div
          variants={variants}
          className="absolute top-0 right-0 left-0 z-20 flex items-center justify-between gap-4 rounded-none bg-emerald-600/80 p-4 shadow-lg backdrop-blur-sm"
        >
          {/* File name section (editable or static) */}
          <div className="min-w-0 flex-grow">
            {isRenaming ? (
              <Input
                ref={titleInputRef}
                value={fileNameBase}
                onChange={onNameChange}
                onKeyDown={handleNameKeyDown}
                onBlur={() => onSetIsRenaming(false)}
                className="h-auto w-full truncate border-none bg-transparent p-0 text-lg font-bold text-white shadow-none placeholder:text-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            ) : (
              <h2 className="font-plus-jakarta-sans truncate text-lg font-bold text-white">
                {displayFileName}
              </h2>
            )}
          </div>
          {/* Action buttons section */}
          <div className="flex flex-shrink-0 items-center">
            <Button
              variant="ghost"
              onClick={onRenameClick}
              disabled={isRenaming || renameMutationIsPending || isSaving || isDeleting}
              aria-label="Rename image"
              className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
            >
              {renameMutationIsPending ? (
                <LuLoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <GoPencil className="!h-5 !w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={onDownload}
              disabled={isSaving || isDeleting}
              aria-label="Download"
              className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
            >
              <LuDownload className="!h-5 !w-5" />
            </Button>
            <Button
              variant="ghost"
              onClick={onSave}
              disabled={(!isRotationDirty && !isNameDirty) || isSaving || isDeleting}
              aria-label="Save"
              className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
            >
              {isSaving ? (
                <LuLoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <AiOutlineSave className="!h-5 !w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              onClick={onDelete}
              disabled={isDeleting || isSaving}
              aria-label="Delete"
              className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
            >
              {isDeleting ? (
                <LuLoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <LuTrash2 className="!h-5 !w-5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
              aria-label="Close"
            >
              <LuX className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      );
    }

    // Renders a standard dialog header with the file title and metadata.
    return (
      <motion.div variants={variants} className="px-6 pt-0 pb-0 md:pt-6">
        <DialogHeader className={cn(isMobile && "sr-only")}>
          {isRenaming ? (
            // Renders an input field when in renaming mode.
            <Input
              ref={titleInputRef}
              value={fileNameBase}
              onChange={onNameChange}
              onKeyDown={handleNameKeyDown}
              onBlur={() => onSetIsRenaming(false)}
              className="font-plus-jakarta-sans mx-auto h-auto w-full max-w-sm truncate border-none bg-transparent p-0 text-center text-xl font-bold text-emerald-600 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:max-w-md md:text-2xl"
            />
          ) : (
            // Renders a static title when not renaming.
            <DialogTitle className="font-plus-jakarta-sans mx-auto w-full max-w-sm truncate text-center text-xl font-bold text-emerald-600 md:max-w-md md:text-2xl">
              {displayFileName}
            </DialogTitle>
          )}
          {/* Renders file metadata (date, dimensions, size). */}
          <DialogDescription className="font-inter flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-slate-600">
            <span>{new Date(activeFile.dateUploaded).toLocaleDateString()}</span>
            {imageDimensions && (
              <>
                <span className="hidden text-slate-400 sm:inline">•</span>
                <span>
                  {imageDimensions.width} x {imageDimensions.height}
                </span>
              </>
            )}
            <span className="hidden text-slate-400 sm:inline">•</span>
            <span>{formatBytes(activeFile.size)}</span>
          </DialogDescription>
        </DialogHeader>
      </motion.div>
    );
  }
);

PreviewModalHeader.displayName = "PreviewModalHeader";
