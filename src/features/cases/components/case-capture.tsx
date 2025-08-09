"use client";

import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import * as React from "react";
import Webcam from "react-webcam";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { CameraControls } from "@/features/cases/components/camera-controls";
import { CameraView } from "@/features/cases/components/camera-view";
import { CaptureThumbnailList } from "@/features/cases/components/capture-thumbnail-list";
import { useCamera } from "@/features/cases/hooks/use-camera";
import { useIsMobile } from "@/hooks/use-mobile";
import { MAX_FILES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the main dialog content container.
 * Controls the staggering of child animations for a coordinated entry effect.
 */
const dialogContentVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

/**
 * Framer Motion variants for individual animated items within the dialog.
 * This creates the "slide-up and fade-in" effect.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
  exit: { y: 20, opacity: 0, transition: { duration: 0.15 } },
};

/**
 * Defines the props for the CaseCapture component.
 */
interface CaseCaptureProps {
  /** Controls whether the camera dialog is open. */
  isOpen: boolean;
  /** Callback function to handle changes to the dialog's open state. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * Renders a dialog for capturing images using the device's camera.
 * This smart component orchestrates the camera view, controls, and thumbnail list.
 */
export function CaseCapture({ isOpen, onOpenChange }: CaseCaptureProps) {
  // A ref to access the underlying Webcam component instance.
  const webcamRef = React.useRef<Webcam>(null);
  // State to ensure the component only renders on the client, preventing hydration errors.
  const [isClient, setIsClient] = React.useState(false);
  // Retrieves the current list of files from the global Zustand store.
  const files = useAnalyzeStore((state) => state.data.files);
  // Custom hook to determine if the view is mobile for responsive rendering.
  const isMobile = useIsMobile();

  // Custom hook that encapsulates all camera-related state and logic.
  const {
    cameraError,
    isCapturing,
    aspectRatio,
    facingMode,
    rotation,
    isMirrored,
    cameraFiles,
    isMaxFilesReached,
    deleteMutation,
    handleRemoveFile,
    handleAspectRatioChange,
    handleDeviceFlip,
    handleRotateCamera,
    handleMirrorCamera,
    handleCapture,
    handleUserMediaError,
  } = useCamera({ isOpen, webcamRef });

  // Sets the state to true after the initial render on the client.
  React.useEffect(() => setIsClient(true), []);
  // Prevents server-side rendering of this client-only component.
  if (!isClient) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* Manages the entry and exit animations of the dialog content. */}
      <AnimatePresence>
        {isOpen && (
          <DialogContent
            className={cn(
              "flex flex-col p-0 shadow-2xl",
              isMobile
                ? "h-dvh w-screen max-w-none rounded-none border-none bg-black"
                : "rounded-2xl sm:max-w-[720px] md:rounded-3xl"
            )}
            // Prevents closing the dialog on outside clicks on mobile for a native app feel.
            onInteractOutside={(e) => {
              if (isMobile) e.preventDefault();
            }}
          >
            {/* Main animated container that orchestrates its children's animations. */}
            <motion.div
              className={cn("flex h-full w-full flex-col", isMobile && "relative")}
              variants={dialogContentVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              {/* On mobile, the dialog header is visually hidden for accessibility. */}
              {isMobile && (
                <DialogHeader>
                  <VisuallyHidden.Root>
                    <DialogTitle>Take Picture</DialogTitle>
                    <DialogDescription>
                      Camera interface for taking a picture. Use the controls to adjust settings and
                      capture an image.
                    </DialogDescription>
                  </VisuallyHidden.Root>
                </DialogHeader>
              )}
              {/* An animated counter for captured files, shown only on mobile. */}
              <AnimatePresence>
                {isMobile && files.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="font-inter absolute top-4 right-4 z-20 rounded-md bg-emerald-600/80 px-3 py-1 text-sm font-normal text-white shadow-lg backdrop-blur-sm"
                  >
                    {files.length} / {MAX_FILES}
                  </motion.div>
                )}
              </AnimatePresence>
              {/* The standard visible dialog header for desktop view. */}
              {!isMobile && (
                <motion.div variants={itemVariants} className="shrink-0 px-6 pt-6">
                  <DialogHeader>
                    <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-emerald-600 md:text-2xl">
                      Take Picture
                    </DialogTitle>
                    <DialogDescription className="font-inter text-center text-sm text-slate-600">
                      Position the subject within the frame.
                    </DialogDescription>
                  </DialogHeader>
                </motion.div>
              )}
              {/* Animated container for the main camera view. */}
              <motion.div
                variants={itemVariants}
                className={cn(
                  "flex items-center justify-center",
                  isMobile ? "flex-grow overflow-hidden" : "px-6 py-4"
                )}
              >
                <CameraView
                  cameraError={cameraError}
                  facingMode={facingMode}
                  aspectRatio={aspectRatio}
                  isMirrored={isMirrored}
                  rotation={rotation}
                  webcamRef={webcamRef}
                  onUserMediaError={handleUserMediaError}
                  isMobile={isMobile}
                />
              </motion.div>
              {/* Allows individual thumbnails to have exit animations. */}
              <AnimatePresence>
                <CaptureThumbnailList
                  cameraFiles={cameraFiles}
                  onRemoveFile={(file) => handleRemoveFile(file, isMobile)}
                  isMobile={isMobile}
                  deleteMutation={deleteMutation}
                />
              </AnimatePresence>
              {/* Animated container for the camera controls. */}
              <motion.div variants={itemVariants}>
                <CameraControls
                  onAspectRatioChange={handleAspectRatioChange}
                  onRotateCamera={handleRotateCamera}
                  onCapture={() => handleCapture(isMobile)}
                  onMirrorCamera={handleMirrorCamera}
                  onDeviceFlip={handleDeviceFlip}
                  cameraError={cameraError}
                  isMaxFilesReached={isMaxFilesReached}
                  isCapturing={isCapturing}
                  aspectRatio={aspectRatio}
                  rotation={rotation}
                  filesCount={files.length}
                  isMirrored={isMirrored}
                  facingMode={facingMode}
                  isMobile={isMobile}
                />
              </motion.div>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}

CaseCapture.displayName = "CaseCapture";
