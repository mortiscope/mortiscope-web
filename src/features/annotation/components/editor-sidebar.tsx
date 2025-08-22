"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Fragment, useEffect, useState } from "react";
import { FiMoreHorizontal } from "react-icons/fi";
import { GoFileCode } from "react-icons/go";
import { IoSettingsOutline } from "react-icons/io5";
import { RxImage } from "react-icons/rx";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { EditorDetailsPanel } from "@/features/annotation/components/editor-details-panel";
import { cn } from "@/lib/utils";

// Dynamically import the details panel components.
const DynamicDetailsAnnotationPanel = dynamic(() =>
  import("@/features/annotation/components/details-annotation-panel").then(
    (module) => module.DetailsAnnotationPanel
  )
);

const DynamicDetailsAttributesPanel = dynamic(() =>
  import("@/features/annotation/components/details-attributes-panel").then(
    (module) => module.DetailsAttributesPanel
  )
);

const DynamicDetailsSettingsPanel = dynamic(() =>
  import("@/features/annotation/components/details-settings-panel").then(
    (module) => module.DetailsSettingsPanel
  )
);

/**
 * Defines the possible identifiers for each sidebar item and its corresponding panel.
 */
type SidebarItem = "annotation" | "attributes" | "settings";

/**
 * Defines the structure for a single sidebar button configuration.
 */
type SidebarButton = {
  id: SidebarItem;
  icon: React.ElementType;
  label: string;
};

/**
 * A configuration array that defines the buttons for the sidebar. This approach
 * centralizes the options, making them easy to manage and map over in the UI.
 */
const sidebarButtons: SidebarButton[] = [
  {
    id: "annotation",
    icon: GoFileCode,
    label: "Annotation",
  },
  {
    id: "attributes",
    icon: RxImage,
    label: "Attributes",
  },
  {
    id: "settings",
    icon: IoSettingsOutline,
    label: "Settings",
  },
];

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
 * A smart component that renders the main editor sidebar and orchestrates the opening
 * and closing of associated detail panels. It manages its own state for item selection
 * and responsive behavior.
 */
export const EditorSidebar = ({ isMobileSidebarOpen, onPanelStateChange }: EditorSidebarProps) => {
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
  const handleButtonClick = (itemId: SidebarItem) => {
    setSelectedItem((current) => (current === itemId ? null : itemId));
  };

  /** Closes any currently open details panel. */
  const handleClosePanel = () => {
    setSelectedItem(null);
  };

  /** A shared class string for consistent styling of the sidebar buttons. */
  const buttonClasses =
    "font-plus-jakarta-sans h-9 md:h-10 w-full cursor-pointer rounded-lg bg-transparent px-2 md:px-3 text-sm font-normal ring-offset-emerald-800 transition-colors duration-300 ease-in-out hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none active:bg-emerald-700 [&>svg]:!size-5 md:[&>svg]:!size-5.25";

  /** A class string applied to the active sidebar button for a distinct visual state. */
  const activeClasses =
    "bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-600 hover:to-emerald-700";

  /** A helper function to conditionally render the content for the currently active panel. */
  const renderPanelContent = () => {
    switch (selectedItem) {
      case "annotation":
        return <DynamicDetailsAnnotationPanel />;
      case "attributes":
        return <DynamicDetailsAttributesPanel />;
      case "settings":
        return <DynamicDetailsSettingsPanel />;
      default:
        return null;
    }
  };

  /** A helper function to get the correct title for the currently active panel. */
  const getPanelTitle = () => {
    switch (selectedItem) {
      case "annotation":
        return "Annotation";
      case "attributes":
        return "Attributes";
      case "settings":
        return "Settings";
      default:
        return "";
    }
  };

  return (
    <>
      {/* The main sidebar container. */}
      <motion.aside
        initial={false}
        animate={{ x: isMobile ? (isMobileSidebarOpen ? 0 : -64) : 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed top-16 left-0 z-20 flex h-[calc(100vh-4rem)] w-16 flex-col items-center justify-center bg-emerald-800 px-2 py-4 md:top-20 md:h-[calc(100vh-5rem)] md:w-24 md:px-3 md:py-6"
      >
        <nav className="flex w-full flex-col gap-1.5 px-1 md:gap-2 md:px-2">
          {sidebarButtons.map((button, index) => {
            const isActive = selectedItem === button.id;
            // The button is defined as a variable to be passed to the tooltip trigger.
            const ButtonElement = (
              <Button
                onClick={() => handleButtonClick(button.id)}
                className={cn(buttonClasses, isActive && activeClasses)}
                aria-label={button.label}
                aria-pressed={isActive}
                variant="ghost"
                size="lg"
              >
                <button.icon className="text-white" />
              </Button>
            );

            return (
              <Fragment key={button.id}>
                {/* Conditionally disabled the tooltip when a panel is open to prevent it from overlapping. */}
                <Tooltip open={selectedItem ? false : undefined}>
                  <TooltipTrigger asChild>{ButtonElement}</TooltipTrigger>
                  <TooltipContent side="right" align="center" className="font-inter">
                    <p>{button.label}</p>
                  </TooltipContent>
                </Tooltip>
                {/* Renders a separator between buttons. */}
                {index < sidebarButtons.length - 1 && (
                  <div className="flex justify-center">
                    <FiMoreHorizontal className="h-4 w-4 text-emerald-400 md:h-5 md:w-5" />
                  </div>
                )}
              </Fragment>
            );
          })}
        </nav>
      </motion.aside>

      {/* Renders the currently selected details panel with entry and exit animations. */}
      <AnimatePresence mode="wait">
        {selectedItem && (
          <EditorDetailsPanel
            key="details-panel"
            title={getPanelTitle()}
            isOpen={!!selectedItem}
            onClose={handleClosePanel}
          >
            {/* An inner animation to handle transitions between different panel contents. */}
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedItem}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {renderPanelContent()}
              </motion.div>
            </AnimatePresence>
          </EditorDetailsPanel>
        )}
      </AnimatePresence>
    </>
  );
};

EditorSidebar.displayName = "EditorSidebar";
