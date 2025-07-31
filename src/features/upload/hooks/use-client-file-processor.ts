"use client";

import { toast } from "sonner";

import { type UploadableFile } from "@/features/analyze/store/analyze-store";

/**
 * A hook to encapsulate complex client-side file processing logic.
 */
export const useClientFileProcessor = () => {
  /**
   * Ensures the binary data of a file is available, fetching it from a URL if necessary.
   *
   * @param file The file to process.
   * @returns A Promise that resolves to a File object with the binary data.
   */
  const ensureFileBlob = async (file: UploadableFile): Promise<File> => {
    // If the blob is already available, return it.
    if (file.file) return file.file;
    // If there's no URL to fetch from, it's an unrecoverable error.
    if (!file.url) throw new Error("File data is missing.");

    try {
      const response = await fetch(file.url);
      if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
      const blob = await response.blob();
      return new File([blob], file.name, { type: file.type });
    } catch (error) {
      console.error("Fetch error in ensureFileBlob:", error);
      throw new Error("Could not fetch original image for editing.");
    }
  };

  /**
   * Rotates an image file using an offscreen canvas and returns a new File object.
   *
   * @param file The file to rotate.
   * @param rotation The desired rotation in degrees.
   * @returns A Promise that resolves to a new, rotated File object.
   */
  const processRotation = async (file: File, rotation: number): Promise<File> => {
    // If no rotation is needed, return the original file for efficiency.
    if (rotation === 0) return file;

    const image = new window.Image();
    const url = URL.createObjectURL(file);
    image.crossOrigin = "anonymous";

    const rotatedBlob = await new Promise<Blob | null>((resolve) => {
      image.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);

        // Swap canvas dimensions for 90/270 degree rotations.
        if (rotation === 90 || rotation === 270) {
          canvas.width = image.naturalHeight;
          canvas.height = image.naturalWidth;
        } else {
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
        }

        // Perform the rotation transformation.
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

        // Export the canvas content as a blob.
        canvas.toBlob(resolve, file.type, 1.0);
      };
      image.onerror = () => resolve(null);
      image.src = url;
    });

    // Clean up the temporary object URL.
    URL.revokeObjectURL(url);
    if (!rotatedBlob) throw new Error("Could not process image for rotation.");

    return new File([rotatedBlob], file.name, { type: file.type });
  };

  /**
   * Triggers a browser download for a file, applying rotation if necessary.
   *
   * @param file The metadata of the file to download.
   * @param previewUrl The URL to fetch the file's blob from.
   * @param rotation The rotation to apply before downloading.
   */
  const downloadFile = async (file: UploadableFile, previewUrl: string, rotation: number) => {
    try {
      // Fetch the image data, then process it for rotation.
      const blob = await fetch(previewUrl).then((res) => res.blob());
      const processedFile = await processRotation(
        new File([blob], file.name, { type: file.type }),
        rotation
      );

      // Create a temporary link and click it to trigger the download.
      const url = URL.createObjectURL(processedFile);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Download failed.");
    }
  };

  return { ensureFileBlob, processRotation, downloadFile };
};
