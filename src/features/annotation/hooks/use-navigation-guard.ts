import equal from "fast-deep-equal";
import { useEffect } from "react";

import { type Detection } from "@/features/images/hooks/use-results-image-viewer";

/**
 * Defines the props required by the use navigation guard hook.
 */
interface UseNavigationGuardProps {
  /** The current, potentially modified array of detection objects. */
  detections: Detection[];
  /** The original, unmodified array of detections to compare against, representing the last saved state. */
  originalDetections: Detection[];
}

/**
 * A custom hook that warns the user about unsaved changes before a user attempt to navigate away
 * from the page. The comparison is performed using a deep equality check for accuracy.
 *
 * @param {UseNavigationGuardProps} props The props for the hook.
 * @returns An object containing a boolean flag `hasUnsavedChanges`.
 */
export const useNavigationGuard = ({ detections, originalDetections }: UseNavigationGuardProps) => {
  /**
   * Performs a deep equality check between the current and original detections.
   */
  const hasUnsavedChanges = !equal(detections, originalDetections);

  /**
   * A side effect to manage the `beforeunload` event listener on the `window` object.
   */
  useEffect(() => {
    /**
     * The function that the browser will call just before the user leaves the page.
     * @param e The `BeforeUnloadEvent` object provided by the browser.
     */
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // If there are unsaved changes, trigger the browser's confirmation prompt.
      if (hasUnsavedChanges) {
        // According to the MDN specification, `preventDefault()` is required to show the prompt in most browsers.
        e.preventDefault();
        e.returnValue = "";
      }
    };

    // Attach the event listener to the window.
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup function to prevents memory leaks.
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Exposes the `hasUnsavedChanges` flag for the consuming component to use.
  return { hasUnsavedChanges };
};
