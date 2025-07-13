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
  /**
   * Action to update the view mode.
   * @param mode The new view mode to set.
   */
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
  // Action to update the `viewMode` state.
  setViewMode: (mode) => set({ viewMode: mode }),
  // Action to update the `sortOption` state.
  setSortOption: (option) => set({ sortOption: option }),
  // Action to update the `searchTerm` state.
  setSearchTerm: (term) => set({ searchTerm: term }),
}));
