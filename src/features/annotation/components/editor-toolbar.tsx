import dynamic from "next/dynamic";
import { memo } from "react";

import { Separator } from "@/components/ui/separator";
import { ToolbarHistoryButtons } from "@/features/annotation/components/toolbar-history-buttons";
import { ToolbarModeButtons } from "@/features/annotation/components/toolbar-mode-buttons";
import { ToolbarViewButtons } from "@/features/annotation/components/toolbar-view-buttons";
import { useEditorImage } from "@/features/annotation/hooks/use-editor-image";
import { useEditorToolbar } from "@/features/annotation/hooks/use-editor-toolbar";

// Dynamically import the reset changes modal component
const DynamicResetChangesModal = dynamic(() =>
  import("@/features/annotation/components/reset-changes-modal").then(
    (module) => module.ResetChangesModal
  )
);

/**
 * Defines the props for the editor toolbar component.
 */
type EditorToolbarProps = {
  /** A boolean indicating if any details panel is currently open. */
  hasOpenPanel: boolean;
  /** Optional callback to zoom in on the image. */
  onZoomIn?: () => void;
  /** Optional callback to zoom out on the image. */
  onZoomOut?: () => void;
  /** Optional callback to center the view on the image. */
  onCenterView?: () => void;
  /** Optional callback to reset the view to initial state. */
  onResetView?: () => void;
  /** A boolean indicating if the minimap is currently enabled. */
  isMinimapEnabled?: boolean;
  /** Optional callback to toggle the minimap visibility. */
  onToggleMinimap?: () => void;
};

/**
 * A smart container component that renders a floating vertical toolbar with controls for the annotation
 * editor. It includes tools for panning, selecting, drawing, view manipulation, and history.
 *
 * @param {EditorToolbarProps} props The props for the component.
 * @returns A React component representing the floating toolbar.
 */
export const EditorToolbar = memo(function EditorToolbar({
  onZoomIn,
  onZoomOut,
  onCenterView,
  onResetView,
  isMinimapEnabled = false,
  onToggleMinimap,
}: EditorToolbarProps) {
  // Get current image for modal
  const { image } = useEditorImage();

  // Use the editor toolbar hook to manage state and behavior
  const {
    isResetModalOpen,
    setIsResetModalOpen,
    isPanActive,
    isSelectActive,
    isDrawActive,
    isLocked,
    clearSelection,
    setDrawMode,
    setSelectMode,
    drawMode,
    canUndo,
    canRedo,
    hasChanges,
    undo,
    redo,
  } = useEditorToolbar({
    onZoomIn,
    onZoomOut,
    onCenterView,
    onResetView,
    onToggleMinimap,
  });

  return (
    // The main container for the toolbar
    <div className="fixed top-[calc(50%+2.5rem)] right-2 z-[5] flex -translate-y-1/2 flex-col gap-1 rounded-lg bg-emerald-800/80 p-2 shadow-lg backdrop-blur-sm md:right-4 md:z-50 md:gap-2 md:rounded-xl md:py-2.5">
      {/* Section 1: Primary tools */}
      <ToolbarModeButtons
        isPanActive={isPanActive}
        isSelectActive={isSelectActive}
        isDrawActive={isDrawActive}
        isLocked={isLocked}
        drawMode={drawMode}
        onClearSelection={clearSelection}
        onSetDrawMode={setDrawMode}
        onSetSelectMode={setSelectMode}
      />

      {/* A visual separator to group the toolbar buttons logically. */}
      <div className="-mx-2">
        <Separator className="bg-white/30" />
      </div>

      {/* Section 2: View and navigation tools */}
      <ToolbarViewButtons
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onCenterView={onCenterView}
        onResetView={onResetView}
        isMinimapEnabled={isMinimapEnabled}
        onToggleMinimap={onToggleMinimap}
      />

      {/* A visual separator to group the toolbar buttons logically. */}
      <div className="-mx-2">
        <Separator className="bg-white/30" />
      </div>

      {/* Section 3: History and state management tools */}
      <ToolbarHistoryButtons
        canUndo={canUndo}
        canRedo={canRedo}
        hasChanges={hasChanges}
        isLocked={isLocked}
        onUndo={undo}
        onRedo={redo}
        onResetChanges={() => setIsResetModalOpen(true)}
      />

      {/* Reset Changes Modal */}
      <DynamicResetChangesModal
        imageName={image?.name || null}
        isOpen={isResetModalOpen}
        onOpenChange={setIsResetModalOpen}
      />
    </div>
  );
});

EditorToolbar.displayName = "EditorToolbar";
