import { useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";

import { useAnnotationStore } from "@/features/annotation/store/annotation-store";
import { KEYBOARD_SHORTCUTS } from "@/lib/constants";

/**
 * Defines the props for the editor toolbar hook.
 */
type UseEditorToolbarProps = {
  /** Optional callback to zoom in on the image. */
  onZoomIn?: () => void;
  /** Optional callback to zoom out on the image. */
  onZoomOut?: () => void;
  /** Optional callback to center the view on the image. */
  onCenterView?: () => void;
  /** Optional callback to reset the view to initial state. */
  onResetView?: () => void;
  /** Optional callback to toggle the minimap visibility. */
  onToggleMinimap?: () => void;
};

/**
 * Custom hook for managing editor toolbar state and behavior.
 * Handles tool selection, view controls, history management, and keyboard shortcuts.
 *
 * @param {UseEditorToolbarProps} props The props for the hook.
 * @returns An object containing all state, actions, and handlers for the toolbar.
 */
export const useEditorToolbar = ({
  onZoomIn,
  onZoomOut,
  onCenterView,
  onResetView,
  onToggleMinimap,
}: UseEditorToolbarProps) => {
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

  return {
    // Modal state
    isResetModalOpen,
    setIsResetModalOpen,
    // Tool state
    isPanActive,
    isSelectActive,
    isDrawActive,
    isLocked,
    // Tool actions
    clearSelection,
    setDrawMode,
    setSelectMode,
    drawMode,
    // History state
    canUndo,
    canRedo,
    hasChanges,
    // History actions
    undo,
    redo,
  };
};
