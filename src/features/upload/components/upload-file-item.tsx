import { motion } from "framer-motion";
import { memo } from "react";
import { BsCamera } from "react-icons/bs";
import { IoWarningOutline } from "react-icons/io5";
import { LuLoaderCircle, LuTrash2 } from "react-icons/lu";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { PiMicroscope } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type UploadableFile, type ViewMode } from "@/features/analyze/store/analyze-store";
import { UploadStatusIcon } from "@/features/upload/components/upload-status-icon";
import { UploadThumbnail } from "@/features/upload/components/upload-thumbnail";
import { cn, formatBytes } from "@/lib/utils";

/**
 * Defines the props required by the upload file item component.
 */
type UploadFileItemProps = {
  /** The file object containing its data, metadata, and upload status. */
  file: UploadableFile;
  /** The current display mode, which determines the layout ('list' or 'grid'). */
  viewMode: ViewMode;
  /** A callback function to trigger the file preview modal. */
  onViewFile: (file: UploadableFile) => void;
  /** A callback function to initiate the deletion of the file. */
  onDeleteFile: (fileId: string, fileKey: string | null) => void;
  /** A callback function to retry a failed upload. */
  onRetry: (fileId: string) => void;
  /** The ID of the file currently being deleted, used to show a loading state on the correct item. */
  deletingFileId: string | null;
  /** A callback to open the image type specification modal for this file. */
  onSetImageType: (file: UploadableFile) => void;
};

/**
 * Returns the icon, color, and tooltip label for the image type indicator.
 */
const getImageTypeIndicator = (imageType: UploadableFile["imageType"]) => {
  if (imageType === "macro") {
    return { Icon: PiMicroscope, className: "", label: "Macro" };
  }
  if (imageType === "field") {
    return { Icon: BsCamera, className: "", label: "Field" };
  }
  return {
    Icon: IoWarningOutline,
    className: "",
    label: "Image Type Unspecified",
  };
};

/**
 * Renders a single item in the upload preview list, adapting to either list or grid view modes.
 * This component is memoized to optimize performance in long lists.
 */
export const UploadFileItem = memo(
  ({ file, viewMode, onViewFile, onDeleteFile, onRetry, deletingFileId, onSetImageType }: UploadFileItemProps) => {
    // A derived boolean to determine if this specific item is the one currently being deleted.
    const isDeleting = deletingFileId === file.id;

    // Show the image type icon for files that are either uploading, successful, or queued.
    const showImageTypeIcon = file.status !== "error";
    const imageTypeIndicator = getImageTypeIndicator(file.imageType);

    return (
      <motion.div
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
          "font-inter group relative border-2 border-slate-200 bg-slate-50 transition-colors duration-300 ease-in-out hover:border-emerald-300 hover:bg-emerald-50",
          {
            "flex cursor-pointer items-center justify-between rounded-xl p-2 sm:p-3":
              viewMode === "list",
            "flex aspect-square cursor-pointer flex-col overflow-hidden rounded-2xl":
              viewMode === "grid",
          }
        )}
      >
        {/* Renders the list view layout. */}
        {viewMode === "list" ? (
          <>
            {/* This wrapper makes the thumbnail and file info a single clickable area to view the file. */}
            <div
              className="flex min-w-0 flex-grow items-center gap-3"
              onClick={() => onViewFile(file)}
              role="button"
              tabIndex={0}
              aria-label={`View ${file.name}`}
            >
              <UploadThumbnail uploadableFile={file} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-normal text-slate-700 sm:text-base">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500 sm:text-sm">{formatBytes(file.size)}</p>
              </div>
            </div>
            {/* Container for action buttons (status, image type, view, delete). */}
            <div className="flex flex-shrink-0 items-center gap-1">
              <UploadStatusIcon file={file} onRetry={onRetry} />
              {showImageTypeIcon && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onSetImageType(file)}
                      aria-label={`Set image type for ${file.name}`}
                      className={cn(
                        "h-8 w-8 flex-shrink-0 cursor-pointer transition-colors duration-300 ease-in-out",
                        file.imageType
                          ? "text-slate-500 hover:bg-indigo-100 hover:text-indigo-600"
                          : "text-red-500 hover:bg-red-100 hover:text-red-600"
                      )}
                      disabled={isDeleting}
                    >
                      <imageTypeIndicator.Icon className={cn("h-5 w-5", imageTypeIndicator.className)} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-inter">{imageTypeIndicator.label}</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onViewFile(file)}
                    aria-label={`View ${file.name}`}
                    className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-amber-100 hover:text-amber-600"
                    disabled={isDeleting}
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
                    onClick={() => onDeleteFile(file.id, file.key ?? null)}
                    aria-label={`Remove ${file.name}`}
                    className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-rose-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={isDeleting}
                  >
                    {/* Conditionally renders a loading spinner or a trash icon. */}
                    {isDeleting ? (
                      <LuLoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <LuTrash2 className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-inter">Remove</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </>
        ) : (
          <>
            {/* Renders the grid view layout. */}
            <div
              className="min-h-0 flex-1"
              onClick={() => onViewFile(file)}
              role="button"
              tabIndex={0}
              aria-label={`View ${file.name}`}
            >
              <UploadThumbnail uploadableFile={file} className="h-full w-full" />
            </div>
            <div className="flex w-full flex-col items-center justify-center p-1">
              <div className="mt-1 flex flex-shrink-0 items-center gap-1">
                <UploadStatusIcon file={file} onRetry={onRetry} />
                {showImageTypeIcon && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onSetImageType(file)}
                        aria-label={`Set image type for ${file.name}`}
                        className={cn(
                          "h-8 w-8 flex-shrink-0 cursor-pointer transition-colors duration-300 ease-in-out",
                          file.imageType
                            ? "text-slate-500 hover:bg-indigo-100 hover:text-indigo-600"
                            : "text-red-500 hover:bg-red-100 hover:text-red-600"
                        )}
                        disabled={isDeleting}
                      >
                        <imageTypeIndicator.Icon className={cn("h-5 w-5", imageTypeIndicator.className)} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-inter">{imageTypeIndicator.label}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewFile(file)}
                      aria-label={`View ${file.name}`}
                      className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-amber-100 hover:text-amber-600"
                      disabled={isDeleting}
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
                      onClick={() => onDeleteFile(file.id, file.key ?? null)}
                      aria-label={`Remove ${file.name}`}
                      className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-rose-100 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <LuLoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <LuTrash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-inter">Remove</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </>
        )}
      </motion.div>
    );
  }
);

UploadFileItem.displayName = "UploadFileItem";
