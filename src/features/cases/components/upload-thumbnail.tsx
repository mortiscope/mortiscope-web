import Image from "next/image";
import { memo, useEffect, useState } from "react";

import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the upload thumbnail component.
 */
type ThumbnailProps = {
  /** The file object, which may contain a remote URL or a local File object. */
  uploadableFile: UploadableFile;
  /** Optional CSS classes to customize the size and styling of the thumbnail container. */
  className?: string;
};

/**
 * Creates a temporary local URL for a File object or uses a remote URL to render an image thumbnail.
 * It includes logic for cache-busting already uploaded files and is memoized for performance.
 */
export const UploadThumbnail = memo(({ uploadableFile, className }: ThumbnailProps) => {
  // State to store the URL used for the image preview, which can be a remote URL or a local object URL.
  const [previewUrl, setPreviewUrl] = useState<string>("");

  /**
   * Generates the appropriate preview URL for the given file.
   */
  useEffect(() => {
    // The file is already uploaded and has a persistent URL.
    if (uploadableFile.url) {
      // Append a version query parameter to bypass browser cache if the image is updated.
      const cacheBustedUrl = `${uploadableFile.url}?v=${uploadableFile.version}`;
      setPreviewUrl(cacheBustedUrl);
      return;
    }

    // The file is a local `File` object that needs a temporary preview URL.
    if (uploadableFile.file) {
      const objectUrl = URL.createObjectURL(uploadableFile.file);
      setPreviewUrl(objectUrl);
      // Revoke the object URL when the component unmounts or the dependency changes to free up memory.
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [uploadableFile]);

  // Renders a skeleton placeholder while the preview URL is being generated.
  if (!previewUrl) {
    return (
      <div className={cn("flex-shrink-0 rounded-md bg-slate-200", className || "h-10 w-10")} />
    );
  }

  // The main container for the rendered thumbnail.
  return (
    <div
      className={cn("relative flex-shrink-0 overflow-hidden", className || "h-10 w-10 rounded-md")}
    >
      <Image
        src={previewUrl}
        alt={`Preview of ${uploadableFile.name}`}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />
    </div>
  );
});

UploadThumbnail.displayName = "UploadThumbnail";
