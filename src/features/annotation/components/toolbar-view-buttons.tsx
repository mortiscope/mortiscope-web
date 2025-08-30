import { memo } from "react";
import { LuFocus, LuZoomIn, LuZoomOut } from "react-icons/lu";
import { PiCheckSquare, PiSquare } from "react-icons/pi";
import { TbRotate } from "react-icons/tb";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Defines the props for the toolbar view buttons component.
 */
type ToolbarViewButtonsProps = {
  /** An optional callback function to trigger a zoom-in action. */
  onZoomIn?: () => void;
  /** An optional callback function to trigger a zoom-out action. */
  onZoomOut?: () => void;
  /** An optional callback function to center the view on the image. */
  onCenterView?: () => void;
  /** An optional callback function to reset the view to its initial state. */
  onResetView?: () => void;
  /** A boolean indicating if the minimap is currently enabled, used for conditional rendering of the icon and tooltip. */
  isMinimapEnabled?: boolean;
  /** An optional callback function to toggle the minimap's visibility. */
  onToggleMinimap?: () => void;
};

/**
 * A memoized presentational component that renders the set of view control buttons
 * (Zoom, Minimap, Center, Reset) for the annotation editor's floating toolbar.
 * All state and logic are passed in via props, making it fully controlled by its parent.
 *
 * @param {ToolbarViewButtonsProps} props The props for the component.
 * @returns A React component representing the view buttons section.
 */
export const ToolbarViewButtons = memo(function ToolbarViewButtons({
  onZoomIn,
  onZoomOut,
  onCenterView,
  onResetView,
  isMinimapEnabled = false,
  onToggleMinimap,
}: ToolbarViewButtonsProps) {
  return (
    // The main container for the group of buttons, arranged vertically.
    <div className="flex flex-col gap-1">
      {/* Zoom In Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            onClick={onZoomIn}
            aria-label="Zoom in"
            className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
          >
            <LuZoomIn className="!h-5 !w-5 md:!h-6 md:!w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="font-inter">Zoom in</p>
        </TooltipContent>
      </Tooltip>

      {/* Toggle Minimap Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            onClick={onToggleMinimap}
            aria-label={isMinimapEnabled ? "Disable minimap" : "Enable minimap"}
            className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
          >
            {/* Conditionally renders the appropriate icon based on the minimap's state. */}
            {isMinimapEnabled ? (
              <PiCheckSquare className="!h-5 !w-5 md:!h-6 md:!w-6" />
            ) : (
              <PiSquare className="!h-5 !w-5 md:!h-6 md:!w-6" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="font-inter">{isMinimapEnabled ? "Disable minimap" : "Enable minimap"}</p>
        </TooltipContent>
      </Tooltip>

      {/* Center Focus Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            onClick={onCenterView}
            aria-label="Center focus"
            className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
          >
            <LuFocus className="!h-5 !w-5 md:!h-6 md:!w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="font-inter">Center focus</p>
        </TooltipContent>
      </Tooltip>

      {/* Reset View Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            onClick={onResetView}
            aria-label="Reset view"
            className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
          >
            <TbRotate className="!h-5 !w-5 md:!h-6 md:!w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="font-inter">Reset view</p>
        </TooltipContent>
      </Tooltip>

      {/* Zoom Out Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            onClick={onZoomOut}
            aria-label="Zoom out"
            className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
          >
            <LuZoomOut className="!h-5 !w-5 md:!h-6 md:!w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="font-inter">Zoom out</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
});

ToolbarViewButtons.displayName = "ToolbarViewButtons";
