"use client";

import * as React from "react";

import { CAMERA_ASPECT_RATIOS } from "@/lib/constants";

const aspectRatioOptions = CAMERA_ASPECT_RATIOS.map((ratio) => ({
  ...ratio,
  icon: React.Fragment,
}));
type AspectRatioOption = Omit<(typeof aspectRatioOptions)[0], "icon">;

/**
 * Manages the state for camera device settings like aspect ratio, facing mode, and rotation.
 * @param isOpen - A boolean that triggers a reset of the settings.
 */
export const useCameraSettings = (isOpen: boolean) => {
  /** Stores the currently selected aspect ratio for the camera view. */
  const [aspectRatio, setAspectRatio] = React.useState<AspectRatioOption>(aspectRatioOptions[0]);
  /** Stores the current camera facing mode ('user' or 'environment'). */
  const [facingMode, setFacingMode] = React.useState<"user" | "environment">("environment");
  /** Stores the current rotation angle (0, 90, 180, 270) of the camera preview. */
  const [rotation, setRotation] = React.useState(0);
  /** Stores whether the camera preview should be horizontally mirrored. */
  const [isMirrored, setIsMirrored] = React.useState(false);

  /** Resets all camera settings to their default values whenever the dialog is opened. */
  React.useEffect(() => {
    if (isOpen) {
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

  return {
    aspectRatio,
    facingMode,
    rotation,
    isMirrored,
    handleAspectRatioChange,
    handleDeviceFlip,
    handleRotateCamera,
    handleMirrorCamera,
  };
};
