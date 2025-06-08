import { createId } from "@paralleldrive/cuid2";
import { create } from "zustand";

/**
 * Defines the status of an individual file upload.
 * - pending: The file has been added but the upload has not started.
 * - uploading: The file is currently being uploaded to S3.
 * - success: The file has been successfully uploaded.
 * - error: An error occurred during the upload process.
 */
export type UploadStatus = "pending" | "uploading" | "success" | "error";

/**
 * Represents a file that is being prepared for or is in the process of being uploaded.
 * It extends the standard File object with metadata for tracking the upload.
 */
export type UploadableFile = {
  id: string;
  file: File;
  key: string;
  progress: number;
  status: UploadStatus;
  source: "upload" | "camera";
};

/**
 * Defines the shape of the data payload within the analysis state.
 * This holds all the information gathered from the user during the process.
 */
type AnalyzeStateData = {
  // An array to hold all the files with their upload state.
  files: UploadableFile[];
};

/**
 * Defines the complete shape of the analysis store,
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
  // Action to add one or more files to the upload list.
  addFiles: (files: File[], source: UploadableFile["source"]) => void;
  // Action to update the file object for a given uploadable file, e.g., after rotation.
  updateFile: (fileId: string, newFile: File) => void;
  // Action to remove a file from the list by its unique id.
  removeFile: (fileId: string) => void;
  // Action to update the upload progress percentage for a specific file.
  updateFileProgress: (fileId: string, progress: number) => void;
  // Action to set the current upload status for a specific file.
  setUploadStatus: (fileId: string, status: UploadStatus) => void;
  // Action to reset a file's status to 'pending' for a re-upload attempt.
  retryUpload: (fileId: string) => void;
  // Action to store the server-side key (e.g., S3 key) for a file.
  setUploadKey: (fileId: string, key: string) => void;
  // Action to reset the entire store back to its initial state.
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
  // Adds new files, converting them to the UploadableFile format with a unique ID.
  addFiles: (newFiles, source) => {
    const uploadableFiles: UploadableFile[] = newFiles.map((file) => ({
      id: createId(),
      file,
      key: "",
      progress: 0,
      status: "pending",
      source,
    }));
    set((state) => ({
      data: {
        ...state.data,
        files: [...state.data.files, ...uploadableFiles],
      },
    }));
  },
  // Updates the underlying File object of an existing UploadableFile.
  updateFile: (fileId, newFile) =>
    set((state) => ({
      data: {
        ...state.data,
        files: state.data.files.map((uploadableFile) =>
          uploadableFile.id === fileId ? { ...uploadableFile, file: newFile } : uploadableFile
        ),
      },
    })),
  // Removes a file from the list by its unique id.
  removeFile: (fileId) =>
    set((state) => ({
      data: {
        ...state.data,
        files: state.data.files.filter((f) => f.id !== fileId),
      },
    })),
  // Updates the progress of a specific file by its unique id.
  updateFileProgress: (fileId, progress) =>
    set((state) => ({
      data: {
        ...state.data,
        files: state.data.files.map((f) => (f.id === fileId ? { ...f, progress } : f)),
      },
    })),
  // Updates the status of a specific file by its unique id.
  setUploadStatus: (fileId, status) =>
    set((state) => ({
      data: {
        ...state.data,
        files: state.data.files.map((f) => (f.id === fileId ? { ...f, status } : f)),
      },
    })),
  // Resets a failed upload to 'pending' by its unique id to allow for a retry.
  retryUpload: (fileId) =>
    set((state) => ({
      data: {
        ...state.data,
        files: state.data.files.map((f) =>
          f.id === fileId ? { ...f, status: "pending", progress: 0 } : f
        ),
      },
    })),
  // Sets the S3 key for a specific file by its unique id after it's been generated.
  setUploadKey: (fileId, key) =>
    set((state) => ({
      data: {
        ...state.data,
        files: state.data.files.map((f) => (f.id === fileId ? { ...f, key } : f)),
      },
    })),
  // Resets the store to its initial default values.
  reset: () => set(initialState),
}));
