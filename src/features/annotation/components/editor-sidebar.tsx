"use client";

import { memo } from "react";

import { SidebarNavigation } from "@/features/annotation/components/sidebar-navigation";
import { SidebarPanel } from "@/features/annotation/components/sidebar-panel";
import { useEditorSidebar } from "@/features/annotation/hooks/use-editor-sidebar";

/**
 * Defines the props for the editor sidebar component.
 */
type EditorSidebarProps = {
  /** A boolean to control the visibility of the sidebar on mobile view. */
  isMobileSidebarOpen: boolean;
  /** A callback to inform the parent component about whether any details panel is currently open. */
  onPanelStateChange: (isOpen: boolean) => void;
};

/**
 * A smart container component that renders the main editor sidebar and orchestrates the opening
 * and closing of associated detail panels. It manages state for item selection and responsive behavior.
 */
export const EditorSidebar = memo(
  ({ isMobileSidebarOpen, onPanelStateChange }: EditorSidebarProps) => {
    // Use the editor sidebar hook to manage state and behavior
    const { selectedItem, isMobile, handleButtonClick, handleClosePanel, getPanelTitle } =
      useEditorSidebar({ onPanelStateChange });

    return (
      <>
        {/* The main sidebar navigation. */}
        <SidebarNavigation
          selectedItem={selectedItem}
          isMobileSidebarOpen={isMobileSidebarOpen}
          isMobile={isMobile}
          onButtonClick={handleButtonClick}
        />

        {/* Renders the currently selected details panel with entry and exit animations. */}
        <SidebarPanel
          selectedItem={selectedItem}
          panelTitle={getPanelTitle()}
          onClose={handleClosePanel}
        />
      </>
    );
  }
);

EditorSidebar.displayName = "EditorSidebar";
