import * as React from "react";
import { FiCamera } from "react-icons/fi";
import {
  LuArrowRightLeft,
  LuRectangleHorizontal,
  LuRectangleVertical,
  LuRefreshCw,
  LuSquare,
} from "react-icons/lu";
import { SlUser } from "react-icons/sl";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MAX_FILES } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Defines the structure for the aspect ratio state.
 */
type AspectRatio = { name: string; value: number };

/**
 * Defines the props required by the CameraControls component.
 */
type CameraControlsProps = {
  /** Callback function to cycle through available aspect ratios. */
  onAspectRatioChange: () => void;
  /** Callback function to rotate the camera preview. */
  onRotateCamera: () => void;
  /** Callback function to trigger taking a picture. */
  onCapture: () => void;
  /** Callback function to toggle horizontal mirroring of the camera preview. */
  onMirrorCamera: () => void;
  /** Callback function to switch between front and back cameras. */
  onDeviceFlip: () => void;
  /** The current error state from the camera, if any. */
  cameraError: unknown;
  /** A boolean indicating if the maximum number of files has been reached. */
  isMaxFilesReached: boolean;
  /** A boolean indicating if a capture is currently in progress. */
  isCapturing: boolean;
  /** The current aspect ratio object. */
  aspectRatio: AspectRatio;
  /** The current rotation angle of the camera. */
  rotation: number;
  /** The current number of captured files. */
  filesCount: number;
  /** A boolean indicating if the camera preview is currently mirrored. */
  isMirrored: boolean;
  /** The current camera facing mode ('user' or 'environment'). */
  facingMode: "user" | "environment";
  /** A boolean indicating if the component should render in its mobile layout. */
  isMobile: boolean;
};

// Map aspect ratio names to icons for rendering.
const aspectRatioIcons: Record<string, React.ElementType> = {
  Square: LuSquare,
  Landscape: LuRectangleHorizontal,
  Portrait: LuRectangleVertical,
};

/**
 * Renders the set of controls for the camera, including capture, rotation, and aspect ratio.
 * This component is memoized to prevent re-renders when its props do not change.
 */
export const CameraControls = React.memo(
  ({
    onAspectRatioChange,
    onRotateCamera,
    onCapture,
    onMirrorCamera,
    onDeviceFlip,
    cameraError,
    isMaxFilesReached,
    isCapturing,
    aspectRatio,
    rotation,
    filesCount,
    isMirrored,
    facingMode,
    isMobile,
  }: CameraControlsProps) => {
    // Dynamically select the icon based on the current aspect ratio.
    const AspectRatioIcon = aspectRatioIcons[aspectRatio.name] ?? LuSquare;
    // Determine if the camera is currently front-facing.
    const isFrontCamera = facingMode === "user";
    // Dynamically select the icon for the device flip button based on the facing mode.
    const DeviceFlipIcon = isFrontCamera ? FiCamera : SlUser;
    // Dynamically set tooltip text for clarity.
    const deviceFlipTooltipText = isFrontCamera
      ? "Switch to Back Camera"
      : "Switch to Front Camera";
    const mirrorTooltipText = isMirrored ? "Disable Mirror" : "Enable Mirror";

    return (
      // The main container adapts its layout based on the `isMobile` prop.
      <div
        className={cn(
          isMobile ? "absolute bottom-0 left-0 z-10 w-full" : "shrink-0 px-6 pt-0 pb-6"
        )}
      >
        <DialogFooter className={cn("flex-row !justify-center", isMobile && "bg-black/75 py-4")}>
          <TooltipProvider delayDuration={200}>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {/* Aspect Ratio Control */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={onAspectRatioChange}
                    disabled={!!cameraError}
                    aria-label="Change aspect ratio"
                    className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 md:hover:bg-amber-100 md:hover:text-amber-600"
                  >
                    <AspectRatioIcon className="!h-6 !w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-inter">Aspect Ratio: {aspectRatio.name}</p>
                </TooltipContent>
              </Tooltip>

              {/* Rotation Control */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={onRotateCamera}
                    disabled={!!cameraError}
                    aria-label="Rotate camera"
                    className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 md:hover:bg-amber-100 md:hover:text-amber-600"
                  >
                    <LuRefreshCw className="!h-6 !w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-inter">Rotation: {rotation}°</p>
                </TooltipContent>
              </Tooltip>

              {/* Main Capture Button */}
              <div className={cn({ "cursor-not-allowed": !!cameraError || isMaxFilesReached })}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      onClick={onCapture}
                      aria-label="Take picture"
                      disabled={!!cameraError || isMaxFilesReached || isCapturing}
                      // Applies complex conditional styling for different states.
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
                            "bg-emerald-500/50": (isMaxFilesReached || isCapturing) && !cameraError,
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
                        : `Capture Image (${filesCount}/${MAX_FILES})`}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Mirror Control */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={onMirrorCamera}
                    disabled={!!cameraError}
                    aria-label="Flip horizontally"
                    className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 md:hover:bg-amber-100 md:hover:text-amber-600"
                  >
                    <LuArrowRightLeft className="!h-6 !w-6" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-inter">{mirrorTooltipText}</p>
                </TooltipContent>
              </Tooltip>

              {/* Device Flip Control (Front/Back Camera) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={onDeviceFlip}
                    disabled={!!cameraError}
                    aria-label="Flip camera"
                    className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 md:hover:bg-amber-100 md:hover:text-amber-600"
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
      </div>
    );
  }
);

CameraControls.displayName = "CameraControls";
