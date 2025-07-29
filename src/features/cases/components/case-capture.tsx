"use client";

import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import * as React from "react";
import { FiCamera } from "react-icons/fi";
import {
  LuArrowRightLeft,
  LuLoaderCircle,
  LuRectangleHorizontal,
  LuRectangleVertical,
  LuRefreshCw,
  LuSquare,
  LuTrash2,
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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type UploadableFile,useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { deleteUpload } from "@/features/cases/actions/delete-upload";
import { useIsMobile } from "@/hooks/use-mobile";
import { CAMERA_ASPECT_RATIOS, MAX_FILES } from "@/lib/constants";
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
 * A thumbnail component for displaying captured images within the dialog.
 * It shows a preview, includes a button to remove the image, and has a conditional ring style for mobile.
 */
const CapturedImageThumbnail = ({
  uploadableFile,
  onRemove,
  isMobile,
  isDeleting,
}: {
  // The captured image file wrapper to be displayed
  uploadableFile: UploadableFile;
  // Callback function to trigger when the remove button is clicked.
  onRemove: () => void;
  // A boolean to determine if the component should render in its mobile variant.
  isMobile: boolean;
  // A boolean to indicate if the deletion is in progress.
  isDeleting: boolean;
}) => {
  // Destructure the raw File object for URL creation.
  const { file } = uploadableFile;
  // State to hold the temporary local URL for the image file preview.
  const [previewUrl, setPreviewUrl] = React.useState<string>("");

  // Effect to create and revoke a temporary URL for the file object.
  React.useEffect(() => {
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [file]);

  if (!file || !previewUrl) {
    return <div className="h-16 w-16 flex-shrink-0 animate-pulse rounded-lg bg-slate-200" />;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "tween", duration: 0.4, ease: "easeInOut" }}
      className={cn(
        "relative h-16 w-16 flex-shrink-0 rounded-lg",
        isMobile && "ring-2 ring-emerald-400/60 ring-offset-black/50"
      )}
    >
      <Image
        src={previewUrl}
        alt={`Captured: ${file.name}`}
        fill
        className="rounded-lg object-cover"
        sizes="64px"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        disabled={isDeleting}
        aria-label={`Remove ${file.name}`}
        className="absolute -top-2 -right-2 z-20 flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-rose-200 text-rose-400 transition-all duration-300 ease-in-out hover:bg-rose-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isDeleting ? (
          <LuLoaderCircle className="h-3 w-3 animate-spin" />
        ) : (
          <LuTrash2 className="h-3 w-3" />
        )}
      </Button>
    </motion.div>
  );
};

/**
 * Props for the CaseCapture component.
 */
interface CaseCaptureProps {
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
export function CaseCapture({ isOpen, onOpenChange }: CaseCaptureProps) {
  const webcamRef = React.useRef<Webcam>(null);
  const files = useAnalyzeStore((state) => state.data.files);
  const addFiles = useAnalyzeStore((state) => state.addFiles);
  const removeFile = useAnalyzeStore((state) => state.removeFile);

  const [isClient, setIsClient] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<CameraError | null>(null);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [aspectRatio, setAspectRatio] = React.useState<AspectRatioOption>(aspectRatioOptions[0]);
  const [facingMode, setFacingMode] = React.useState<"user" | "environment">("environment");
  const [rotation, setRotation] = React.useState(0);
  const [isMirrored, setIsMirrored] = React.useState(false);
  const isMobile = useIsMobile();
  const cameraFiles = files.filter((f) => f.source === "camera");
  const isMaxFilesReached = files.length >= MAX_FILES;

  const deleteMutation = useMutation({
    mutationFn: deleteUpload,
  });

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      setCameraError(null);
      setAspectRatio(aspectRatioOptions[0]);
      setFacingMode("environment");
      setRotation(0);
      setIsMirrored(false);
    }
  }, [isOpen]);

  React.useEffect(() => {
    setRotation(0);
  }, [aspectRatio]);

  const handleRemoveFile = (file: UploadableFile) => {
    if (!file.key) {
      removeFile(file.id);
      return;
    }
    deleteMutation.mutate(
      { key: file.key },
      {
        onSuccess: (data) => {
          if (data.success) {
            removeFile(file.id);
            if (!isMobile) toast.success("Captured image removed.");
          } else {
            toast.error(data.error || "Failed to remove captured image.");
          }
        },
        onError: (error) => toast.error(`An error occurred: ${error.message}`),
      }
    );
  };

  const handleAspectRatioChange = () => {
    const currentIndex = aspectRatioOptions.findIndex((ar) => ar.name === aspectRatio.name);
    setAspectRatio(aspectRatioOptions[(currentIndex + 1) % aspectRatioOptions.length]);
  };

  const handleDeviceFlip = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const handleRotateCamera = () => {
    setRotation((prev) =>
      aspectRatio.name === "Square" ? (prev + 90) % 360 : prev === 0 ? 180 : 0
    );
  };

  const handleMirrorCamera = () => setIsMirrored((prev) => !prev);

  const handleCapture = async () => {
    if (isCapturing || !webcamRef.current) return;
    const video = webcamRef.current.video;
    if (!video) {
      toast.error("Camera is not ready. Please try again.");
      return;
    }
    if (files.length >= MAX_FILES) {
      toast.error(`You cannot add more than ${MAX_FILES} images.`);
      return;
    }

    setIsCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error("Could not process image. Please try again.");
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const finalImageSrc = await new Promise<string>((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          const cropCanvas = document.createElement("canvas");
          const cropCtx = cropCanvas.getContext("2d");
          if (!cropCtx) {
            resolve(canvas.toDataURL("image/jpeg", 1.0));
            return;
          }

          const { width: sourceWidth, height: sourceHeight } = img;
          const sourceAspectRatio = sourceWidth / sourceHeight;
          const targetAspectRatio = aspectRatio.value;

          let sWidth = sourceWidth,
            sHeight = sourceHeight,
            sx = 0,
            sy = 0;

          if (sourceAspectRatio > targetAspectRatio) {
            sWidth = sourceHeight * targetAspectRatio;
            sx = (sourceWidth - sWidth) / 2;
          } else if (sourceAspectRatio < targetAspectRatio) {
            sHeight = sourceWidth / targetAspectRatio;
            sy = (sourceHeight - sHeight) / 2;
          }

          if (rotation === 90 || rotation === 270) {
            cropCanvas.width = sHeight;
            cropCanvas.height = sWidth;
          } else {
            cropCanvas.width = sWidth;
            cropCanvas.height = sHeight;
          }

          cropCtx.translate(cropCanvas.width / 2, cropCanvas.height / 2);
          cropCtx.rotate((rotation * Math.PI) / 180);
          cropCtx.drawImage(
            img,
            sx,
            sy,
            sWidth,
            sHeight,
            -sWidth / 2,
            -sHeight / 2,
            sWidth,
            sHeight
          );
          resolve(cropCanvas.toDataURL("image/jpeg", 1.0));
        };
        img.onerror = () => resolve(canvas.toDataURL("image/jpeg", 1.0));
        img.src = canvas.toDataURL("image/jpeg", 1.0);
      });

      const blob = await fetch(finalImageSrc).then((res) => res.blob());
      const newFile = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      addFiles([newFile], "camera");
      if (!isMobile) toast.success("Image captured successfully.");
    } catch (err) {
      console.error("Failed to capture image:", err);
      toast.error("An error occurred while capturing the image.");
    } finally {
      setIsCapturing(false);
    }
  };

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

  const videoConstraints = {
    width: { ideal: 4096 },
    height: { ideal: 2160 },
    facingMode,
  };

  const isFrontCamera = facingMode === "user";
  const DeviceFlipIcon = isFrontCamera ? FiCamera : SlUser;
  const deviceFlipTooltipText = isFrontCamera ? "Switch to Back Camera" : "Switch to Front Camera";
  const mirrorTooltipText = isMirrored ? "Disable Mirror" : "Enable Mirror";

  if (!isClient) return null;

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
              if (isMobile) e.preventDefault();
            }}
          >
            <motion.div
              className={cn("flex h-full w-full flex-col", isMobile && "relative")}
              variants={dialogContentVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
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
                        key={facingMode}
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
                          ref={webcamRef}
                          audio={false}
                          className="h-full w-full object-cover"
                          onUserMediaError={handleUserMediaError}
                          videoConstraints={videoConstraints}
                          mirrored={isMirrored}
                          style={{ transform: `rotate(${rotation}deg)` }}
                          screenshotFormat="image/jpeg"
                          screenshotQuality={1}
                        />
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </motion.div>
              <AnimatePresence>
                {cameraFiles.length > 0 && (
                  <motion.div
                    variants={itemVariants}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className={cn(
                      "shrink-0",
                      isMobile
                        ? "absolute bottom-[88px] left-0 z-10 w-full px-4"
                        : "px-6 pb-0 md:pb-4"
                    )}
                  >
                    <ScrollArea className="w-full whitespace-nowrap">
                      <div className="flex w-max space-x-4 p-3">
                        <AnimatePresence>
                          {cameraFiles.map((uploadableFile) => (
                            <CapturedImageThumbnail
                              key={uploadableFile.id}
                              uploadableFile={uploadableFile}
                              onRemove={() => handleRemoveFile(uploadableFile)}
                              isMobile={isMobile}
                              isDeleting={
                                deleteMutation.isPending &&
                                deleteMutation.variables?.key === uploadableFile.key
                              }
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.div
                variants={itemVariants}
                className={cn(
                  isMobile ? "absolute bottom-0 left-0 z-10 w-full" : "shrink-0 px-6 pt-0 pb-6"
                )}
              >
                <DialogFooter
                  className={cn("flex-row !justify-center", isMobile && "bg-black/75 py-4")}
                >
                  <TooltipProvider delayDuration={200}>
                    <div className="flex flex-wrap items-center justify-center gap-4">
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
                      <div
                        className={cn({ "cursor-not-allowed": !!cameraError || isMaxFilesReached })}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              onClick={handleCapture}
                              aria-label="Take picture"
                              disabled={!!cameraError || isMaxFilesReached || isCapturing}
                              className={cn(
                                "group h-12 w-12 rounded-full border-2 bg-transparent p-1 transition-all duration-300 ease-in-out active:scale-95",
                                {
                                  "border-rose-200 bg-rose-100": !!cameraError,
                                  "border-emerald-500 opacity-60":
                                    (isMaxFilesReached || isCapturing) && !cameraError,
                                  "cursor-pointer border-emerald-500 hover:border-amber-400 hover:bg-transparent":
                                    !cameraError && !isMaxFilesReached && !isCapturing,
                                }
                              )}
                            >
                              <div
                                className={cn(
                                  "h-full w-full rounded-full transition-colors duration-300 ease-in-out",
                                  {
                                    "bg-rose-200": !!cameraError,
                                    "bg-emerald-500/50":
                                      (isMaxFilesReached || isCapturing) && !cameraError,
                                    "bg-emerald-500/50 group-hover:bg-amber-400/50":
                                      !cameraError && !isMaxFilesReached && !isCapturing,
                                  }
                                )}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-inter">
                              {isMaxFilesReached
                                ? `Maximum ${MAX_FILES} images reached`
                                : `Capture Image (${files.length}/${MAX_FILES})`}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
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
