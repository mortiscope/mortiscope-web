import Image from "next/image";
import React, { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

// Interface for Custom Cursor component props
interface CustomCursorProps {
  // Ref to the HTML element that will host the custom cursor
  containerRef: React.RefObject<HTMLElement | null>;
  // Optional: URL string for an image icon
  iconSrc?: string;
  // Optional: ReactNode for a custom icon element
  iconElement?: ReactNode;
  // Optional: Size for the icon
  iconSize?: number;
  // Optional: Additional CSS classes for the cursor element
  className?: string;
  // Optional: Additional CSS classes for the icon wrapper/icon itself
  iconClassName?: string;
  // Optional: Array of CSS selectors for elements that should revert to native cursor behavior
  interactiveSelectors?: string[];
  // Optional: Tailwind class for transition duration
  transitionDurationClass?: string;
}

// Default CSS selectors for interactive elements where the custom cursor should be hidden
const DEFAULT_INTERACTIVE_SELECTORS = [
  "a",
  "button",
  '[role="button"]',
  "input",
  "textarea",
  "select",
  "[data-cursor-interactive]",
  // Standard CSS cursor styles that imply interactivity
  ".cursor-grab",
  ".cursor-grabbing",
  ".cursor-help",
  ".cursor-move",
  ".cursor-not-allowed",
  ".cursor-none",
  ".cursor-pointer",
  ".cursor-progress",
  ".cursor-text",
  ".cursor-wait",
  // Add more interactive selectors as needed
];

// Custom Cursor component definition
export const CustomCursor: React.FC<CustomCursorProps> = ({
  containerRef,
  iconSrc,
  iconElement,
  iconSize = 24,
  className: propClassName,
  iconClassName: propIconClassName,
  interactiveSelectors = DEFAULT_INTERACTIVE_SELECTORS,
  transitionDurationClass = "duration-200",
}) => {
  // State for cursor position (x, y coordinates)
  const [position, setPosition] = useState({ x: -100, y: -100 });
  // State for cursor visibility within the container
  const [isVisible, setIsVisible] = useState(false);
  // State to track if the mouse is hovering over an interactive element
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  // State to ensure component is mounted before attempting DOM manipulations or showing cursor
  const [isMounted, setIsMounted] = useState(false);

  // Ref for the main cursor DOM element for direct manipulation
  const cursorOuterRef = useRef<HTMLDivElement>(null);
  // Ref for the requestAnimationFrame ID to manage the animation loop
  const animationFrameRef = useRef<number | null>(null);

  // Effect to set isMounted to true once the component mounts
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Callback to update the cursor's visual position using transform for performance
  const updateCursorVisualPosition = useCallback(() => {
    if (cursorOuterRef.current) {
      cursorOuterRef.current.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
    }
  }, [position.x, position.y]);

  // Effect to run the animation loop for smooth cursor movement
  useEffect(() => {
    const loop = () => {
      updateCursorVisualPosition();
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      // Cleanup: Cancel the animation frame when component unmounts or effect re-runs
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateCursorVisualPosition]);

  // Derived state: Determines if the custom cursor should be actively shown
  const showCustomCursorActive = isMounted && isVisible && !isHoveringInteractive;

  // Main effect for handling mouse events and cursor visibility logic
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const originalContainerCursor = container.style.cursor;

    // Handles mouse movement within the container
    const handleMouseMove = (event: MouseEvent) => {
      setPosition({ x: event.clientX, y: event.clientY });
      const target = event.target as HTMLElement;

      // Check if the target or its parents match any interactive selectors
      const isInteractive = interactiveSelectors.some((selector) => {
        try {
          return target.closest(selector);
        } catch (e) {
          // Warn if a selector is invalid to help debugging
          console.warn(`[CustomCursor] Invalid selector: ${selector}`, e);
          return false;
        }
      });
      setIsHoveringInteractive(isInteractive);
    };

    // Show cursor when mouse enters the container
    const handleMouseEnter = () => setIsVisible(true);
    // Hide cursor when mouse leaves the container
    const handleMouseLeave = () => setIsVisible(false);

    // Add event listeners to the container
    container.addEventListener("mousemove", handleMouseMove, { passive: true });
    container.addEventListener("mouseenter", handleMouseEnter);
    container.addEventListener("mouseleave", handleMouseLeave);

    // Hide the native browser cursor if our custom cursor is active
    if (showCustomCursorActive) {
      container.style.cursor = "none";
    } else {
      // Restore original or default cursor if custom cursor is not active
      container.style.cursor = originalContainerCursor || "";
    }

    // Cleanup function: Remove event listeners and restore original cursor style
    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseenter", handleMouseEnter);
      container.removeEventListener("mouseleave", handleMouseLeave);
      container.style.cursor = originalContainerCursor || "";
      // Cancel animation frame as a safeguard
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [containerRef, interactiveSelectors, showCustomCursorActive]);

  // Merge base, conditional, and prop classes for the cursor element
  const finalCursorClasses = twMerge(
    "rounded-full flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2",
    "pointer-events-none",
    "w-12 h-12",
    "bg-slate-900",
    "shadow-lg",
    "transition-all ease-out",
    transitionDurationClass,
    showCustomCursorActive ? "opacity-100 scale-100" : "opacity-0 scale-0",
    propClassName
  );

  // Merge classes for the icon wrapper
  const finalIconWrapperClasses = twMerge(
    "flex items-center justify-center w-full h-full",
    "text-white",
    "transition-opacity ease-out",
    transitionDurationClass,
    showCustomCursorActive ? "opacity-100" : "opacity-0",
    propIconClassName
  );

  // Logic to determine what icon to display (element or image)
  let iconDisplay: ReactNode = null;

  if (iconElement) {
    // If a React element is provided for the icon
    if (React.isValidElement(iconElement)) {
      const existingProps = iconElement.props as { size?: number; [key: string]: unknown };
      // Pass down iconSize prop if the provided element accepts a 'size' prop
      const sizeToPass = existingProps.size !== undefined ? existingProps.size : iconSize;
      iconDisplay = React.cloneElement(iconElement as React.ReactElement<{ size?: number }>, {
        size: sizeToPass,
      });
    } else {
      // If it's a non-element ReactNode
      iconDisplay = iconElement;
    }
  } else if (iconSrc) {
    // If an image source URL is provided
    iconDisplay = (
      <Image
        src={iconSrc}
        alt="Custom Cursor Icon"
        width={iconSize}
        height={iconSize}
        className="pointer-events-none"
        priority
        unoptimized
      />
    );
  }

  // Render the cursor element
  return (
    <div
      ref={cursorOuterRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        pointerEvents: "none",
        zIndex: 9999,
        willChange: "transform",
      }}
    >
      {/* The visible part of the cursor with styling and icon */}
      <div className={finalCursorClasses}>
        {iconDisplay && <div className={finalIconWrapperClasses}>{iconDisplay}</div>}
      </div>
    </div>
  );
};
