"use client";

import * as React from "react";
import type Webcam from "react-webcam";
import { toast } from "sonner";

/**
 * Encapsulates the complex client-side logic for capturing and processing a webcam image.
 * Uses the Canvas API to crop and rotate the image before returning a File object.
 */
export const useCameraProcessor = (
  webcamRef: React.RefObject<Webcam | null>,
  aspectRatioValue: number,
  rotation: number
) => {
  /** Tracks the pending state of an image capture to prevent multiple simultaneous captures. */
  const [isCapturing, setIsCapturing] = React.useState(false);

  /**
   * The core capture and processing logic. Returns a File object on success or null on failure.
   */
  const capture = async (): Promise<File | null> => {
    if (isCapturing || !webcamRef.current) return null;
    const video = webcamRef.current.video;
    if (!video) {
      toast.error("Camera is not ready. Please try again.");
      return null;
    }

    setIsCapturing(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not create canvas context.");
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

          let sWidth = sourceWidth,
            sHeight = sourceHeight,
            sx = 0,
            sy = 0;
          if (sourceAspectRatio > aspectRatioValue) {
            sWidth = sourceHeight * aspectRatioValue;
            sx = (sourceWidth - sWidth) / 2;
          } else if (sourceAspectRatio < aspectRatioValue) {
            sHeight = sourceWidth / aspectRatioValue;
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
      return new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
    } catch (err) {
      console.error("Failed to capture image:", err);
      toast.error("An error occurred while capturing the image.");
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  return { capture, isCapturing };
};
