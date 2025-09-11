"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A custom hook that detects the currently active section of a page based on the user's scroll position.
 * @param sectionIds An array of string IDs corresponding to the HTML `id` attributes of the sections to be tracked.
 * @returns An object containing the `activeId`, a function to `setActiveId`, and a ref `isScrollingRef`.
 */
export function useActiveSection(sectionIds: string[]) {
  /** State to store the ID of the currently active section. */
  const [activeId, setActiveId] = useState<string>("");
  /** A ref to track whether a programmatic scroll is in progress. */
  const isScrollingRef = useRef(false);

  /**
   * This effect sets up and tears down the scroll event listener.
   */
  useEffect(() => {
    /**
     * The core handler that calculates which section is currently active based on scroll position.
     */
    const handleScroll = () => {
      // If a programmatic scroll is happening, ignore the event to prevent conflicts.
      if (isScrollingRef.current) {
        return;
      }

      // Defines the trigger line for a section to be considered active.
      const scrollPosition = window.scrollY + 128;

      // Default to the first section if no other section matches.
      let currentSectionId = sectionIds[0];

      // Iterate backwards through the section IDs.
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const element = document.getElementById(sectionIds[i]);
        if (element) {
          // Calculate the element's absolute position from the top of the document.
          const rect = element.getBoundingClientRect();
          const elementTop = rect.top + window.scrollY;

          // Check if the element's top has passed the trigger line.
          const tolerance = 2;
          if (elementTop <= scrollPosition + tolerance) {
            currentSectionId = sectionIds[i];
            break;
          }
        }
      }

      // Update the state with the new active section ID.
      setActiveId(currentSectionId);
    };

    // Run the handler once on mount to set the initial active section.
    handleScroll();

    // A simple throttle implementation to limit how often `handleScroll` is called.
    let timeoutId: NodeJS.Timeout;
    const throttledScroll = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(handleScroll, 50);
    };

    // Attach the throttled scroll listener to the window.
    window.addEventListener("scroll", throttledScroll, { passive: true });

    // Removes the event listener and clears any pending timeouts when the component unmounts.
    return () => {
      window.removeEventListener("scroll", throttledScroll);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [sectionIds]);

  // Exposes the public API of the hook.
  return { activeId, setActiveId, isScrollingRef };
}
