"use client";

import { useMutation } from "@tanstack/react-query";
import * as React from "react";
import type Webcam from "react-webcam";
import { toast } from "sonner";

import { type UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { useCameraProcessor } from "@/features/cases/hooks/use-camera-processor";
import { useCameraSettings } from "@/features/cases/hooks/use-camera-settings";
import { deleteUpload } from "@/features/upload/actions/delete-upload";
import { MAX_FILES } from "@/lib/constants";

/**
 * Defines the structure for a camera error object.
 */
type CameraError = { title: string; description: string };

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
 * It orchestrates specialized hooks for settings and image processing.
 */
export const useCamera = ({ isOpen, webcamRef }: UseCameraProps) => {
  // FIX: Destructure the `data` object from the store, not `files` directly.
  const { data, addFiles, removeFile } = useAnalyzeStore();
  const files = data.files;

  /** Stores the current camera error state, if any, for display in the UI. */
  const [cameraError, setCameraError] = React.useState<CameraError | null>(null);

  // Specialized hook for camera settings
  const { aspectRatio, rotation, ...settings } = useCameraSettings(isOpen);
  // Specialized hook for image processing
  const { capture, isCapturing } = useCameraProcessor(webcamRef, aspectRatio.value, rotation);

  /** Filters the global file list to include only those sourced from the camera. */
  // FIX: Added the `UploadableFile` type to the filter callback parameter.
  const cameraFiles = files.filter((f: UploadableFile) => f.source === "camera");
  /** A boolean flag indicating if the file limit has been met. */
  const isMaxFilesReached = files.length >= MAX_FILES;
  /** Initializes a mutation for handling asynchronous file deletion via a server action. */
  const deleteMutation = useMutation({ mutationFn: deleteUpload });

  /** Resets camera error state when the dialog is opened. */
  React.useEffect(() => {
    if (isOpen) setCameraError(null);
  }, [isOpen]);

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

  /**
   * Initiates the image capture process by calling the processor hook and then
   * adding the resulting file to the global state.
   */
  const handleCapture = async (isMobile: boolean) => {
    if (isMaxFilesReached) {
      toast.error(`You cannot add more than ${MAX_FILES} images.`);
      return;
    }
    const newFile = await capture();
    if (newFile) {
      addFiles([newFile], "camera");
      if (!isMobile) toast.success("Image captured successfully.");
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
    rotation,
    ...settings,
    cameraFiles,
    isMaxFilesReached,
    deleteMutation,
    handleRemoveFile,
    handleCapture,
    handleUserMediaError,
  };
};
