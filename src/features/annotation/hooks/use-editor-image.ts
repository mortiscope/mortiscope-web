"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getEditorImage } from "@/features/annotation/actions/get-editor-image";
import { type Detection } from "@/features/images/hooks/use-results-image-viewer";

// Export detection type for use in editor components
export type { Detection };

/**
 * Defines the client-side data structure for the editor image.
 */
export interface EditorImage {
  id: string;
  name: string;
  url: string;
  size: number;
  dateUploaded: Date;
  detections?: Detection[];
}

/**
 * A custom hook that fetches the current image data with detections for the annotation editor.
 * It uses the route parameters to determine which image to fetch and manages the loading state.
 *
 * @returns An object containing the image data and loading state.
 */
export const useEditorImage = () => {
  const params = useParams();
  const [image, setImage] = useState<EditorImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchImage = async () => {
      // Extract the imageId and resultsId from the route parameters.
      const imageId = params?.imageId as string | undefined;
      const resultsId = params?.resultsId as string | undefined;

      // If either parameter is missing, we're not on an image edit route.
      if (!imageId || !resultsId) {
        setImage(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const imageData = await getEditorImage(imageId, resultsId);
        setImage(imageData);
      } catch (error) {
        console.error("Error fetching editor image:", error);
        setImage(null);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchImage();
  }, [params]);

  return {
    image,
    isLoading,
  };
};
