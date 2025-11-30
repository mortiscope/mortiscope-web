"use client";

import { ReactLenis } from "lenis/react";
import React from "react";

/**
 * A provider component that wraps its children with the `ReactLenis` context.
 * @param {object} props The component props.
 * @param {React.ReactNode} props.children The child components that will have smooth scrolling applied.
 * @returns A React component that provides the smooth scrolling context to its descendants.
 */
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  return (
    // The `ReactLenis` component from the 'lenis' library is the core implementation.
    <ReactLenis root options={{ lerp: 0.1, duration: 2, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
