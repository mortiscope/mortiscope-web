import { motion, type Variants } from "framer-motion";
import Image from "next/image";
import React, { memo } from "react";
import { AiOutlineSave } from "react-icons/ai";
import { GoPencil } from "react-icons/go";
import { LuDownload, LuLoaderCircle, LuTrash2 } from "react-icons/lu";
import { type ReactZoomPanPinchState, TransformComponent } from "react-zoom-pan-pinch";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { UploadPreviewMinimap } from "@/features/cases/components/upload-preview-minimap";
import { type ViewingBox } from "@/features/cases/hooks/use-preview-modal";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the PreviewImageViewer component.
 */
interface PreviewImageViewerProps {
  /** The currently active file to display. */
  activeFile: UploadableFile;
  /** The URL (local or remote) for the image source. */
  previewUrl: string;
  /** The current rotation angle of the image. */
  rotation: number;
  /** A boolean to apply mobile-specific layouts. */
  isMobile: boolean;
  /** Framer Motion variants for container animations. */
  variants: Variants;
  /** The current pan/zoom state from `react-zoom-pan-pinch`. */
  transformState: ReactZoomPanPinchState;
  /** The viewing box data for the minimap. */
  viewingBox: ViewingBox;
  /** A boolean indicating if the component is in renaming mode. */
  isRenaming: boolean;
  /** A boolean indicating if a rename mutation is in progress. */
  renameMutationIsPending: boolean;
  /** A boolean indicating if a save operation is in progress. */
  isSaving: boolean;
  /** A boolean indicating if a delete operation is in progress. */
  isDeleting: boolean;
  /** A boolean indicating if the rotation has been changed. */
  isRotationDirty: boolean;
  /** A boolean indicating if the name has been changed. */
  isNameDirty: boolean;
  /** A callback function to toggle the renaming mode. */
  onRenameClick: () => void;
  /** A callback function to initiate a download. */
  onDownload: () => void;
  /** A callback function to save any pending changes. */
  onSave: () => void;
  /** A callback function to delete the image. */
  onDelete: () => void;
}

/**
 * A memoized component that renders the main interactive image viewer within the preview modal.
 * It integrates the pannable/zoomable image, a floating action toolbar (desktop), and a minimap (desktop).
 */
export const PreviewImageViewer = memo(
  ({
    activeFile,
    previewUrl,
    rotation,
    isMobile,
    variants,
    transformState,
    viewingBox,
    isRenaming,
    renameMutationIsPending,
    isSaving,
    isDeleting,
    isRotationDirty,
    isNameDirty,
    onRenameClick,
    onDownload,
    onSave,
    onDelete,
  }: PreviewImageViewerProps) => {
    return (
      // The main animated container for the image viewer.
      <motion.div
        variants={variants}
        className={cn(
          "relative w-full cursor-grab overflow-hidden",
          isMobile ? "flex-grow" : "mt-2 h-96 px-6"
        )}
      >
        {/* Renders the floating action toolbar, which is only visible on non-mobile views. */}
        {!isMobile && (
          <div className="absolute top-2 right-8 z-10 flex w-44 items-center justify-around rounded-lg bg-emerald-600/80 py-1 shadow-lg backdrop-blur-sm">
            {/* Rename Button */}
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">Rename</p>
              </TooltipContent>
            </Tooltip>
            {/* Download Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={onDownload}
                  disabled={isSaving || isDeleting}
                  aria-label="Download"
                  className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
                >
                  <LuDownload className="!h-5 !w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">Download</p>
              </TooltipContent>
            </Tooltip>
            {/* Save Button */}
            <Tooltip>
              <TooltipTrigger asChild>
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
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">Save changes</p>
              </TooltipContent>
            </Tooltip>
            {/* Delete Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={onDelete}
                  disabled={isDeleting || isSaving}
                  aria-label="Delete image"
                  className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
                >
                  {isDeleting ? (
                    <LuLoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    <LuTrash2 className="!h-5 !w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">Delete</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        {/* The content that will be transformed (panned/zoomed). */}
        <TransformComponent
          wrapperClass={cn("!w-full !h-full", !isMobile && "bg-slate-100 rounded-2xl")}
          contentClass="!w-full !h-full flex items-center justify-center"
        >
          <Image
            key={previewUrl}
            src={previewUrl}
            alt={`Preview of ${activeFile.name}`}
            fill
            className="object-contain"
            style={{
              transform: `rotate(${rotation}deg)`,
              transformOrigin: "center center",
            }}
            sizes="(max-width: 768px) 100vw, 560px"
          />
        </TransformComponent>
        {/* Renders the minimap for navigation, which is only visible on non-mobile views. */}
        {!isMobile && (
          <UploadPreviewMinimap
            previewUrl={previewUrl}
            rotation={rotation}
            alt={`Minimap preview of ${activeFile.name}`}
            transformState={transformState}
            viewingBox={viewingBox}
          />
        )}
      </motion.div>
    );
  }
);

PreviewImageViewer.displayName = "PreviewImageViewer";
