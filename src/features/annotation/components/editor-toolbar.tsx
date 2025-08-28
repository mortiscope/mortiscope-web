import dynamic from "next/dynamic";
import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { HiMiniArrowPath } from "react-icons/hi2";
import { IoArrowRedoOutline, IoArrowUndoOutline } from "react-icons/io5";
import { IoHandRightOutline } from "react-icons/io5";
import { LuFocus, LuZoomIn, LuZoomOut } from "react-icons/lu";
import { PiBoundingBox, PiCheckSquare, PiCursor, PiSquare } from "react-icons/pi";
import { TbRotate } from "react-icons/tb";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useEditorImage } from "@/features/annotation/hooks/use-editor-image";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";
import { KEYBOARD_SHORTCUTS } from "@/lib/constants";
import { cn } from "@/lib/utils";

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
 * A presentational component that renders a floating vertical toolbar with controls for the annotation
 * editor. It includes tools for panning, selecting, drawing, view manipulation, and history.
 *
 * @param {EditorToolbarProps} props The props for the component.
 * @returns A React component representing the floating toolbar.
 */
export function EditorToolbar({
  onZoomIn,
  onZoomOut,
  onCenterView,
  onResetView,
  isMinimapEnabled = false,
  onToggleMinimap,
}: EditorToolbarProps) {
  // Get current image for modal
  const { image } = useEditorImage();

  // Modal state
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Get selection state from store
  const clearSelection = useAnnotationStore((state) => state.clearSelection);

  // Get history actions and state from store
  const undo = useAnnotationStore((state) => state.undo);
  const redo = useAnnotationStore((state) => state.redo);
  const canUndo = useAnnotationStore((state) => state.canUndo());
  const canRedo = useAnnotationStore((state) => state.canRedo());
  const hasChanges = useAnnotationStore((state) => state.hasChanges());

  // Get draw mode state and action
  const drawMode = useAnnotationStore((state) => state.drawMode);
  const setDrawMode = useAnnotationStore((state) => state.setDrawMode);
  const selectMode = useAnnotationStore((state) => state.selectMode);
  const setSelectMode = useAnnotationStore((state) => state.setSelectMode);

  // Get lock state
  const isLocked = useAnnotationStore((state) => state.isLocked);

  // Get display filter action
  const setDisplayFilter = useAnnotationStore((state) => state.setDisplayFilter);

  // Determine active tool based on selection state
  const isPanActive = !selectMode && !drawMode;
  const isSelectActive = selectMode;
  const isDrawActive = drawMode;

  // Retrieves the currently selected detection ID and the `removeDetection` action from the global store.
  const selectedDetectionId = useAnnotationStore((state) => state.selectedDetectionId);
  const removeDetection = useAnnotationStore((state) => state.removeDetection);

  // Keyboard shortcuts for tool selection
  useHotkeys(
    KEYBOARD_SHORTCUTS.PAN_MODE,
    () => {
      clearSelection();
      setDrawMode(false);
      setSelectMode(false);
    },
    { enabled: !isLocked, preventDefault: true }
  );

  useHotkeys(
    KEYBOARD_SHORTCUTS.SELECT_MODE,
    () => {
      clearSelection();
      setDrawMode(false);
      setSelectMode(true);
    },
    { enabled: !isLocked, preventDefault: true }
  );

  useHotkeys(
    KEYBOARD_SHORTCUTS.DRAW_MODE,
    () => {
      clearSelection();
      setSelectMode(false);
      setDrawMode(!drawMode);
    },
    { enabled: !isLocked, preventDefault: true }
  );

  // Keyboard shortcuts for view controls
  useHotkeys(KEYBOARD_SHORTCUTS.ZOOM_IN, () => onZoomIn?.(), { preventDefault: true });

  useHotkeys(KEYBOARD_SHORTCUTS.ZOOM_OUT, () => onZoomOut?.(), { preventDefault: true });

  useHotkeys(KEYBOARD_SHORTCUTS.TOGGLE_MINIMAP, () => onToggleMinimap?.(), {
    preventDefault: true,
  });

  useHotkeys(KEYBOARD_SHORTCUTS.CENTER_FOCUS, () => onCenterView?.(), { preventDefault: true });

  useHotkeys(KEYBOARD_SHORTCUTS.RESET_VIEW, () => onResetView?.(), { preventDefault: true });

  // Keyboard shortcuts for history management
  useHotkeys(KEYBOARD_SHORTCUTS.UNDO, undo, {
    enabled: canUndo && !isLocked,
    preventDefault: true,
  });

  useHotkeys(KEYBOARD_SHORTCUTS.REDO, redo, {
    enabled: canRedo && !isLocked,
    preventDefault: true,
  });

  useHotkeys(KEYBOARD_SHORTCUTS.RESET_CHANGES, () => setIsResetModalOpen(true), {
    enabled: hasChanges && !isLocked,
    preventDefault: true,
  });

  // Keyboard shortcuts for selection-based actions
  useHotkeys(
    KEYBOARD_SHORTCUTS.DELETE_SELECTED,
    () => {
      if (selectedDetectionId) {
        removeDetection(selectedDetectionId);
      }
    },
    {
      enabled: !!selectedDetectionId && !isLocked,
      preventDefault: true,
    }
  );

  useHotkeys(
    KEYBOARD_SHORTCUTS.DESELECT,
    () => {
      if (selectedDetectionId) {
        clearSelection();
      }
    },
    {
      enabled: !!selectedDetectionId,
      preventDefault: true,
    }
  );

  // Keyboard shortcuts for display filters
  useHotkeys(
    KEYBOARD_SHORTCUTS.SHOW_ALL_ANNOTATIONS,
    () => {
      setDisplayFilter("all");
    },
    { preventDefault: true }
  );

  useHotkeys(
    KEYBOARD_SHORTCUTS.SHOW_VERIFIED_ONLY,
    () => {
      setDisplayFilter("verified");
    },
    { preventDefault: true }
  );

  useHotkeys(
    KEYBOARD_SHORTCUTS.SHOW_UNVERIFIED_ONLY,
    () => {
      setDisplayFilter("unverified");
    },
    { preventDefault: true }
  );

  return (
    // The main container for the toolbar
    <div className="fixed top-[calc(50%+2.5rem)] right-2 z-[5] flex -translate-y-1/2 flex-col gap-1 rounded-lg bg-emerald-800/80 p-2 shadow-lg backdrop-blur-sm md:right-4 md:z-50 md:gap-2 md:rounded-xl md:py-2.5">
      {/* Section 1: Primary tools */}
      <div className="flex flex-col gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              aria-label="Pan"
              onClick={() => {
                clearSelection();
                setDrawMode(false);
                setSelectMode(false);
              }}
              className={cn(
                "h-8 w-8 cursor-pointer rounded-lg p-0 md:h-10 md:w-10",
                isPanActive
                  ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-600"
                  : "text-white hover:bg-transparent hover:text-emerald-300"
              )}
            >
              <IoHandRightOutline className="!h-5.5 !w-5.5 md:!h-6 md:!w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Pan</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip open={isLocked ? false : undefined}>
          <TooltipTrigger asChild>
            <div className={isLocked ? "cursor-not-allowed" : ""}>
              <Button
                variant="ghost"
                aria-label="Select"
                disabled={isLocked}
                onClick={() => {
                  clearSelection();
                  setDrawMode(false);
                  setSelectMode(true);
                }}
                className={cn(
                  "h-8 w-8 rounded-lg p-0 md:h-10 md:w-10",
                  isLocked
                    ? "cursor-not-allowed text-white/30"
                    : isSelectActive
                      ? "cursor-pointer bg-emerald-100 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-600"
                      : "cursor-pointer text-white hover:bg-transparent hover:text-emerald-300"
                )}
              >
                <PiCursor className="!h-5 !w-5 md:!h-6 md:!w-6" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Select</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip open={isLocked ? false : undefined}>
          <TooltipTrigger asChild>
            <div className={isLocked ? "cursor-not-allowed" : ""}>
              <Button
                variant="ghost"
                aria-label="Draw"
                disabled={isLocked}
                onClick={() => {
                  clearSelection();
                  setSelectMode(false);
                  setDrawMode(!drawMode);
                }}
                className={cn(
                  "h-8 w-8 rounded-lg p-0 md:h-10 md:w-10",
                  isLocked
                    ? "cursor-not-allowed text-white/30"
                    : isDrawActive
                      ? "cursor-pointer bg-emerald-100 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-600"
                      : "cursor-pointer text-white hover:bg-transparent hover:text-emerald-300"
                )}
              >
                <PiBoundingBox className="!h-5 !w-5 md:!h-6 md:!w-6" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Draw</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* A visual separator to group the toolbar buttons logically. */}
      <div className="-mx-2">
        <Separator className="bg-white/30" />
      </div>

      {/* Section 2: View and navigation tools */}
      <div className="flex flex-col gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={onZoomIn}
              aria-label="Zoom in"
              className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
            >
              <LuZoomIn className="!h-5 !w-5 md:!h-6 md:!w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Zoom in</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={onToggleMinimap}
              aria-label={isMinimapEnabled ? "Disable minimap" : "Enable minimap"}
              className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
            >
              {isMinimapEnabled ? (
                <PiCheckSquare className="!h-5 !w-5 md:!h-6 md:!w-6" />
              ) : (
                <PiSquare className="!h-5 !w-5 md:!h-6 md:!w-6" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">{isMinimapEnabled ? "Disable minimap" : "Enable minimap"}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={onCenterView}
              aria-label="Center focus"
              className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
            >
              <LuFocus className="!h-5 !w-5 md:!h-6 md:!w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Center focus</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={onResetView}
              aria-label="Reset view"
              className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
            >
              <TbRotate className="!h-5 !w-5 md:!h-6 md:!w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Reset view</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={onZoomOut}
              aria-label="Zoom out"
              className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
            >
              <LuZoomOut className="!h-5 !w-5 md:!h-6 md:!w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Zoom out</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* A visual separator to group the toolbar buttons logically. */}
      <div className="-mx-2">
        <Separator className="bg-white/30" />
      </div>

      {/* Section 3: History and state management tools */}
      <div className="flex flex-col gap-1">
        <Tooltip open={!canRedo || isLocked ? false : undefined}>
          <TooltipTrigger asChild>
            <div className={isLocked || !canRedo ? "cursor-not-allowed" : ""}>
              <Button
                variant="ghost"
                onClick={redo}
                disabled={!canRedo || isLocked}
                aria-label="Redo change"
                className={cn(
                  "h-8 w-8 rounded-lg p-0 transition-colors duration-600 ease-in-out md:h-10 md:w-10",
                  canRedo && !isLocked
                    ? "cursor-pointer text-white hover:bg-transparent hover:text-emerald-300"
                    : "cursor-not-allowed text-white/30"
                )}
              >
                <IoArrowRedoOutline className="!h-5 !w-5 md:!h-6 md:!w-6" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Redo change</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip open={!hasChanges || isLocked ? false : undefined}>
          <TooltipTrigger asChild>
            <div className={isLocked || !hasChanges ? "cursor-not-allowed" : ""}>
              <Button
                variant="ghost"
                onClick={() => setIsResetModalOpen(true)}
                disabled={!hasChanges || isLocked}
                aria-label="Reset changes"
                className={cn(
                  "h-8 w-8 rounded-lg p-0 transition-colors duration-600 ease-in-out md:h-10 md:w-10",
                  hasChanges && !isLocked
                    ? "cursor-pointer text-white hover:bg-transparent hover:text-emerald-300"
                    : "cursor-not-allowed text-white/30"
                )}
              >
                <HiMiniArrowPath className="!h-5 !w-5 md:!h-6 md:!w-6" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Reset changes</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip open={!canUndo || isLocked ? false : undefined}>
          <TooltipTrigger asChild>
            <div className={isLocked || !canUndo ? "cursor-not-allowed" : ""}>
              <Button
                variant="ghost"
                onClick={undo}
                disabled={!canUndo || isLocked}
                aria-label="Undo change"
                className={cn(
                  "h-8 w-8 rounded-lg p-0 transition-colors duration-600 ease-in-out md:h-10 md:w-10",
                  canUndo && !isLocked
                    ? "cursor-pointer text-white hover:bg-transparent hover:text-emerald-300"
                    : "cursor-not-allowed text-white/30"
                )}
              >
                <IoArrowUndoOutline className="!h-5 !w-5 md:!h-6 md:!w-6" />
              </Button>
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Undo change</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Reset Changes Modal */}
      <DynamicResetChangesModal
        imageName={image?.name || null}
        isOpen={isResetModalOpen}
        onOpenChange={setIsResetModalOpen}
      />
    </div>
  );
}

EditorToolbar.displayName = "EditorToolbar";
