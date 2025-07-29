import { useEffect, useState } from "react";
import { type ReactZoomPanPinchState } from "react-zoom-pan-pinch";

import { type UploadableFile } from "@/features/analyze/store/analyze-store";

/**
 * Defines the shape of the viewing box data used for a minimap component.
 * It holds the dimensions of both the content (the image) and its container.
 */
export interface ViewingBox {
  /** The dimensions of the main content (e.g., the image). */
  content?: { width: number; height: number };
  /** The dimensions of the container wrapping the content. */
  wrapper?: { width: number; height: number };
}

/**
 * A custom hook that manages the transformation state (pan, zoom) of an image preview.
 * It also handles the state for a corresponding minimap's viewing box and resets the state
 * whenever the active file changes or the preview modal is re-opened.
 *
 * @param activeFile - The file currently being displayed in the preview. Used as a dependency to reset state.
 * @param isOpen - The open state of the preview modal. Also used as a dependency for state reset.
 * @returns An object containing the transform state, viewing box state, and their respective setter functions.
 */
export const usePreviewTransform = (activeFile: UploadableFile | null, isOpen: boolean) => {
  // State to store the current pan and zoom values from the `react-zoom-pan-pinch` library.
  const [transformState, setTransformState] = useState<ReactZoomPanPinchState>({
    scale: 1,
    positionX: 0,
    positionY: 0,
    previousScale: 1,
  });
  // State to store the dimensions of the image and its container, used for rendering a minimap.
  const [viewingBox, setViewingBox] = useState<ViewingBox>({});

  // Resets the zoom/pan and viewing box state whenever the active file changes.
  useEffect(() => {
    if (activeFile) {
      setTransformState({ scale: 1, positionX: 0, positionY: 0, previousScale: 1 });
      setViewingBox({});
    }
  }, [activeFile, isOpen]);

  return {
    transformState,
    setTransformState,
    viewingBox,
    setViewingBox,
  };
};
