import { motion } from "framer-motion";
import Image from "next/image";
import * as React from "react";
import { LuLoaderCircle, LuTrash2 } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the CaptureImageThumbnail component.
 */
type CaptureImageThumbnailProps = {
  /** The file object containing the image data and metadata. */
  uploadableFile: UploadableFile;
  /** Callback function invoked when the remove button is clicked. */
  onRemove: () => void;
  /** A boolean to apply mobile-specific styling. */
  isMobile: boolean;
  /** A boolean to show a loading state on the remove button during deletion. */
  isDeleting: boolean;
};

/**
 * Renders an animated thumbnail for a captured or uploaded image.
 * It generates a local preview URL for the file, displays it, and provides a
 * remove button with a pending state. The component is memoized for performance.
 *
 * @param {CaptureImageThumbnailProps} props The props for the component.
 * @returns A React component representing the image thumbnail.
 */
export const CaptureImageThumbnail = React.memo(
  ({ uploadableFile, onRemove, isMobile, isDeleting }: CaptureImageThumbnailProps) => {
    const { file } = uploadableFile;
    // State to hold the temporary local URL for the image preview.
    const [previewUrl, setPreviewUrl] = React.useState<string>("");

    /**
     * Creates a local object URL for the image file to enable a preview.
     * This effect runs when the file changes and includes a cleanup function
     * to revoke the object URL, preventing memory leaks.
     */
    React.useEffect(() => {
      if (file) {
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        // Cleanup function to free memory when the component unmounts or the file changes.
        return () => URL.revokeObjectURL(objectUrl);
      }
    }, [file]);

    // Renders a skeleton loader while the preview URL is being generated.
    if (!file || !previewUrl) {
      return <div className="h-16 w-16 flex-shrink-0 animate-pulse rounded-lg bg-slate-200" />;
    }

    return (
      // The main animated container for the thumbnail, using Framer Motion for effects.
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "tween", duration: 0.4, ease: "easeInOut" }}
        className={cn(
          "relative h-16 w-16 flex-shrink-0 rounded-lg",
          isMobile && "ring-2 ring-emerald-400/60 ring-offset-black/50"
        )}
      >
        {/* Next.js Image component for optimized image rendering. */}
        <Image
          src={previewUrl}
          alt={`Captured: ${file.name}`}
          fill
          className="rounded-lg object-cover"
          sizes="64px"
        />
        {/* An absolutely positioned button to remove the image. */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={isDeleting}
          aria-label={`Remove ${file.name}`}
          className="absolute -top-2 -right-2 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-rose-200 text-rose-400 transition-all duration-300 ease-in-out hover:bg-rose-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {/* Shows a spinner during deletion, otherwise a trash icon. */}
          {isDeleting ? (
            <LuLoaderCircle className="h-3 w-3 animate-spin" />
          ) : (
            <LuTrash2 className="h-3 w-3" />
          )}
        </Button>
      </motion.div>
    );
  }
);

CaptureImageThumbnail.displayName = "CaptureImageThumbnail";
