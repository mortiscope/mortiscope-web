import { createId } from "@paralleldrive/cuid2";
import { create } from "zustand";

import { type DetailsFormData } from "@/features/analyze/schemas/details";
import { type SortOptionValue } from "@/lib/constants";

/**
 * Defines the status of an individual file upload.
 * - pending: The file has been added but the upload has not started.
 * - uploading: The file is currently being uploaded to S3.
 * - success: The file has been successfully uploaded.
 * - error: An error occurred during the upload process.
 */
export type UploadStatus = "pending" | "uploading" | "success" | "error";

/**
 * Defines the available view modes for the upload preview.
 * - list: Displays files in a vertical list.
 * - grid: Displays files in a responsive grid.
 */
export type ViewMode = "list" | "grid";

/**
 * Represents a file that is being prepared for, is in the process of being uploaded,
 * or has been persisted in the database.
 * It extends the standard File object with metadata for tracking and persistence.
 */
export type UploadableFile = {
  // The canonical ID for the file, generated on the client and stored in the database.
  id: string;
  // The actual File object, present for new uploads before they are saved.
  file?: File;
  // The unique key for the file in the S3 bucket.
  key: string;
  // The full S3 URL of the file, populated after successful upload and DB save.
  url: string;
  // The name of the file.
  name: string;
  // The size of the file in bytes.
  size: number;
  // The MIME type of the file.
  type: string;
  // The current upload progress percentage.
  progress: number;
  // The current status of the upload.
  status: UploadStatus;
  // The origin of the file data. 'db' indicates it was loaded from the database.
  source: "upload" | "camera" | "db";
  // The date the file was added or initially uploaded.
  dateUploaded: Date;
};

/**
 * The shape of a file record as returned from the database.
 */
export type PersistedFile = {
  id: string;
  key: string;
  url: string;
  name: string;
  size: number;
  type: string;
  createdAt: Date;
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
  // Flag to indicate if the store has been hydrated with persisted data.
  isHydrated: boolean;
  // The current view mode for the upload preview.
  viewMode: ViewMode;
  // The current sort option for the upload preview.
  sortOption: SortOptionValue;
  // The data collected throughout the analysis process.
  data: AnalyzeStateData;
  // The data for the analysis details form.
  details: Partial<DetailsFormData>;
  // Action to set the current step to a specific number.
  setStep: (step: number) => void;
  // Action to advance to the next step.
  nextStep: () => void;
  // Action to return to the previous step.
  prevStep: () => void;
  // Action to set the view mode.
  setViewMode: (viewMode: ViewMode) => void;
  // Action to set the sort option.
  setSortOption: (sortOption: SortOptionValue) => void;
  // Action to add one or more files to the upload list.
  addFiles: (files: File[], source: "upload" | "camera") => void;
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
  // Action to store the final S3 URL for a file after saving its metadata.
  setUploadUrl: (fileId: string, url: string) => void;
  // Action to populate the store with files from the database.
  hydrateFiles: (files: PersistedFile[]) => void;
  // Action to update the details form data with a validated payload.
  updateDetailsData: (data: DetailsFormData) => void;
  // Action to reset the entire store back to its initial state.
  reset: () => void;
};

/**
 * The default state for the analysis store.
 * Used for initialization and for resetting the form.
 */
const initialState: {
  step: number;
  isHydrated: boolean;
  viewMode: ViewMode;
  sortOption: SortOptionValue;
  data: AnalyzeStateData;
  details: Partial<DetailsFormData>;
} = {
  step: 1,
  isHydrated: false,
  viewMode: "list",
  sortOption: "date-uploaded-desc",
  data: {
    files: [],
  },
  details: {},
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
  // Sets the view mode for the upload preview.
  setViewMode: (viewMode) => set({ viewMode }),
  // Sets the sort option for the upload preview.
  setSortOption: (sortOption) => set({ sortOption }),
  // Adds new files, converting them to the UploadableFile format with a unique ID.
  addFiles: (newFiles, source) => {
    const uploadableFiles: UploadableFile[] = newFiles.map((file) => ({
      id: createId(),
      file,
      key: "",
      url: "",
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 0,
      status: "pending",
      source,
      dateUploaded: new Date(),
    }));
    set((state) => ({
      data: {
        ...state.data,
        files: [...state.data.files, ...uploadableFiles],
      },
    }));
  },
  // Updates the underlying File object and its metadata of an existing UploadableFile.
  updateFile: (fileId, newFile) =>
    set((state) => ({
      data: {
        ...state.data,
        files: state.data.files.map((uploadableFile) =>
          uploadableFile.id === fileId
            ? {
                ...uploadableFile,
                file: newFile,
                name: newFile.name,
                size: newFile.size,
                type: newFile.type,
              }
            : uploadableFile
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
  // Sets the final S3 URL for a file after it has been saved to the database.
  setUploadUrl: (fileId, url) =>
    set((state) => ({
      data: {
        ...state.data,
        files: state.data.files.map((f) => (f.id === fileId ? { ...f, url } : f)),
      },
    })),
  // Populates the store with persisted files from the database.
  hydrateFiles: (files) => {
    const persistedFiles: UploadableFile[] = files.map((file) => ({
      id: file.id,
      key: file.key,
      url: file.url,
      name: file.name,
      size: file.size,
      type: file.type,
      progress: 100,
      status: "success",
      source: "db",
      dateUploaded: file.createdAt,
    }));
    set({ data: { files: persistedFiles }, isHydrated: true });
  },
  // Action to update the analysis details data after successful validation.
  updateDetailsData: (data) => set({ details: data }),
  // Resets the store to its initial default values.
  reset: () => set(initialState),
}));
