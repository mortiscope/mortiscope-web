"use client";

import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { AnimatePresence, motion } from "framer-motion";
import * as React from "react";
import { FiCamera } from "react-icons/fi";
import {
  LuArrowRightLeft,
  LuRectangleHorizontal,
  LuRectangleVertical,
  LuRefreshCw,
  LuSquare,
} from "react-icons/lu";
import { PiWarningLight } from "react-icons/pi";
import { SlUser } from "react-icons/sl";
import Webcam from "react-webcam";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { CAMERA_ASPECT_RATIOS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the main dialog container.
 * This orchestrates the animation of its children with a staggered effect.
 */
const dialogContentVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.15,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Framer Motion variants for individual animated items within the dialog.
 * This creates the "slide-up and fade-in" effect.
 */
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 150,
    },
  },
  exit: {
    y: 20,
    opacity: 0,
    transition: {
      duration: 0.15,
    },
  },
};

/**
 * Props for the AnalyzeCapture component.
 */
interface AnalyzeCaptureProps {
  /** Controls whether the camera dialog is open. */
  isOpen: boolean;
  /** Callback function to handle changes to the dialog's open state. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * Defines the structure for a camera error message.
 */
type CameraError = {
  title: string;
  description: string;
};

/**
 * Maps the imported `CAMERA_ASPECT_RATIOS` constants to their corresponding icons for use in the interface.
 */
const aspectRatioOptions = CAMERA_ASPECT_RATIOS.map((ratio) => {
  if (ratio.name === "Square") return { ...ratio, icon: LuSquare };
  if (ratio.name === "Landscape") return { ...ratio, icon: LuRectangleHorizontal };
  if (ratio.name === "Portrait") return { ...ratio, icon: LuRectangleVertical };
  return { ...ratio, icon: LuSquare };
});

/**
 * Defines the type for a single aspect ratio option, including its icon component.
 */
type AspectRatioOption = (typeof aspectRatioOptions)[0];

/**
 * Renders a responsive dialog for capturing images using the device's camera.
 * It includes controls for aspect ratio, rotation, and flipping, handles camera
 * permissions and errors, and provides distinct UI/UX for mobile and desktop devices.
 */
export function AnalyzeCapture({ isOpen, onOpenChange }: AnalyzeCaptureProps) {
  // State to prevent SSR issues with the Webcam component, which relies on browser APIs.
  const [isClient, setIsClient] = React.useState(false);
  // State to hold any camera-related error to display in the interface.
  const [cameraError, setCameraError] = React.useState<CameraError | null>(null);
  // State for the current aspect ratio setting.
  const [aspectRatio, setAspectRatio] = React.useState<AspectRatioOption>(aspectRatioOptions[0]);
  // State to control which camera is active ('user' for front, 'environment' for back).
  const [facingMode, setFacingMode] = React.useState<"user" | "environment">("environment");
  // State for the CSS rotation of the camera feed.
  const [rotation, setRotation] = React.useState(0);
  // State to control horizontal mirroring of the camera feed.
  const [isMirrored, setIsMirrored] = React.useState(false);
  // Hook to determine if the device is mobile for responsive rendering.
  const isMobile = useIsMobile();

  // Ensures the component only renders the Webcam on the client-side to prevent SSR errors.
  React.useEffect(() => {
    setIsClient(true);
  }, []);

  // Resets all camera settings to their default state whenever the dialog is opened.
  React.useEffect(() => {
    if (isOpen) {
      setCameraError(null);
      setAspectRatio(aspectRatioOptions[0]);
      setFacingMode("environment");
      setRotation(0);
      setIsMirrored(false);
    }
  }, [isOpen]);

  // Resets the rotation whenever the aspect ratio changes to avoid unintended orientation.
  React.useEffect(() => {
    setRotation(0);
  }, [aspectRatio]);

  /** Cycles through the available aspect ratio options. */
  const handleAspectRatioChange = () => {
    const currentIndex = aspectRatioOptions.findIndex((ar) => ar.name === aspectRatio.name);
    setAspectRatio(aspectRatioOptions[(currentIndex + 1) % aspectRatioOptions.length]);
  };

  /** Toggles between the front and back cameras on the device. */
  const handleDeviceFlip = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  /** Rotates the camera feed. The rotation logic depends on the current aspect ratio. */
  const handleRotateCamera = () => {
    if (aspectRatio.name === "Square") {
      setRotation((prev) => (prev + 90) % 360);
    } else {
      setRotation((prev) => (prev === 0 ? 180 : 0));
    }
  };

  /** Toggles the horizontal mirroring of the camera feed. */
  const handleMirrorCamera = () => {
    setIsMirrored((prev) => !prev);
  };

  /**
   * Callback for handling errors from the `react-webcam` component. 
   * It logs the error, shows a toast notification, and sets a specific error state on the error type.
   */
  const handleUserMediaError = (error: string | DOMException) => {
    console.error("Webcam Error:", error);
    toast.error("Could not access the camera.");

    if (typeof error === "string") {
      setCameraError({
        title: "An Unknown Error Occurred",
        description: "Please check your browser settings or try a different browser.",
      });
      return;
    }

    switch (error.name) {
      case "NotAllowedError":
        setCameraError({
          title: "Permission Denied",
          description: "You have denied camera access. Please enable it in your browser settings.",
        });
        break;
      case "NotFoundError":
        setCameraError({
          title: "No Camera Found",
          description:
            "We could not find a camera on your device. Please connect a camera and try again.",
        });
        break;
      case "NotReadableError":
        setCameraError({
          title: "Camera is in Use",
          description:
            "Your camera might be used by another application. Please close it and try again.",
        });
        break;
      case "OverconstrainedError":
        setCameraError({
          title: "Camera Not Supported",
          description: "Your camera does not meet the required specifications for this feature.",
        });
        break;
      case "SecurityError":
        setCameraError({
          title: "Security Issue",
          description:
            "Camera access is only available on secure (HTTPS) connections. Please check your URL.",
        });
        break;
      default:
        setCameraError({
          title: "Camera Unavailable",
          description: "An unexpected error occurred. Please try again or restart your browser.",
        });
        break;
    }
  };

  /** Defines the constraints passed to the `react-webcam` component. */
  const videoConstraints = {
    aspectRatio: aspectRatio.value,
    facingMode: facingMode,
  };

  /** Derived variables for dynamically setting UI elements like icons and tooltips. */
  const isFrontCamera = facingMode === "user";
  const DeviceFlipIcon = isFrontCamera ? FiCamera : SlUser;
  const deviceFlipTooltipText = isFrontCamera ? "Switch to Back Camera" : "Switch to Front Camera";
  const mirrorTooltipText = isMirrored ? "Disable Mirror" : "Enable Mirror";

  // Prevents rendering on the server to avoid hydration mismatches.
  if (!isClient) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent
            className={cn(
              "flex flex-col p-0 shadow-2xl",
              isMobile
                ? "h-dvh w-screen max-w-none rounded-none border-none bg-black"
                : "rounded-2xl sm:max-w-[720px] md:rounded-3xl"
            )}
            onInteractOutside={(e) => {
              // Prevents closing the dialog by clicking outside on mobile devices.
              if (isMobile) e.preventDefault();
            }}
          >
            {/* The main animation container that orchestrates the staggered entry of its children. */}
            <motion.div
              className={cn("flex h-full w-full flex-col", isMobile && "relative")}
              variants={dialogContentVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              {/* Provides an accessible title/description for screen readers on mobile where the header is not visually rendered. */}
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

              {/* Renders the standard dialog header, but only on desktop devices. */}
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

              {/* Main content area that displays either the webcam feed or a camera error message. */}
              <motion.div
                variants={itemVariants}
                className={cn(
                  "flex items-center justify-center",
                  isMobile ? "flex-grow overflow-hidden" : "px-6 py-4"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center",
                    !isMobile &&
                      "mx-auto h-96 w-full max-w-[682px] overflow-hidden rounded-xl bg-slate-100",
                    !isMobile && !!cameraError && "bg-rose-50",
                    isMobile && "h-full w-full"
                  )}
                >
                  {/* Manages the transition between the webcam feed and the error message. */}
                  <AnimatePresence mode="wait">
                    {cameraError ? (
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
                        <p className="font-inter max-w-sm text-sm text-rose-400">
                          {cameraError.description}
                        </p>
                      </motion.div>
                    ) : isClient ? (
                      <motion.div
                        key={`${aspectRatio.name}-${facingMode}-${rotation}-${isMirrored}`}
                        className={cn(
                          "relative",
                          isMobile
                            ? {
                                "w-full":
                                  aspectRatio.name === "Landscape" || aspectRatio.name === "Square",
                                "h-full": aspectRatio.name === "Portrait",
                              }
                            : "h-full",
                          aspectRatio.className
                        )}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <Webcam
                          audio={false}
                          className="h-full w-full object-cover"
                          onUserMediaError={handleUserMediaError}
                          videoConstraints={videoConstraints}
                          mirrored={isMirrored}
                          style={{ transform: `rotate(${rotation}deg)` }}
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Contains all the user-facing controls for the camera. */}
              <motion.div
                variants={itemVariants}
                className={cn(
                  // Positions controls at the bottom, absolutely on mobile and relatively on desktop.
                  isMobile ? "absolute bottom-0 left-0 z-10 w-full" : "shrink-0 px-6 pt-0 pb-6"
                )}
              >
                <DialogFooter
                  className={cn("flex-row !justify-center", isMobile && "bg-black/75 py-4")}
                >
                  {/* Wraps controls in a TooltipProvider for better user experience on desktop. */}
                  <TooltipProvider delayDuration={200}>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                      {/* Aspect Ratio Control Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            onClick={handleAspectRatioChange}
                            disabled={!!cameraError}
                            aria-label="Change aspect ratio"
                            className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 disabled:hover:bg-transparent md:hover:bg-amber-100 md:hover:text-amber-600"
                          >
                            <aspectRatio.icon className="!h-6 !w-6" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-inter">Aspect Ratio: {aspectRatio.name}</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Rotation Control Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            onClick={handleRotateCamera}
                            disabled={!!cameraError}
                            aria-label="Rotate camera"
                            className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 disabled:hover:bg-transparent md:hover:bg-amber-100 md:hover:text-amber-600"
                          >
                            <LuRefreshCw className="!h-6 !w-6" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-inter">Rotation: {rotation}°</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Main Capture Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            aria-label="Take picture"
                            disabled={!!cameraError}
                            className="group h-12 w-12 cursor-pointer rounded-full border-2 border-emerald-500 bg-transparent p-1 transition-all duration-300 ease-in-out hover:border-amber-400 hover:bg-transparent active:scale-95 disabled:cursor-not-allowed disabled:border-rose-200 disabled:bg-rose-100 disabled:hover:border-rose-200"
                          >
                            <div className="h-full w-full rounded-full bg-emerald-500/50 transition-colors duration-300 ease-in-out group-hover:bg-amber-400/50 group-disabled:bg-rose-200" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-inter">Capture Image</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Mirror Control Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            onClick={handleMirrorCamera}
                            disabled={!!cameraError}
                            aria-label="Flip horizontally"
                            className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 disabled:hover:bg-transparent md:hover:bg-amber-100 md:hover:text-amber-600"
                          >
                            <LuArrowRightLeft className="!h-6 !w-6" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-inter">{mirrorTooltipText}</p>
                        </TooltipContent>
                      </Tooltip>
                      {/* Device Flip Control Button */}
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            onClick={handleDeviceFlip}
                            disabled={!!cameraError}
                            aria-label="Flip camera"
                            className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 disabled:hover:bg-transparent md:hover:bg-amber-100 md:hover:text-amber-600"
                          >
                            <DeviceFlipIcon className="!h-6 !w-6" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-inter">{deviceFlipTooltipText}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </DialogFooter>
              </motion.div>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
