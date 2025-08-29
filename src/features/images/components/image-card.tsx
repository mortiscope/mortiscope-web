import { motion } from "framer-motion";
import Image from "next/image";
import React, { memo } from "react";
import { GoUnverified, GoVerified } from "react-icons/go";
import { HiOutlinePencilSquare } from "react-icons/hi2";
import { LuDownload, LuTrash2 } from "react-icons/lu";
import { MdOutlineRemoveRedEye } from "react-icons/md";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type ImageFile } from "@/features/images/components/results-images";
import { cn } from "@/lib/utils";

/**
 * A sub-component responsible for rendering the actual image thumbnail. It handles
 * the loading skeleton state and applies a cache-busting version query to the image URL.
 */
const Thumbnail = ({ imageFile, className }: { imageFile: ImageFile; className?: string }) => {
  // Renders a skeleton loader while the image URL is being processed or is unavailable.
  if (!imageFile.url) {
    return (
      <div className={cn("flex-shrink-0 rounded-md bg-slate-200", className || "h-10 w-10")} />
    );
  }
  // Appends a version query to the URL to bypass the browser cache and ensure the latest image is shown.
  const cacheBustedUrl = `${imageFile.url}?v=${imageFile.version}`;
  return (
    <div
      className={cn("relative flex-shrink-0 overflow-hidden", className || "h-10 w-10 rounded-md")}
    >
      <Image
        src={cacheBustedUrl}
        alt={`Preview of ${imageFile.name}`}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />
    </div>
  );
};

/**
 * Defines the props for the ImageCard component.
 */
interface ImageCardProps {
  /** The data object for the image to be displayed. */
  imageFile: ImageFile;
  /** The current sort option, used as a key to trigger re-animation on sort changes. */
  sortOption: string;
  /** A callback function invoked when the view action is triggered. */
  onView: (imageId: string) => void;
  /** A callback function to initiate editing/annotation of the image. */
  onEdit: (imageFile: ImageFile) => void;
  /** A callback function to initiate a download/export of the image. */
  onExport: (imageFile: ImageFile) => void;
  /** A callback function to initiate the deletion of the image. */
  onDelete: (imageFile: ImageFile) => void;
}

/**
 * A memoized component that renders a single, animated image card. It composes the
 * `Thumbnail` and an action toolbar, and uses the `sortOption` prop to trigger
 * re-animation when the list is re-sorted.
 */
export const ImageCard = memo(
  ({ imageFile, sortOption, onView, onEdit, onExport, onDelete }: ImageCardProps) => {
    // Check if the image has detections and if all are verified
    const hasDetections = imageFile.detections && imageFile.detections.length > 0;
    const isFullyVerified =
      hasDetections && imageFile.detections!.every((d) => d.status === "user_confirmed");

    return (
      <motion.div
        layout
        key={`${sortOption}-${imageFile.id}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className="font-inter group relative flex aspect-square flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-50 transition-colors duration-300 ease-in-out hover:border-emerald-300 hover:bg-emerald-50 lg:rounded-3xl"
      >
        {/* The main image area is a large clickable target to trigger the `onView` action. */}
        <div
          className="relative min-h-0 flex-1 cursor-pointer"
          onClick={() => onView(imageFile.id)}
        >
          <Thumbnail imageFile={imageFile} className="h-full w-full" />
          {/* Verification status icon which will only be shown if image has detections */}
          {hasDetections && (
            <div className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5 shadow-md">
              {isFullyVerified ? (
                <GoVerified className="h-4 w-4 text-emerald-600 md:h-5 md:w-5" />
              ) : (
                <GoUnverified className="h-4 w-4 text-amber-600 md:h-5 md:w-5" />
              )}
            </div>
          )}
        </div>
        {/* A toolbar at the bottom of the card containing action buttons. */}
        <div className="flex w-full flex-col items-center justify-center p-1">
          <div className="my-1 flex flex-shrink-0 items-center gap-0.5 lg:gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`View ${imageFile.name}`}
                  onClick={() => onView(imageFile.id)}
                  className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-amber-100 hover:text-amber-600"
                >
                  <MdOutlineRemoveRedEye className="h-4 w-4 md:h-5 md:w-5" />
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
                  aria-label={`Edit ${imageFile.name}`}
                  onClick={() => onEdit(imageFile)}
                  className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-sky-100 hover:text-sky-600"
                >
                  <HiOutlinePencilSquare className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">Edit</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Download ${imageFile.name}`}
                  onClick={() => onExport(imageFile)}
                  className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-emerald-100 hover:text-emerald-600"
                >
                  <LuDownload className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">Download</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Delete ${imageFile.name}`}
                  onClick={() => onDelete(imageFile)}
                  className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-rose-100 hover:text-rose-600"
                >
                  <LuTrash2 className="h-4 w-4 md:h-5 md:w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-inter">Delete</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </motion.div>
    );
  }
);

ImageCard.displayName = "ImageCard";
