import { create } from "zustand";

import { type Detection } from "@/features/annotation/hooks/use-editor-image";

/**
 * Defines the complete state structure and the action interfaces for the annotation store.
 */
interface AnnotationState {
  /** The unique ID of the currently selected detection, or `null` if no detection is selected. */
  selectedDetectionId: string | null;
  /** The array of detection objects currently being edited. This is the 'working' copy of the state. */
  detections: Detection[];
  /** A read-only backup of the initial detections fetched from the server, used for resetting any changes. */
  originalDetections: Detection[];
  /** Selects a detection by its unique ID. */
  selectDetection: (id: string) => void;
  /** Clears the current detection selection. */
  clearSelection: () => void;
  /** Initializes or replaces the current set of detections with a new array from an external source. */
  setDetections: (detections: Detection[]) => void;
  /** Updates the properties of a single detection, identified by its ID. */
  updateDetection: (id: string, updates: Partial<Detection>) => void;
  /** Resets all modifications by restoring the detections to their original state from the backup. */
  resetDetections: () => void;
  /** The current zoom scale of the image viewer, used to correctly calculate drag/resize deltas. */
  transformScale: number;
  /** Updates the transform scale, typically called by the zoom/pan component on transform events. */
  setTransformScale: (scale: number) => void;
}

/**
 * Zustand store for managing the annotation editor's state.
 */
export const useAnnotationStore = create<AnnotationState>((set) => ({
  // No detection is selected by default.
  selectedDetectionId: null,
  // The working list of detections starts empty.
  detections: [],
  // The backup list of detections starts empty.
  originalDetections: [],
  // The viewer starts at 100% scale.
  transformScale: 1,

  /**
   * Updates the state to set the provided ID as the currently selected one.
   */
  selectDetection: (id) => set({ selectedDetectionId: id }),

  /**
   * Resets the selection, setting the selected ID back to null.
   */
  clearSelection: () => set({ selectedDetectionId: null }),

  /**
   * Initializes the store with a new set of detections.
   */
  setDetections: (detections) =>
    set({
      detections: [...detections],
      originalDetections: [...detections],
    }),

  /**
   * Updates the properties of a single detection.
   */
  updateDetection: (id, updates) =>
    set((state) => ({
      detections: state.detections.map((det) => (det.id === id ? { ...det, ...updates } : det)),
    })),

  /**
   * Resets all changes by copying the `originalDetections` backup back into the working `detections` array.
   */
  resetDetections: () =>
    set((state) => ({
      detections: [...state.originalDetections],
      selectedDetectionId: null,
    })),

  /**
   * Updates the current transform scale of the image viewer.
   */
  setTransformScale: (scale) => set({ transformScale: scale }),
}));
