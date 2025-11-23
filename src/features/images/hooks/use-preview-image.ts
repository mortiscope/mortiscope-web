import { useEffect, useState } from "react";

import { type UploadableFile } from "@/features/analyze/store/analyze-store";

/**
 * A custom hook that manages the logic for generating a preview URL for an image file
 * and asynchronously determining its natural dimensions. It handles both already uploaded
 * files (with a remote URL) and new local files (using temporary object URLs).
 *
 * @param activeFile - The file to be previewed. The hook's effects are triggered when this prop changes.
 * @returns An object containing the generated `previewUrl` and the `imageDimensions` of the loaded image.
 */
export const usePreviewImage = (activeFile: UploadableFile | null) => {
  // State to store the URL (either remote or local) that can be used in an `<img>` src attribute.
  const [previewUrl, setPreviewUrl] = useState<string>("");
  // State to store the natural width and height of the image once it has been loaded in the background.
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  /**
   * This effect is the core of the hook. It runs whenever the `activeFile` changes
   * to generate a new preview URL and fetch the image's dimensions. It also includes
   * a critical cleanup function to prevent memory leaks.
   */
  useEffect(() => {
    // If there is no active file, reset all state to its initial values.
    if (!activeFile) {
      setPreviewUrl("");
      setImageDimensions(null);
      return;
    }

    let objectUrl: string | undefined;
    let currentPreviewUrl = "";

    // Determine the source URL: a presigned remote URL or a new local object URL.
    if (activeFile.url) {
      // For already uploaded files, use the presigned URL directly (no cache-busting needed).
      currentPreviewUrl = activeFile.url;
    } else if (activeFile.file) {
      // For new local files, create a temporary, in-memory URL.
      objectUrl = URL.createObjectURL(activeFile.file);
      currentPreviewUrl = objectUrl;
    }

    setPreviewUrl(currentPreviewUrl);

    // Asynchronously load the image in the background to retrieve its natural dimensions.
    if (currentPreviewUrl) {
      const image = new window.Image();
      image.onload = () =>
        setImageDimensions({ width: image.naturalWidth, height: image.naturalHeight });
      image.src = currentPreviewUrl;
    } else {
      setImageDimensions(null);
    }

    // If a temporary object URL was created, this function revokes it when
    // the component unmounts or the effect re-runs, preventing memory leaks.
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeFile]);

  return {
    previewUrl,
    imageDimensions,
  };
};
