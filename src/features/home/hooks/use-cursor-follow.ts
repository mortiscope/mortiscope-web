import { type MouseEvent, useEffect, useRef, useState } from "react";

/**
 * A custom hook that manages the cursor-following fly image animation.
 */
export const useCursorFollow = (currentWord: number) => {
  /** State to track if the user is currently hovering over one of the designated fly words. */
  const [isHoveringFly, setIsHoveringFly] = useState(false);
  /** A ref to the DOM element of the fly image. */
  const flyImageRef = useRef<HTMLDivElement>(null);
  /** A ref to store the `requestAnimationFrame` ID for cleanup. */
  const flyAnimRef = useRef<number | null>(null);
  /** A ref to store the latest cursor coordinates without causing re-renders on every mouse move. */
  const flyPosRef = useRef({ x: -200, y: -200 });

  /**
   * A side effect that sets up a high-performance animation loop using `requestAnimationFrame`.
   */
  useEffect(() => {
    const loop = () => {
      if (flyImageRef.current) {
        flyImageRef.current.style.transform = `translate3d(${flyPosRef.current.x}px, ${flyPosRef.current.y}px, 0)`;
      }
      flyAnimRef.current = requestAnimationFrame(loop);
    };
    flyAnimRef.current = requestAnimationFrame(loop);
    // Cleanup the animation frame on unmount.
    return () => {
      if (flyAnimRef.current) {
        cancelAnimationFrame(flyAnimRef.current);
      }
    };
  }, []);

  /** A derived boolean to determine if the scroll progress has reached the fly words. */
  const flyWordsActive = currentWord > 22;
  /** Determines if the fly image should be visible based on both hover state and scroll progress. */
  const showFlyImage = isHoveringFly && flyWordsActive;

  return {
    flyImageRef,
    showFlyImage,
    onFlyWordEnter: () => setIsHoveringFly(true),
    onFlyWordLeave: () => setIsHoveringFly(false),
    onFlyWordMove: (e: MouseEvent) => {
      // Updates the ref with the latest cursor position for the animation loop.
      flyPosRef.current = { x: e.clientX, y: e.clientY };
    },
  };
};
