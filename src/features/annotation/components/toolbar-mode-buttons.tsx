import { memo } from "react";
import { IoHandRightOutline } from "react-icons/io5";
import { PiBoundingBox, PiCursor } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the toolbar mode buttons component.
 */
type ToolbarModeButtonsProps = {
  /** A boolean indicating if pan mode is currently the active mode. */
  isPanActive: boolean;
  /** A boolean indicating if select mode is currently the active mode. */
  isSelectActive: boolean;
  /** A boolean indicating if draw mode is currently the active mode. */
  isDrawActive: boolean;
  /** A boolean indicating if the editor is currently locked, which disables select and draw modes. */
  isLocked: boolean;
  /** The current state of the draw mode. */
  drawMode: boolean;
  /** A callback function to clear any active selection when changing modes. */
  onClearSelection: () => void;
  /** A callback function to set the draw mode state. */
  onSetDrawMode: (mode: boolean) => void;
  /** A callback function to set the select mode state. */
  onSetSelectMode: (mode: boolean) => void;
};

/**
 * A memoized presentational component that renders the mode selection buttons (Pan, Select, Draw)
 * for the annotation editor toolbar. It visually indicates the active mode and handles the logic
 * for switching between them.
 *
 * @param {ToolbarModeButtonsProps} props The props for the component.
 * @returns A React component representing the mode buttons section.
 */
export const ToolbarModeButtons = memo(function ToolbarModeButtons({
  isPanActive,
  isSelectActive,
  isDrawActive,
  isLocked,
  drawMode,
  onClearSelection,
  onSetDrawMode,
  onSetSelectMode,
}: ToolbarModeButtonsProps) {
  return (
    // The main container for the group of buttons, arranged vertically.
    <div className="flex flex-col gap-1">
      {/* Pan Mode Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            aria-label="Pan"
            onClick={() => {
              onClearSelection();
              onSetDrawMode(false);
              onSetSelectMode(false);
            }}
            className={cn(
              "h-8 w-8 cursor-pointer rounded-lg p-0 md:h-10 md:w-10",
              // Applies a distinct style when pan mode is active.
              isPanActive
                ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-600"
                : "text-white hover:bg-transparent hover:text-emerald-300"
            )}
          >
            <IoHandRightOutline className="!h-5.5 !w-5.5 md:!h-6 md:!w-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="font-inter">Pan</p>
        </TooltipContent>
      </Tooltip>

      {/* Select Mode Button */}
      <Tooltip open={isLocked ? false : undefined}>
        <TooltipTrigger asChild>
          <div className={isLocked ? "cursor-not-allowed" : ""}>
            <Button
              variant="ghost"
              aria-label="Select"
              disabled={isLocked}
              onClick={() => {
                onClearSelection();
                onSetDrawMode(false);
                onSetSelectMode(true);
              }}
              className={cn(
                "h-8 w-8 rounded-lg p-0 md:h-10 md:w-10",
                isLocked
                  ? "cursor-not-allowed text-white/30"
                  : isSelectActive
                    ? "cursor-pointer bg-emerald-100 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-600"
                    : "cursor-pointer text-white hover:bg-transparent hover:text-emerald-300"
              )}
            >
              <PiCursor className="!h-5 !w-5 md:!h-6 md:!w-6" />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="font-inter">Select</p>
        </TooltipContent>
      </Tooltip>

      {/* Draw Mode Button */}
      <Tooltip open={isLocked ? false : undefined}>
        <TooltipTrigger asChild>
          <div className={isLocked ? "cursor-not-allowed" : ""}>
            <Button
              variant="ghost"
              aria-label="Draw"
              disabled={isLocked}
              onClick={() => {
                onClearSelection();
                onSetSelectMode(false);
                onSetDrawMode(!drawMode);
              }}
              className={cn(
                "h-8 w-8 rounded-lg p-0 md:h-10 md:w-10",
                isLocked
                  ? "cursor-not-allowed text-white/30"
                  : isDrawActive
                    ? "cursor-pointer bg-emerald-100 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-600"
                    : "cursor-pointer text-white hover:bg-transparent hover:text-emerald-300"
              )}
            >
              <PiBoundingBox className="!h-5 !w-5 md:!h-6 md:!w-6" />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="font-inter">Draw</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
});

ToolbarModeButtons.displayName = "ToolbarModeButtons";
