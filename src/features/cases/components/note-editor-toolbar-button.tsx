"use client";

import * as React from "react";

import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the note editor toolbar button component.
 */
interface NoteEditorToolbarButtonProps {
  /** The content to be displayed inside the button, typically an icon. */
  children: React.ReactNode;
  /** The text to display in the tooltip on hover. */
  tooltip: string;
  /** A boolean indicating if the corresponding editor format is currently active, which controls the button's "pressed" state. */
  isActive: boolean;
  /** A callback function invoked when the button is clicked. */
  onClick: () => void;
  /** An optional boolean to disable the button, e.g., when the editor is in read-only mode. Defaults to `false`. */
  isDisabled?: boolean;
  /** The accessible label for the button, which is crucial for screen readers as the button content is an icon. */
  ariaLabel: string;
}

/**
 * A reusable, styled button component for the editor toolbar. It combines a `Toggle`
 * for its active state with a `Tooltip` for usability.
 */
export const NoteEditorToolbarButton = React.memo(
  ({
    children,
    tooltip,
    isActive,
    onClick,
    isDisabled = false,
    ariaLabel,
  }: NoteEditorToolbarButtonProps) => {
    return (
      // A wrapper div to correctly apply the 'cursor-not-allowed' style over the entire button area when disabled.
      <div className={cn(isDisabled && "cursor-not-allowed")}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Toggle
              size="sm"
              pressed={isActive}
              onPressedChange={onClick}
              disabled={isDisabled}
              aria-label={ariaLabel}
              // Complex conditional styling based on the button's state.
              className={cn(
                "cursor-pointer transition-all ease-in-out",
                // Default style when not active.
                !isActive && "text-slate-600",
                // Style for when the format is active.
                isActive && "border-2 border-green-600 bg-green-100 text-green-600",
                // Hover styles when the button is enabled.
                !isDisabled &&
                  "hover:border-2 hover:border-green-600 hover:bg-green-100 hover:text-green-600",
                // Disabled styles.
                isDisabled &&
                  "cursor-not-allowed hover:border-slate-200 hover:bg-transparent hover:text-slate-500"
              )}
            >
              {children}
            </Toggle>
          </TooltipTrigger>
          <TooltipContent className="font-inter">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }
);

NoteEditorToolbarButton.displayName = "NoteEditorToolbarButton";
