import { HiMiniArrowPath } from "react-icons/hi2";
import { IoArrowRedoOutline, IoArrowUndoOutline } from "react-icons/io5";
import { IoHandRightOutline } from "react-icons/io5";
import { LuFocus, LuZoomIn, LuZoomOut } from "react-icons/lu";
import { PiBoundingBox, PiCheckSquare, PiCursor, PiEye } from "react-icons/pi";
import { TbRotate } from "react-icons/tb";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the editor toolbar component.
 */
type EditorToolbarProps = {
  /** A boolean indicating if any details panel is currently open. */
  hasOpenPanel: boolean;
};

/**
 * A presentational component that renders a floating vertical toolbar with controls for the annotation
 * editor. It includes tools for panning, selecting, drawing, view manipulation, and history.
 *
 * @param {EditorToolbarProps} props The props for the component.
 * @returns A React component representing the floating toolbar.
 */
export function EditorToolbar({ hasOpenPanel }: EditorToolbarProps) {
  return (
    // The main container for the toolbar
    <div
      className={cn(
        "fixed top-[calc(50%+2.5rem)] right-2 z-50 flex -translate-y-1/2 flex-col gap-1 rounded-lg bg-emerald-800/80 p-2 shadow-lg backdrop-blur-sm transition-opacity duration-300 md:right-4 md:gap-2 md:rounded-xl md:opacity-100",
        hasOpenPanel && "opacity-0 md:opacity-100"
      )}
    >
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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              aria-label="Hide annotations"
              className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
            >
              <PiEye className="!h-5 !w-5 md:!h-6 md:!w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Hide annotations</p>
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
              aria-label="Enable minimap"
              className="h-8 w-8 cursor-pointer rounded-lg p-0 text-white transition-colors duration-600 ease-in-out hover:bg-transparent hover:text-emerald-300 md:h-10 md:w-10"
            >
              <PiCheckSquare className="!h-5 !w-5 md:!h-6 md:!w-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p className="font-inter">Enable minimap</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
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
