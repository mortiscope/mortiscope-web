import { HiMiniArrowPath } from "react-icons/hi2";
import { IoArrowRedoOutline, IoArrowUndoOutline } from "react-icons/io5";
import { IoHandRightOutline } from "react-icons/io5";
import { LuFocus, LuZoomIn, LuZoomOut } from "react-icons/lu";
import { PiBoundingBox, PiCheckSquare, PiCursor, PiSquare } from "react-icons/pi";
import { TbRotate } from "react-icons/tb";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Defines the props for the editor toolbar component.
 */
type EditorToolbarProps = {
  /** A boolean indicating if any details panel is currently open. */
  hasOpenPanel: boolean;
  /** Optional callback to zoom in on the image. */
  onZoomIn?: () => void;
  /** Optional callback to zoom out on the image. */
  onZoomOut?: () => void;
  /** Optional callback to center the view on the image. */
  onCenterView?: () => void;
  /** Optional callback to reset the view to initial state. */
  onResetView?: () => void;
  /** A boolean indicating if the minimap is currently enabled. */
  isMinimapEnabled?: boolean;
  /** Optional callback to toggle the minimap visibility. */
  onToggleMinimap?: () => void;
};

/**
 * A presentational component that renders a floating vertical toolbar with controls for the annotation
 * editor. It includes tools for panning, selecting, drawing, view manipulation, and history.
 *
 * @param {EditorToolbarProps} props The props for the component.
 * @returns A React component representing the floating toolbar.
 */
export function EditorToolbar({
  onZoomIn,
  onZoomOut,
  onCenterView,
  onResetView,
  isMinimapEnabled = false,
  onToggleMinimap,
}: EditorToolbarProps) {
  return (
    // The main container for the toolbar
    <div className="fixed top-[calc(50%+2.5rem)] right-2 z-[5] flex -translate-y-1/2 flex-col gap-1 rounded-lg bg-emerald-800/80 p-2 shadow-lg backdrop-blur-sm md:right-4 md:z-50 md:gap-2 md:rounded-xl md:py-2.5">
      {/* Section 1: Primary tools */}
      <div className="flex flex-col gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              aria-label="Pan"
              className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
            >
              <IoHandRightOutline className="!h-5.5 !w-5.5 md:!h-6 md:!w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Pan</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              aria-label="Select"
              className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
            >
              <PiCursor className="!h-5 !w-5 md:!h-6 md:!w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Select</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              aria-label="Draw"
              className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
            >
              <PiBoundingBox className="!h-5 !w-5 md:!h-6 md:!w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Draw</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {/* A visual separator to group the toolbar buttons logically. */}
      <div className="-mx-2">
        <Separator className="bg-white/30" />
      </div>

      {/* Section 2: View and navigation tools */}
      <div className="flex flex-col gap-1">
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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={onToggleMinimap}
              aria-label={isMinimapEnabled ? "Disable minimap" : "Enable minimap"}
              className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
            >
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

      {/* A visual separator to group the toolbar buttons logically. */}
      <div className="-mx-2">
        <Separator className="bg-white/30" />
      </div>

      {/* Section 3: History and state management tools */}
      <div className="flex flex-col gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              aria-label="Redo change"
              className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
            >
              <IoArrowRedoOutline className="!h-5 !w-5 md:!h-6 md:!w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Redo change</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              aria-label="Reset changes"
              className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
            >
              <HiMiniArrowPath className="!h-5 !w-5 md:!h-6 md:!w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Reset changes</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              aria-label="Undo change"
              className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
            >
              <IoArrowUndoOutline className="!h-5 !w-5 md:!h-6 md:!w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Undo change</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

EditorToolbar.displayName = "EditorToolbar";
