import { AnimatePresence, motion } from "framer-motion";
import { memo } from "react";
import { type DropzoneState } from "react-dropzone";
import { BsCamera } from "react-icons/bs";
import { IoImagesOutline } from "react-icons/io5";

import {
  descriptionTextClasses,
  dropzoneBaseClasses,
  iconClasses,
  largeTextClasses,
} from "@/features/cases/constants/styles";
import { MAX_FILES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type UploadDropzoneProps = {
  dropzone: DropzoneState;
  activeTab: string;
  isMaxFilesReached: boolean;
  caseId: string | null;
  filesCount: number;
  onOpenFormatsModal: () => void;
  onOpenCamera: () => void;
};

// Defines the animation variants for the tab content.
const contentVariants = {
  initial: { y: 10, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -10, opacity: 0 },
  transition: { duration: 0.3, ease: "easeInOut" },
};

/**
 * Renders the interactive dropzone area for file uploads or camera activation.
 */
export const UploadDropzone = memo(
  ({
    dropzone,
    activeTab,
    isMaxFilesReached,
    caseId,
    filesCount,
    onOpenFormatsModal,
    onOpenCamera,
  }: UploadDropzoneProps) => {
    const { getRootProps, getInputProps, isDragActive, isDragAccept, isDragReject } = dropzone;

    // Determines CSS classes based on the dropzone's current state.
    const dropzoneStateClasses =
      isMaxFilesReached || !caseId
        ? "cursor-not-allowed bg-slate-100 border-slate-300 opacity-60"
        : "cursor-pointer border-emerald-300 bg-emerald-50 hover:border-solid hover:border-emerald-400 hover:bg-emerald-100 hover:shadow-lg hover:shadow-emerald-500/20";
    const dropzoneDragAcceptClasses = isDragAccept ? "!border-green-500 !bg-green-100" : "";
    const dropzoneDragRejectClasses = isDragReject
      ? "!border-rose-500 !bg-rose-100 hover:!border-rose-500 hover:!bg-rose-100 hover:!shadow-rose-500/20"
      : "";

    return (
      <div
        {...getRootProps({
          onClick: () => {
            if (activeTab === "camera" && !isMaxFilesReached && caseId) {
              onOpenCamera();
            }
          },
        })}
        className={cn(
          dropzoneBaseClasses,
          dropzoneStateClasses,
          isDragActive && !isMaxFilesReached && "border-solid",
          dropzoneDragAcceptClasses,
          dropzoneDragRejectClasses
        )}
      >
        <input {...getInputProps()} />
        <AnimatePresence mode="wait">
          {/* Content for the 'Upload' tab. */}
          {activeTab === "upload" && (
            <motion.div
              key="upload"
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={contentVariants.transition}
              className="flex flex-col items-center"
            >
              <IoImagesOutline className={cn(iconClasses, isDragReject && "text-rose-500")} />
              <p className={cn(largeTextClasses, isDragReject && "text-rose-500")}>
                {!caseId
                  ? "Save Details First"
                  : isMaxFilesReached
                    ? "Maximum files reached"
                    : isDragAccept
                      ? "Drop them here"
                      : "Upload from Device"}
              </p>
              <p className={descriptionTextClasses}>
                {!caseId
                  ? "Please complete the previous step to enable uploads"
                  : isMaxFilesReached
                    ? `You have uploaded the maximum of ${MAX_FILES} images`
                    : `Click to browse or drag and drop up to ${MAX_FILES - filesCount} more. See supported formats `}
                {!isMaxFilesReached && caseId && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenFormatsModal();
                    }}
                    className={cn(
                      "cursor-help font-medium focus:outline-none",
                      isDragReject ? "text-rose-500" : "text-emerald-600"
                    )}
                  >
                    here
                  </button>
                )}
                .
              </p>
            </motion.div>
          )}

          {/* Content for the 'Camera' tab. */}
          {activeTab === "camera" && (
            <motion.div
              key="camera"
              variants={contentVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={contentVariants.transition}
              className="flex flex-col items-center"
            >
              <BsCamera className={cn(iconClasses)} />
              <p className={cn(largeTextClasses)}>
                {isMaxFilesReached ? "Maximum files reached" : "Use Camera"}
              </p>
              <p className={descriptionTextClasses}>
                {isMaxFilesReached
                  ? `You have uploaded the maximum of ${MAX_FILES} images.`
                  : "Allow access to your device's camera to capture a new image for analysis."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

UploadDropzone.displayName = "UploadDropzone";
