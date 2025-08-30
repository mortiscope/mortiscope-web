import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { memo } from "react";

import { EditorDetailsPanel } from "@/features/annotation/components/editor-details-panel";
import { type SidebarItem } from "@/features/annotation/hooks/use-editor-sidebar";

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

const DynamicDetailsShortcutsPanel = dynamic(() =>
  import("@/features/annotation/components/details-shortcuts-panel").then(
    (module) => module.DetailsShortcutsPanel
  )
);

/**
 * Defines the props for the sidebar panel component.
 */
interface SidebarPanelProps {
  /** The currently selected sidebar item. */
  selectedItem: SidebarItem | null;
  /** The title for the currently active panel. */
  panelTitle: string;
  /** Callback to close the panel. */
  onClose: () => void;
}

/**
 * A presentational component that renders the details panel with animated transitions.
 * Dynamically loads and displays the appropriate panel content based on the selected item.
 *
 * @param {SidebarPanelProps} props The props for the component.
 * @returns A React component representing the sidebar panel with content.
 */
export const SidebarPanel = memo(function SidebarPanel({
  selectedItem,
  panelTitle,
  onClose,
}: SidebarPanelProps) {
  /** A helper function to conditionally render the content for the currently active panel. */
  const renderPanelContent = () => {
    switch (selectedItem) {
      case "annotation":
        return <DynamicDetailsAnnotationPanel />;
      case "shortcuts":
        return <DynamicDetailsShortcutsPanel />;
      case "attributes":
        return <DynamicDetailsAttributesPanel />;
      case "settings":
        return <DynamicDetailsSettingsPanel />;
      default:
        return null;
    }
  };

  return (
    <AnimatePresence mode="wait">
      {selectedItem && (
        <EditorDetailsPanel
          key="details-panel"
          title={panelTitle}
          isOpen={!!selectedItem}
          onClose={onClose}
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
  );
});

SidebarPanel.displayName = "SidebarPanel";
