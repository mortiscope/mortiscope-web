import { type ReactNode } from "react";
import { create } from "zustand";

interface LayoutState {
  headerAdditionalContent: ReactNode | null;
  setHeaderAdditionalContent: (content: ReactNode | null) => void;
  clearHeaderAdditionalContent: () => void;
}

/**
 * Zustand store for managing dynamic content within the main layout.
 */
export const useLayoutStore = create<LayoutState>((set) => ({
  // The component or element to be rendered in the layout's designated extra slot.
  headerAdditionalContent: null,

  /**
   * Sets the content for the additional header slot.
   * @param {ReactNode | null} content - The React node to display. Pass null to clear.
   */
  setHeaderAdditionalContent: (content: ReactNode | null) => set({ headerAdditionalContent: content }),

  /**
   * A convenience method to clear the additional header content.
   */
  clearHeaderAdditionalContent: () => set({ headerAdditionalContent: null }),
}));
