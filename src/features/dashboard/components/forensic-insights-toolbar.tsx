import React, { memo, useEffect, useState } from "react";
import { IoHourglassOutline } from "react-icons/io5";
import { PiCirclesThree, PiRecycle } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * A shared class string for consistent styling of the dropdown menu items.
 */
const dropdownItemStyle =
  "font-inter cursor-pointer border-2 border-transparent text-sm text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 [&_svg]:text-slate-800 hover:[&_svg]:!text-emerald-600";

/**
 * A configuration array that defines the available views for the forensic insights widget.
 */
const viewOptions = [
  { value: "life-stage", icon: PiRecycle, label: "Life Stage Distribution" },
  { value: "pmi", icon: IoHourglassOutline, label: "PMI Distribution" },
  { value: "sampling", icon: PiCirclesThree, label: "Sampling Density" },
] as const;

/**
 * Exports a TypeScript type representing the valid view options, derived from the configuration array.
 */
export type ForensicView = (typeof viewOptions)[number]["value"];

/**
 * Defines the props for the forensic insights toolbar component.
 */
interface ForensicInsightsToolbarProps {
  /** The currently selected view. */
  selectedView: ForensicView;
  /** A callback function to handle the selection of a new view. */
  onViewSelect: (view: ForensicView) => void;
}

/**
 * A memoized component that renders the toolbar for the forensic insights widget.
 */
export const ForensicInsightsToolbar = memo(
  ({ selectedView, onViewSelect }: ForensicInsightsToolbarProps) => {
    // State to ensure the component is only rendered on the client, preventing hydration mismatches.
    const [isMounted, setIsMounted] = useState(false);

    // A side effect to set `isMounted` to true only after the initial render on the client.
    useEffect(() => {
      setIsMounted(true);
    }, []);

    // Dynamically selects the appropriate icon for the dropdown trigger based on the selected view.
    const SelectedViewIcon = viewOptions.find((o) => o.value === selectedView)?.icon ?? PiRecycle;

    // Renders a skeleton placeholder before the component has mounted on the client.
    if (!isMounted) {
      return (
        <div className="flex items-center">
          <div className="size-8 rounded-md border-2 border-slate-200 bg-slate-100 md:size-9" />
        </div>
      );
    }

    return (
      <div className="ml-2 flex items-center">
        <Tooltip key="view-tooltip">
          <DropdownMenu key="view-dropdown">
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label="Change view"
                  className={cn(
                    "relative size-8 rounded-md border-2 border-slate-200 bg-slate-100 text-slate-500 transition-all duration-300 ease-in-out focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9",
                    "cursor-pointer hover:z-10 hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500"
                  )}
                >
                  <SelectedViewIcon className="size-4 md:size-5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-inter">Change view</p>
            </TooltipContent>
            <DropdownMenuContent
              align="end"
              onCloseAutoFocus={(e) => e.preventDefault()}
              className="w-auto border-2 border-slate-200"
            >
              {/* Maps over the configuration array to render the dropdown options. */}
              {viewOptions.map((option, index) => {
                const isActive = selectedView === option.value;
                const prevOption = viewOptions[index - 1];
                const isPrevActive = prevOption?.value === selectedView;

                return (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => onViewSelect(option.value)}
                    className={cn(
                      dropdownItemStyle,
                      index > 0 && "mt-0.5",
                      isActive &&
                        "border-emerald-200 bg-emerald-50 text-emerald-700 [&_svg]:text-emerald-600",
                      isActive && index > 0 && !isPrevActive && "mt-1",
                      !isActive && isPrevActive && "mt-1"
                    )}
                  >
                    <option.icon className="mr-2 h-4 w-4" />
                    <span>{option.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </Tooltip>
      </div>
    );
  }
);

ForensicInsightsToolbar.displayName = "ForensicInsightsToolbar";
