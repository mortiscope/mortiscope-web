import { memo } from "react";
import { HiMiniArrowPath } from "react-icons/hi2";
import { IoArrowRedoOutline, IoArrowUndoOutline } from "react-icons/io5";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the toolbar history buttons component.
 */
type ToolbarHistoryButtonsProps = {
  /** A boolean indicating if there is a previous state to "undo" to. */
  canUndo: boolean;
  /** A boolean indicating if there is a future state to "redo" to. */
  canRedo: boolean;
  /** A boolean indicating if there are any unsaved changes to be reset. */
  hasChanges: boolean;
  /** A boolean indicating if the editor is currently locked, which disables all history actions. */
  isLocked: boolean;
  /** A callback function to trigger the undo action. */
  onUndo: () => void;
  /** A callback function to trigger the redo action. */
  onRedo: () => void;
  /** A callback function to open the "reset changes" confirmation modal. */
  onResetChanges: () => void;
};

/**
 * A memoized presentational component that renders the history control buttons (Undo, Redo, Reset)
 * for the annotation editor toolbar. All state and logic are passed in via props, making it
 * fully controlled by its parent component or hook.
 *
 * @param {ToolbarHistoryButtonsProps} props The props for the component.
 * @returns A React component representing the history buttons section.
 */
export const ToolbarHistoryButtons = memo(function ToolbarHistoryButtons({
  canUndo,
  canRedo,
  hasChanges,
  isLocked,
  onUndo,
  onRedo,
  onResetChanges,
}: ToolbarHistoryButtonsProps) {
  return (
    // The main container for the group of buttons, arranged vertically.
    <div className="flex flex-col gap-1">
      {/* Redo Button */}
      <Tooltip open={!canRedo || isLocked ? false : undefined}>
        <TooltipTrigger asChild>
          <div className={isLocked || !canRedo ? "cursor-not-allowed" : ""}>
            <Button
              variant="ghost"
              onClick={onRedo}
              disabled={!canRedo || isLocked}
              aria-label="Redo change"
              className={cn(
                "h-8 w-8 rounded-lg p-0 transition-colors duration-600 ease-in-out md:h-10 md:w-10",
                // Applies conditional styling based on whether the button is enabled.
                canRedo && !isLocked
                  ? "cursor-pointer text-white hover:bg-transparent hover:text-emerald-300"
                  : "cursor-not-allowed text-white/30"
              )}
            >
              <IoArrowRedoOutline className="!h-5 !w-5 md:!h-6 md:!w-6" />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="font-inter">Redo change</p>
        </TooltipContent>
      </Tooltip>

      {/* Reset Changes Button */}
      <Tooltip open={!hasChanges || isLocked ? false : undefined}>
        <TooltipTrigger asChild>
          <div className={isLocked || !hasChanges ? "cursor-not-allowed" : ""}>
            <Button
              variant="ghost"
              onClick={onResetChanges}
              disabled={!hasChanges || isLocked}
              aria-label="Reset changes"
              className={cn(
                "h-8 w-8 rounded-lg p-0 transition-colors duration-600 ease-in-out md:h-10 md:w-10",
                hasChanges && !isLocked
                  ? "cursor-pointer text-white hover:bg-transparent hover:text-emerald-300"
                  : "cursor-not-allowed text-white/30"
              )}
            >
              <HiMiniArrowPath className="!h-5 !w-5 md:!h-6 md:!w-6" />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="font-inter">Reset changes</p>
        </TooltipContent>
      </Tooltip>

      {/* Undo Button */}
      <Tooltip open={!canUndo || isLocked ? false : undefined}>
        <TooltipTrigger asChild>
          <div className={isLocked || !canUndo ? "cursor-not-allowed" : ""}>
            <Button
              variant="ghost"
              onClick={onUndo}
              disabled={!canUndo || isLocked}
              aria-label="Undo change"
              className={cn(
                "h-8 w-8 rounded-lg p-0 transition-colors duration-600 ease-in-out md:h-10 md:w-10",
                canUndo && !isLocked
                  ? "cursor-pointer text-white hover:bg-transparent hover:text-emerald-300"
                  : "cursor-not-allowed text-white/30"
              )}
            >
              <IoArrowUndoOutline className="!h-5 !w-5 md:!h-6 md:!w-6" />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="font-inter">Undo change</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
});

ToolbarHistoryButtons.displayName = "ToolbarHistoryButtons";
