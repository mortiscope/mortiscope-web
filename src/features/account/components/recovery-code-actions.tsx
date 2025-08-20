"use client";

import { memo } from "react";
import { HiArrowPath } from "react-icons/hi2";
import { ImSpinner2 } from "react-icons/im";
import { IoCopyOutline } from "react-icons/io5";
import { LuDownload } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Props for the recovery code actions component.
 */
interface RecoveryCodeActionsProps {
  /** Whether copy action is available */
  canCopy: boolean;
  /** Whether download action is available */
  canDownload: boolean;
  /** Whether regenerate action is loading */
  isLoading: boolean;
  /** Handler for copy action */
  onCopy: () => void;
  /** Handler for download action */
  onDownload: () => void;
  /** Handler for regenerate action */
  onRegenerate: () => void;
}

/**
 * A component that renders the action buttons for recovery codes:
 * Copy, Download, and Regenerate with proper tooltips and states.
 */
export const RecoveryCodeActions = memo(
  ({
    canCopy,
    canDownload,
    isLoading,
    onCopy,
    onDownload,
    onRegenerate,
  }: RecoveryCodeActionsProps) => {
    return (
      <div className="mt-6 grid grid-cols-3 gap-3">
        {/* Copy Button */}
        <div className={cn({ "cursor-not-allowed": !canCopy })}>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "font-inter flex h-10 w-full items-center justify-center gap-2 border-2 border-slate-200 font-normal shadow-none transition-all duration-300 ease-in-out",
                    canCopy
                      ? "cursor-pointer text-slate-600 hover:border-emerald-600 hover:bg-emerald-100 hover:text-emerald-600"
                      : "cursor-not-allowed text-slate-400 opacity-50"
                  )}
                  onClick={onCopy}
                  disabled={!canCopy}
                >
                  <IoCopyOutline className="h-4 w-4" />
                  <span className="hidden sm:inline">Copy</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="font-inter sm:hidden">
                <p>{canCopy ? "Copy" : "No codes to copy"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Download Button */}
        <div className={cn({ "cursor-not-allowed": !canDownload })}>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "font-inter flex h-10 w-full items-center justify-center gap-2 border-2 border-slate-200 font-normal shadow-none transition-all duration-300 ease-in-out",
                    canDownload
                      ? "cursor-pointer text-slate-600 hover:border-emerald-600 hover:bg-emerald-100 hover:text-emerald-600"
                      : "cursor-not-allowed text-slate-400 opacity-50"
                  )}
                  onClick={onDownload}
                  disabled={!canDownload}
                >
                  <LuDownload className="h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="font-inter sm:hidden">
                <p>{canDownload ? "Download" : "No codes to download"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Regenerate Button */}
        <div className={cn({ "cursor-not-allowed": isLoading })}>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 border-2 border-slate-200 font-normal text-slate-600 shadow-none transition-all duration-300 ease-in-out hover:border-emerald-600 hover:bg-emerald-100 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={onRegenerate}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ImSpinner2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <HiArrowPath className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">
                    {isLoading ? "Generating..." : "Regenerate"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="font-inter sm:hidden">
                <p>Regenerate</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    );
  }
);

RecoveryCodeActions.displayName = "RecoveryCodeActions";
