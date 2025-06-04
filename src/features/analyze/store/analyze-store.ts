import { create } from "zustand";

/**
 * Defines the shape of the data payload within the analysis state.
 * This holds all the information gathered from the user during the process.
 */
type AnalyzeStateData = {
  // An array to hold all the uploaded image files.
  files: File[];
};

/**
 * Defines the complete shape of the analysis store.
 * Including both the state (current step and data) and the actions available to modify it.
 */
type AnalyzeState = {
  // The current active step in the multi-step form.
  step: number;
  // The data collected throughout the analysis process.
  data: AnalyzeStateData;
  // Action to set the current step to a specific number.
  setStep: (step: number) => void;
  // Action to advance to the next step.
  nextStep: () => void;
  // Action to return to the previous step.
  prevStep: () => void;
  // Action to add new files to the list.
  addFiles: (files: File[]) => void;
  // Action to remove a specific file from the list by its name.
  removeFile: (fileName: string) => void;
  // Action to reset the entire store to its initial state.
  reset: () => void;
};

/**
 * The default state for the analysis store.
 * Used for initialization and for resetting the form.
 */
const initialState: { step: number; data: AnalyzeStateData } = {
  step: 1,
  data: {
    files: [],
  },
};

/**
 * Creates and exports the Zustand store hook `useAnalyzeStore`.
 * This hook provides access to the analysis state and actions from any component.
 */
export const useAnalyzeStore = create<AnalyzeState>((set) => ({
  ...initialState,
  // Sets the step to a specific value.
  setStep: (step) => set({ step }),
  // Increments the current step by 1.
  nextStep: () => set((state) => ({ step: state.step + 1 })),
  // Decrements the current step by 1.
  prevStep: () => set((state) => ({ step: state.step - 1 })),
  // Adds new files to the state.
  addFiles: (newFiles) =>
    set((state) => ({
      data: {
        ...state.data,
        files: [...state.data.files, ...newFiles],
      },
    })),
  // Removes a file from the list by its name.
  removeFile: (fileName) =>
    set((state) => ({
      data: {
        ...state.data,
        files: state.data.files.filter((file) => file.name !== fileName),
      },
    })),
  // Resets the store to its initial default values.
  reset: () => set(initialState),
}));
