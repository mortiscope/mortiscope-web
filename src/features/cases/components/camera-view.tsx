import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { PiWarningLight } from "react-icons/pi";
import Webcam from "react-webcam";

import { cn } from "@/lib/utils";

/**
 * Defines the structure for a camera error object, or null if no error exists.
 */
type CameraError = { title: string; description: string } | null;

/**
 * Defines the props required by the CameraView component.
 */
type CameraViewProps = {
  /** The error object to display, or null to show the camera feed. */
  cameraError: CameraError;
  /** The desired camera facing mode ('user' for front, 'environment' for back). */
  facingMode: "user" | "environment";
  /** An object containing the aspect ratio value and its corresponding Tailwind CSS class. */
  aspectRatio: { value: number; className: string };
  /** A boolean to control horizontal mirroring of the video feed. */
  isMirrored: boolean;
  /** The rotation angle (in degrees) to apply to the video feed. */
  rotation: number;
  /** A ref object to access the underlying Webcam component instance for capturing images. */
  webcamRef: React.RefObject<Webcam | null>;
  /** A callback function that handles errors from the `getUserMedia` API. */
  onUserMediaError: (error: string | DOMException) => void;
  /** A boolean to toggle between mobile (full-screen) and desktop (contained) layouts. */
  isMobile: boolean;
};

/**
 * Renders the main camera view, displaying either the webcam feed or an error message.
 * This component is memoized to prevent unnecessary re-renders when props are unchanged.
 */
export const CameraView = React.memo(
  ({
    cameraError,
    facingMode,
    aspectRatio,
    isMirrored,
    rotation,
    webcamRef,
    onUserMediaError,
    isMobile,
  }: CameraViewProps) => {
    // Defines the ideal video resolution and facing mode for the `getUserMedia` API.
    const videoConstraints = {
      width: { ideal: 4096 },
      height: { ideal: 2160 },
      facingMode,
    };

    return (
      // The main container for the camera view, adapting its style for mobile/desktop and error states.
      <div
        className={cn(
          "flex items-center justify-center",
          !isMobile && "mx-auto h-96 w-full max-w-[682px] overflow-hidden rounded-xl bg-slate-100",
          !isMobile && !!cameraError && "bg-rose-50",
          isMobile && "h-full w-full"
        )}
      >
        {/* Manages the animated transition between the error state and the live camera feed. */}
        <AnimatePresence mode="wait">
          {cameraError ? (
            // Renders the error message interface when the camera fails to initialize.
            <motion.div
              key="camera-error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="flex flex-col items-center justify-center gap-2 p-4 text-center"
            >
              <PiWarningLight className="md-w-12 h-8 w-8 text-rose-400 md:h-12" />
              <span className="font-plus-jakarta-sans text-lg font-semibold text-rose-500 md:text-xl">
                {cameraError.title}
              </span>
              <p className="font-inter max-w-sm text-sm text-rose-400">{cameraError.description}</p>
            </motion.div>
          ) : (
            // Renders the container for the live webcam feed.
            <motion.div
              key={facingMode}
              className={cn(
                "relative",
                isMobile
                  ? // On mobile, the container size is determined by the aspect ratio to maintain fullscreen.
                    { "w-full": aspectRatio.value >= 1, "h-full": aspectRatio.value < 1 }
                  : "h-full",
                aspectRatio.className
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Webcam
                ref={webcamRef}
                audio={false}
                className="h-full w-full object-cover"
                onUserMediaError={onUserMediaError}
                videoConstraints={videoConstraints}
                mirrored={isMirrored}
                style={{ transform: `rotate(${rotation}deg)` }}
                screenshotFormat="image/jpeg"
                screenshotQuality={1}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

CameraView.displayName = "CameraView";
