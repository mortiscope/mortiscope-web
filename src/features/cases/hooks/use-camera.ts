import { useMutation } from "@tanstack/react-query";
import * as React from "react";
import type Webcam from "react-webcam";
import { toast } from "sonner";

import { type UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { deleteUpload } from "@/features/cases/actions/delete-upload";
import { CAMERA_ASPECT_RATIOS, MAX_FILES } from "@/lib/constants";

/**
 * Defines the structure for a camera error object.
 */
type CameraError = { title: string; description: string };

/**
 * A static configuration for aspect ratio options, derived from constants.
 * The icon property is stubbed out as it's handled by the UI component.
 */
const aspectRatioOptions = CAMERA_ASPECT_RATIOS.map((ratio) => {
  if (ratio.name === "Square") return { ...ratio, icon: React.Fragment };
  if (ratio.name === "Landscape") return { ...ratio, icon: React.Fragment };
  if (ratio.name === "Portrait") return { ...ratio, icon: React.Fragment };
  return { ...ratio, icon: React.Fragment };
});

/**
 * Type definition for a single aspect ratio option, omitting the icon property.
 */
type AspectRatioOption = Omit<(typeof aspectRatioOptions)[0], "icon">;

/**
 * Defines the props required by the useCamera hook.
 */
type UseCameraProps = {
  /** A boolean to control when to run side effects, like resetting state. */
  isOpen: boolean;
  /** A ref to the `react-webcam` component instance, required for capturing images. */
  webcamRef: React.RefObject<Webcam | null>;
};

/**
 * A hook to manage all state and logic for the camera capture component.
 * It handles everything from device settings to the image capture and processing workflow.
 */
export const useCamera = ({ isOpen, webcamRef }: UseCameraProps) => {
  // Retrieves files and state-updating actions from the global Zustand store.
  const files = useAnalyzeStore((state) => state.data.files);
  const addFiles = useAnalyzeStore((state) => state.addFiles);
  const removeFile = useAnalyzeStore((state) => state.removeFile);

  /** Stores the current camera error state, if any, for display in the UI. */
  const [cameraError, setCameraError] = React.useState<CameraError | null>(null);
  /** Tracks the pending state of an image capture to prevent multiple simultaneous captures. */
  const [isCapturing, setIsCapturing] = React.useState(false);
  /** Stores the currently selected aspect ratio for the camera view. */
  const [aspectRatio, setAspectRatio] = React.useState<AspectRatioOption>(aspectRatioOptions[0]);
  /** Stores the current camera facing mode ('user' or 'environment'). */
  const [facingMode, setFacingMode] = React.useState<"user" | "environment">("environment");
  /** Stores the current rotation angle (0, 90, 180, 270) of the camera preview. */
  const [rotation, setRotation] = React.useState(0);
  /** Stores whether the camera preview should be horizontally mirrored. */
  const [isMirrored, setIsMirrored] = React.useState(false);

  /** Filters the global file list to include only those sourced from the camera. */
  const cameraFiles = files.filter((f) => f.source === "camera");
  /** A boolean flag indicating if the file limit has been met. */
  const isMaxFilesReached = files.length >= MAX_FILES;

  /** Initializes a mutation for handling asynchronous file deletion via a server action. */
  const deleteMutation = useMutation({ mutationFn: deleteUpload });

  /** Resets all camera settings to their default values whenever the dialog is opened. */
  React.useEffect(() => {
    if (isOpen) {
      setCameraError(null);
      setAspectRatio(aspectRatioOptions[0]);
      setFacingMode("environment");
      setRotation(0);
      setIsMirrored(false);
    }
  }, [isOpen]);

  /** Resets the rotation angle whenever the aspect ratio changes to prevent invalid states. */
  React.useEffect(() => {
    setRotation(0);
  }, [aspectRatio]);

  /**
   * Handles the removal of a file. It removes locally for non-uploaded files or
   * triggers a server mutation for already uploaded files.
   */
  const handleRemoveFile = (file: UploadableFile, isMobile: boolean) => {
    // If the file has no key, it hasn't been uploaded, so remove it from local state only.
    if (!file.key) {
      removeFile(file.id);
      return;
    }
    // Otherwise, trigger the server-side deletion.
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

  /** Cycles to the next available aspect ratio option. */
  const handleAspectRatioChange = () => {
    const currentIndex = aspectRatioOptions.findIndex((ar) => ar.name === aspectRatio.name);
    setAspectRatio(aspectRatioOptions[(currentIndex + 1) % aspectRatioOptions.length]);
  };

  /** Switches between the front ('user') and back ('environment') cameras. */
  const handleDeviceFlip = () =>
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  /** Rotates the camera preview by 90 or 180 degrees depending on the aspect ratio. */
  const handleRotateCamera = () =>
    setRotation((prev) =>
      aspectRatio.name === "Square" ? (prev + 90) % 360 : prev === 0 ? 180 : 0
    );
  /** Toggles horizontal mirroring of the camera preview. */
  const handleMirrorCamera = () => setIsMirrored((prev) => !prev);

  /**
   * Initiates the image capture process. It draws the current video frame onto a primary
   * canvas, then uses a secondary canvas to crop and rotate the image according to the
   * current settings. Finally, it converts the processed canvas to a `File` object and
   * adds it to the global state.
   */
  const handleCapture = async (isMobile: boolean) => {
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
      // Draw the full video frame to a temporary canvas.
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error("Could not process image. Please try again.");
        return;
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Create a new image object to perform cropping and rotation on a final canvas.
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

          // Calculate dimensions for cropping to the target aspect ratio.
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

          // Set canvas dimensions based on rotation.
          if (rotation === 90 || rotation === 270) {
            cropCanvas.width = sHeight;
            cropCanvas.height = sWidth;
          } else {
            cropCanvas.width = sWidth;
            cropCanvas.height = sHeight;
          }

          // Apply rotation and draw the cropped image.
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

      // Convert the final Data URL to a Blob, then to a File object.
      const blob = await fetch(finalImageSrc).then((res) => res.blob());
      const newFile = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });

      // Add the new file to the global store.
      addFiles([newFile], "camera");
      if (!isMobile) toast.success("Image captured successfully.");
    } catch (err) {
      console.error("Failed to capture image:", err);
      toast.error("An error occurred while capturing the image.");
    } finally {
      // Ensure the capturing state is always reset.
      setIsCapturing(false);
    }
  };

  /**
   * A callback to handle errors from the `getUserMedia` API. It translates technical
   * error names into user-friendly titles and descriptions for the interface.
   */
  const handleUserMediaError = (error: string | DOMException) => {
    console.error("Webcam Error:", error);
    toast.error("Could not access the camera.");
    if (typeof error === "string") {
      setCameraError({
        title: "An Unknown Error Occurred",
        description: "Please check your browser settings.",
      });
      return;
    }
    switch (error.name) {
      case "NotAllowedError":
        setCameraError({
          title: "Permission Denied",
          description: "Please enable camera access in your browser settings.",
        });
        break;
      case "NotFoundError":
        setCameraError({
          title: "No Camera Found",
          description: "Please connect a camera and try again.",
        });
        break;
      case "NotReadableError":
        setCameraError({
          title: "Camera is in Use",
          description: "Another application might be using your camera.",
        });
        break;
      default:
        setCameraError({
          title: "Camera Unavailable",
          description: "An unexpected error occurred.",
        });
        break;
    }
  };

  // Exposes all necessary state and handlers for the interface components to consume.
  return {
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
  };
};
