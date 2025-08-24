"use client";

import { motion } from "framer-motion";
import { memo, ReactNode } from "react";

/**
 * Defines the props for the editor details panel component.
 */
type EditorDetailsPanelProps = {
  /** The text to be displayed in the panel's header. */
  title: string;
  /** A boolean that controls the visibility of the panel. */
  isOpen: boolean;
  /** A callback function to handle the closing of the panel. */
  onClose: () => void;
  /** The content to be rendered within the scrollable area of the panel. */
  children: ReactNode;
};

/**
 * A reusable side panel component that slides in from the left. It features a responsive
 * layout, adapting from a top bar on mobile to a fixed sidebar on desktop.
 *
 * @param {EditorDetailsPanelProps} props The props for the component.
 * @returns A React component representing the side panel, or null if `isOpen` is false.
 */
export const EditorDetailsPanel = memo(({ title, isOpen, children }: EditorDetailsPanelProps) => {
  if (!isOpen) return null;

  return (
    // The main container for the panel.
    <motion.aside
      initial={{ x: -320 }}
      animate={{ x: 0 }}
      exit={{ x: -320 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="fixed top-16 right-0 left-16 z-10 flex h-[calc(100vh-4rem)] flex-col bg-emerald-700 shadow-lg shadow-gray-400 md:top-20 md:right-auto md:left-24 md:h-[calc(100vh-5rem)] md:w-64"
    >
      {/* The header section of the panel. */}
      <div className="flex items-center justify-center border-b border-emerald-600 px-3 py-3 md:px-4 md:py-4">
        <h2 className="font-plus-jakarta-sans text-base font-medium text-white md:text-lg">
          {title}
        </h2>
      </div>

      {/* The main content area. */}
      <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
    </motion.aside>
  );
});

EditorDetailsPanel.displayName = "EditorDetailsPanel";
