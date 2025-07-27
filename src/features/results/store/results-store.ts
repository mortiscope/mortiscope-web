import { create } from "zustand";

import { type SortOptionValue } from "@/lib/constants";

/**
 * Defines the possible view modes for the results display.
 */
export type ViewMode = "list" | "grid";

/**
 * Defines the shape of the results store, including its state and actions.
 */
interface ResultsState {
  /** The current display mode for the results (e.g., 'grid' or 'list'). */
  viewMode: ViewMode;
  /** The currently selected sorting option for the results. */
  sortOption: SortOptionValue;
  /** The current search query entered by the user. */
  searchTerm: string;
  /** The ID of the case currently being renamed, or null if none. */
  renamingCaseId: string | null;
  /** Track which cases have pending changes that require recalculation. */
  pendingRecalculations: Set<string>;

  setViewMode: (mode: ViewMode) => void;
  /**
   * Action to update the sort option.
   * @param option The new sort option to set.
   */
  setSortOption: (option: SortOptionValue) => void;
  /**
   * Action to update the search term.
   * @param term The new search term to set.
   */
  setSearchTerm: (term: string) => void;
  /**
   * Action to set the ID of the case being renamed.
   * @param id The ID of the case to rename, or null to exit rename mode.
   */
  setRenamingCaseId: (id: string | null) => void;
  /**
   * Action to mark a case as needing recalculation due to local changes.
   * @param caseId The ID of the case that needs recalculation.
   */
  markForRecalculation: (caseId: string) => void;
  /**
   * Action to clear the recalculation flag for a case.
   * @param caseId The ID of the case to clear.
   */
  clearRecalculationFlag: (caseId: string) => void;
}

/**
 * Zustand store for managing the interface state of the results page.
 */
export const useResultsStore = create<ResultsState>((set) => ({
  // The default view mode when the page loads.
  viewMode: "grid",
  // The default sort order when the page loads.
  sortOption: "date-modified-desc",
  // The initial search term is empty.
  searchTerm: "",
  // No case is being renamed by default.
  renamingCaseId: null,
  // Track cases with pending changes.
  pendingRecalculations: new Set(),

  // Action to update the `viewMode` state.
  setViewMode: (mode) => set({ viewMode: mode }),
  // Action to update the `sortOption` state.
  setSortOption: (option) => set({ sortOption: option }),
  // Action to update the `searchTerm` state.
  setSearchTerm: (term) => set({ searchTerm: term }),
  // Action to update the `renamingCaseId` state.
  setRenamingCaseId: (id) => set({ renamingCaseId: id }),
  // Action to mark a case for recalculation.
  markForRecalculation: (caseId) =>
    set((state) => {
      return {
        pendingRecalculations: new Set(state.pendingRecalculations).add(caseId),
      };
    }),
  // Action to clear recalculation flag.
  clearRecalculationFlag: (caseId) =>
    set((state) => {
      const newSet = new Set(state.pendingRecalculations);
      newSet.delete(caseId);
      return { pendingRecalculations: newSet };
    }),
}));
