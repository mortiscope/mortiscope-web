import React, { memo } from "react";
import { BeatLoader } from "react-spinners";

/**
 * Defines the props for the review processing overlay component.
 */
interface ReviewProcessingOverlayProps {
  /** The dynamic message to be displayed below the loading indicator. */
  message: string;
}

/**
 * Renders a semi-transparent overlay that appears during processing.
 * This memoized component displays a loading spinner and a dynamic message
 * to inform the user about an ongoing background task.
 *
 * @param {ReviewProcessingOverlayProps} props The props for the component.
 * @returns A React component representing the processing overlay.
 */
export const ReviewProcessingOverlay = memo(({ message }: ReviewProcessingOverlayProps) => {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center space-y-2 rounded-lg bg-white/80 backdrop-blur-sm">
      <BeatLoader color="#16a34a" size={12} />
      <p className="font-plus-jakarta-sans p-2 text-center text-lg font-medium text-slate-700 md:text-xl">
        {message}
      </p>
    </div>
  );
});

ReviewProcessingOverlay.displayName = "ReviewProcessingOverlay";
