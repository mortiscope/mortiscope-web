import { useEffect, useRef, useState } from "react";

import { useIsMobile } from "@/hooks/use-mobile";

/**
 * A custom hook that manages the mobile spotlight interaction state.
 */
export const useMobileInteraction = () => {
  /** A custom hook to determine the current viewport for responsive logic. */
  const isMobile = useIsMobile();
  /** Manages the 'active' state of the logo, specifically for mobile interactions. */
  const [isMobileLogoActive, setIsMobileLogoActive] = useState(false);
  /**
   * A ref to store the `setTimeout` timer. Persists the timer ID across re-renders without triggering them.
   */
  const mobileLogoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * A cleanup effect that runs on component unmount. It ensures that any active
   * timeout is cleared, preventing potential memory leaks if the component
   * unmounts before the timer fires.
   */
  useEffect(() => {
    // The returned function is the cleanup handler.
    return () => {
      if (mobileLogoTimeoutRef.current) {
        clearTimeout(mobileLogoTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handles click or touch events on the logo, specifically for mobile devices.
   * @param e The React mouse or touch event.
   */
  const handleLogoInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    // This interaction is disabled on non-mobile devices.
    if (!isMobile) return;
    e.stopPropagation();

    // Clear any previously existing timeout to reset the timer on a new interaction.
    if (mobileLogoTimeoutRef.current) {
      clearTimeout(mobileLogoTimeoutRef.current);
    }

    // Activate the mobile-specific UI state.
    setIsMobileLogoActive(true);

    // Set a new timeout to automatically deactivate the state after 3 seconds.
    mobileLogoTimeoutRef.current = setTimeout(() => {
      setIsMobileLogoActive(false);
    }, 3000);
  };

  /**
   * Handles clicks outside the logo area. It immediately deactivates the logo's
   * active state and cancels the pending timeout.
   */
  const handleOutsideClick = () => {
    if (isMobile && isMobileLogoActive) {
      setIsMobileLogoActive(false);
      // Also clear the timeout to prevent it from firing unnecessarily later.
      if (mobileLogoTimeoutRef.current) {
        clearTimeout(mobileLogoTimeoutRef.current);
      }
    }
  };

  return {
    isMobile,
    isMobileLogoActive,
    handleLogoInteraction,
    handleOutsideClick,
  };
};
