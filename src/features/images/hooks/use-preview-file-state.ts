import { useEffect, useState } from "react";

import { type UploadableFile } from "@/features/analyze/store/analyze-store";

/**
 * Defines the props for the use preview file state hook.
 */
interface UsePreviewFileStateProps {
  /** The file object passed from the parent component; null if no file is selected. */
  file: UploadableFile | null;
  /** The visibility state of the parent modal, used to trigger state resets. */
  isOpen: boolean;
}

/**
 * A custom hook that manages the state for the currently active file in the preview modal.
 * It handles syncing the internal file state with props and parsing file metadata like
 * the base name, extension, and full display name.
 *
 * @param {UsePreviewFileStateProps} props The props to configure the hook.
 * @returns An object with the active file's state, metadata, and setter functions.
 */
export const usePreviewFileState = ({ file, isOpen }: UsePreviewFileStateProps) => {
  // Internal state for the currently viewed file.
  const [activeFile, setActiveFile] = useState<UploadableFile | null>(file);
  // State for the file's name without the extension, used for renaming.
  const [fileNameBase, setFileNameBase] = useState("");
  // State for the file's extension.
  const [fileExtension, setFileExtension] = useState("");
  // State for the full file name displayed in the UI, which can be edited.
  const [displayFileName, setDisplayFileName] = useState("");

  /**
   * Syncs the internal `activeFile` state with the `file` prop passed from the parent component.
   */
  useEffect(() => setActiveFile(file), [file]);

  /**
   * Parses the file's name into its base and extension whenever the active file changes or the modal is re-opened.
   */
  useEffect(() => {
    if (activeFile) {
      const name = activeFile.name;
      const parts = name.split(".");
      const extension = parts.pop() as string;
      const nameBase = parts.join(".");

      setFileNameBase(nameBase);
      setFileExtension(extension);
      setDisplayFileName(name);
    }
  }, [activeFile, isOpen]);

  // Exposes the state and its setters for the UI component to consume.
  return {
    activeFile,
    setActiveFile,
    fileNameBase,
    setFileNameBase,
    fileExtension,
    displayFileName,
    setDisplayFileName,
  };
};
