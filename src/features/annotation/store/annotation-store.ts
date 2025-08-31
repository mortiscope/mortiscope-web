import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

import { type Detection } from "@/features/annotation/hooks/use-editor-image";
import { MAX_HISTORY } from "@/lib/constants";

/**
 * Defines the complete state structure and the action interfaces for the annotation store.
 */
interface AnnotationState {
  /** The unique ID of the currently selected detection, or `null` if no detection is selected. */
  selectedDetectionId: string | null;
  /** Whether the detection panel should be visible. */
  isPanelOpen: boolean;
  /** The array of detection objects currently being edited. This is the 'working' copy of the state. */
  detections: Detection[];
  /** A read-only backup of the initial detections fetched from the server, used for resetting any changes. */
  originalDetections: Detection[];
  /** Array of past detection states for undo functionality. */
  past: Detection[][];
  /** Array of future detection states for redo functionality. */
  future: Detection[][];
  /** Selects a detection by its unique ID. */
  selectDetection: (id: string, shouldOpenPanel?: boolean) => void;
  /** Opens the detection panel. */
  openPanel: () => void;
  /** Clears the current detection selection. */
  clearSelection: () => void;
  /** Initializes or replaces the current set of detections with a new array from an external source. */
  setDetections: (detections: Detection[]) => void;
  /** Updates the properties of a single detection, identified by its ID. */
  updateDetection: (id: string, updates: Partial<Detection>) => void;
  /** Updates detection without saving to history. */
  updateDetectionNoHistory: (id: string, updates: Partial<Detection>) => void;
  /** Saves current state to history before starting a drag/resize operation. */
  saveStateBeforeEdit: () => void;
  /** Whether draw mode is currently active. */
  drawMode: boolean;
  /** Enables or disables draw mode. */
  setDrawMode: (enabled: boolean) => void;
  /** Whether select mode is currently active (disables panning). */
  selectMode: boolean;
  /** Enables or disables select mode. */
  setSelectMode: (enabled: boolean) => void;
  /** Adds a new detection (for user-drawn boxes). */
  addDetection: (detection: Omit<Detection, "id">) => void;
  /** Removes a detection by its ID and saves to history. */
  removeDetection: (id: string) => void;
  /** Marks all detections as verified and saves to history. */
  verifyAllDetections: () => void;
  /** Resets all modifications by restoring the detections to their original state from the backup. */
  resetDetections: () => void;
  /** Undoes the last change. */
  undo: () => void;
  /** Redoes the last undone change. */
  redo: () => void;
  /** Returns true if there are changes that can be undone. */
  canUndo: () => boolean;
  /** Returns true if there are changes that can be redone. */
  canRedo: () => boolean;
  /** Returns true if there are unsaved changes. Referring to detections different from the original. */
  hasChanges: () => boolean;
  /** The current zoom scale of the image viewer, used to correctly calculate drag/resize deltas. */
  transformScale: number;
  /** Updates the transform scale, typically called by the zoom/pan component on transform events. */
  setTransformScale: (scale: number) => void;
  /** Display filter such as all, verified, and unverified. */
  displayFilter: "all" | "verified" | "unverified";
  /** Sets the display filter for detections. */
  setDisplayFilter: (filter: "all" | "verified" | "unverified") => void;
  /** Whether the editor is locked (read-only mode). */
  isLocked: boolean;
  /** Toggles the locked state of the editor. */
  setIsLocked: (locked: boolean) => void;
  /** Commits current changes as the new baseline after successful save. */
  commitChanges: () => void;
}

/**
 * Helper function to deep clone detections array.
 */
const cloneDetections = (detections: Detection[]): Detection[] =>
  detections.map((det) => ({ ...det }));

/**
 * Zustand store for managing the annotation editor's state.
 */
export const useAnnotationStore = create<AnnotationState>((set, get) => ({
  // No detection is selected by default.
  selectedDetectionId: null,
  // Panel is closed by default.
  isPanelOpen: false,
  // The working list of detections starts empty.
  detections: [],
  // Draw mode is disabled by default.
  drawMode: false,
  // Select mode is disabled by default.
  selectMode: false,
  // The backup list of detections starts empty.
  originalDetections: [],
  // History starts empty.
  past: [],
  future: [],
  // The viewer starts at 100% scale.
  transformScale: 1,
  // Display filter defaults to showing all detections.
  displayFilter: "all",
  // Editor is unlocked by default.
  isLocked: false,

  /**
   * Updates the state to set the provided ID as the currently selected one.
   * Also enables select mode and disables draw mode.
   * @param id - The detection ID to select
   * @param shouldOpenPanel - Whether to open the panel immediately (default: false for mobile compatibility)
   */
  selectDetection: (id, shouldOpenPanel = false) =>
    set({
      selectedDetectionId: id,
      selectMode: true,
      drawMode: false,
      isPanelOpen: shouldOpenPanel,
    }),

  /**
   * Opens the detection panel for the currently selected detection.
   */
  openPanel: () => set({ isPanelOpen: true }),

  /**
   * Resets the selection, setting the selected ID back to null and switching to pan mode.
   */
  clearSelection: () => set({ selectedDetectionId: null, selectMode: false, isPanelOpen: false }),

  /**
   * Initializes the store with a new set of detections and resets history.
   */
  setDetections: (detections) =>
    set({
      detections: cloneDetections(detections),
      originalDetections: cloneDetections(detections),
      past: [],
      future: [],
    }),

  /**
   * Updates the properties of a single detection and saves to history.
   */
  updateDetection: (id, updates) =>
    set((state) => {
      // Save current state to history before making changes
      const newPast = [...state.past.slice(-MAX_HISTORY + 1), cloneDetections(state.detections)];

      return {
        detections: state.detections.map((det) => (det.id === id ? { ...det, ...updates } : det)),
        past: newPast,
        future: [],
      };
    }),

  /**
   * Updates detection without saving to history for continuous operations.
   */
  updateDetectionNoHistory: (id, updates) =>
    set((state) => ({
      detections: state.detections.map((det) => (det.id === id ? { ...det, ...updates } : det)),
    })),

  /**
   * Saves current state to history before starting an edit operation.
   */
  saveStateBeforeEdit: () =>
    set((state) => {
      const newPast = [...state.past.slice(-MAX_HISTORY + 1), cloneDetections(state.detections)];
      return {
        past: newPast,
        future: [],
      };
    }),

  /**
   * Enables or disables draw mode.
   */
  setDrawMode: (enabled) => set({ drawMode: enabled }),

  /**
   * Enables or disables select mode.
   */
  setSelectMode: (enabled) => set({ selectMode: enabled }),

  /**
   * Adds a new user-drawn detection.
   */
  addDetection: (detection) =>
    set((state) => {
      const newDetection = {
        ...detection,
        id: uuidv4(),
      };
      const newDetections = [...state.detections, newDetection];
      const newPast = [...state.past.slice(-MAX_HISTORY + 1), cloneDetections(state.detections)];

      return {
        detections: newDetections,
        past: newPast,
        future: [],
        selectedDetectionId: newDetection.id,
        isPanelOpen: true,
        drawMode: false,
      };
    }),

  /**
   * Removes a detection by its ID and saves to history.
   */
  removeDetection: (id) =>
    set((state) => {
      // Save current state to history before making changes
      const newPast = [...state.past.slice(-MAX_HISTORY + 1), cloneDetections(state.detections)];

      return {
        detections: state.detections.filter((det) => det.id !== id),
        past: newPast,
        future: [],
        selectedDetectionId: state.selectedDetectionId === id ? null : state.selectedDetectionId,
        isPanelOpen: state.selectedDetectionId === id ? false : state.isPanelOpen,
        selectMode: state.selectedDetectionId === id ? false : state.selectMode,
      };
    }),

  /**
   * Marks all detections as verified and saves to history.
   */
  verifyAllDetections: () =>
    set((state) => {
      // Save current state to history before making changes
      const newPast = [...state.past.slice(-MAX_HISTORY + 1), cloneDetections(state.detections)];

      return {
        detections: state.detections.map((det) => ({
          ...det,
          status: "user_confirmed" as const,
        })),
        past: newPast,
        future: [],
      };
    }),

  /**
   * Resets all changes by copying the `originalDetections` backup back into the working `detections` array.
   */
  resetDetections: () =>
    set((state) => ({
      detections: cloneDetections(state.originalDetections),
      selectedDetectionId: null,
      past: [],
      future: [],
    })),

  /**
   * Undoes the last change by restoring the previous state.
   */
  undo: () =>
    set((state) => {
      if (state.past.length === 0) return state;

      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);

      return {
        past: newPast,
        detections: cloneDetections(previous),
        future: [cloneDetections(state.detections), ...state.future],
        selectedDetectionId: null,
      };
    }),

  /**
   * Redoes the last undone change by restoring the next state.
   */
  redo: () =>
    set((state) => {
      if (state.future.length === 0) return state;

      const next = state.future[0];
      const newFuture = state.future.slice(1);

      return {
        past: [...state.past, cloneDetections(state.detections)],
        detections: cloneDetections(next),
        future: newFuture,
        selectedDetectionId: null,
      };
    }),

  /**
   * Returns true if there are changes that can be undone.
   */
  canUndo: () => get().past.length > 0,

  /**
   * Returns true if there are changes that can be redone.
   */
  canRedo: () => get().future.length > 0,

  /**
   * Returns true if there are unsaved changes (detections differ from original).
   */
  hasChanges: () => {
    const state = get();
    return JSON.stringify(state.detections) !== JSON.stringify(state.originalDetections);
  },

  /**
   * Updates the current transform scale of the image viewer.
   */
  setTransformScale: (scale) => set({ transformScale: scale }),

  /**
   * Sets the display filter for detections.
   */
  setDisplayFilter: (filter) => set({ displayFilter: filter }),

  /**
   * Toggles the locked state of the editor.
   */
  setIsLocked: (locked) => set({ isLocked: locked }),

  /**
   * Commits current changes as the new baseline after successful save.
   */
  commitChanges: () =>
    set((state) => ({
      originalDetections: cloneDetections(state.detections),
      past: [],
      future: [],
    })),
}));
