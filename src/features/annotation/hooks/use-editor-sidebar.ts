import { useCallback, useEffect, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { KEYBOARD_SHORTCUTS } from "@/lib/constants";

/**
 * Defines the possible identifiers for each sidebar item and its corresponding panel.
 */
export type SidebarItem = "annotation" | "shortcuts" | "attributes" | "settings";

/**
 * Defines the props for the editor sidebar hook.
 */
type UseEditorSidebarProps = {
  /** A callback to inform the parent component about whether any details panel is currently open. */
  onPanelStateChange: (isOpen: boolean) => void;
};

/**
 * Custom hook for managing editor sidebar state and behavior.
 * Handles panel selection, mobile detection, keyboard shortcuts, and panel state notifications.
 *
 * @param {UseEditorSidebarProps} props The props for the hook.
 * @returns An object containing all state, actions, and handlers for the sidebar.
 */
export const useEditorSidebar = ({ onPanelStateChange }: UseEditorSidebarProps) => {
  /** Local state to track the currently selected sidebar item, which determines which panel is open. */
  const [selectedItem, setSelectedItem] = useState<SidebarItem | null>(null);
  /** Local state to track if the current view is mobile, used for animation logic. */
  const [isMobile, setIsMobile] = useState(false);

  /** A side effect to detect and update the `isMobile` state based on the viewport width. */
  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    setIsMobile(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  /** A side effect to notify the parent component whenever a panel's open state changes. */
  useEffect(() => {
    onPanelStateChange(!!selectedItem);
  }, [selectedItem, onPanelStateChange]);

  /**
   * Toggles the selection of a sidebar item.
   */
  const handleButtonClick = useCallback((itemId: SidebarItem) => {
    setSelectedItem((current) => (current === itemId ? null : itemId));
  }, []);

  /** Closes any currently open details panel. */
  const handleClosePanel = useCallback(() => {
    setSelectedItem(null);
  }, []);

  // Keyboard shortcuts for panel navigation
  useHotkeys(
    KEYBOARD_SHORTCUTS.TOGGLE_ANNOTATION_PANEL,
    () => {
      setSelectedItem((current) => (current === "annotation" ? null : "annotation"));
    },
    { preventDefault: true, enableOnFormTags: false }
  );

  useHotkeys(
    KEYBOARD_SHORTCUTS.TOGGLE_ATTRIBUTES_PANEL,
    () => {
      setSelectedItem((current) => (current === "attributes" ? null : "attributes"));
    },
    { preventDefault: true, enableOnFormTags: false }
  );

  useHotkeys(
    KEYBOARD_SHORTCUTS.TOGGLE_SHORTCUTS_PANEL,
    () => {
      setSelectedItem((current) => (current === "shortcuts" ? null : "shortcuts"));
    },
    { preventDefault: true, enableOnFormTags: false }
  );

  useHotkeys(
    KEYBOARD_SHORTCUTS.TOGGLE_SETTINGS_PANEL,
    () => {
      setSelectedItem((current) => (current === "settings" ? null : "settings"));
    },
    { preventDefault: true, enableOnFormTags: false }
  );

  /** A helper function to get the correct title for the currently active panel. */
  const getPanelTitle = useCallback(() => {
    switch (selectedItem) {
      case "annotation":
        return "Annotation";
      case "shortcuts":
        return "Keyboard Shortcuts";
      case "attributes":
        return "Attributes";
      case "settings":
        return "Settings";
      default:
        return "";
    }
  }, [selectedItem]);

  return {
    selectedItem,
    isMobile,
    handleButtonClick,
    handleClosePanel,
    getPanelTitle,
  };
};
