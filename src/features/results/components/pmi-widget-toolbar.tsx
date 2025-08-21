import { AnimatePresence, motion } from "framer-motion";
import React, { memo, useEffect, useState } from "react";
import { FaRegHourglass } from "react-icons/fa6";
import { IoInformation } from "react-icons/io5";
import { LuCalendarRange, LuClock } from "react-icons/lu";
import { PiWarning } from "react-icons/pi";

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
 * A configuration array that defines the available time units for PMI display.
 * This approach centralizes the options, making them easy to manage and map over in the UI.
 */
const timeUnitOptions = [
  { value: "Minutes", icon: LuClock, label: "Minutes" },
  { value: "Hours", icon: FaRegHourglass, label: "Hours" },
  { value: "Days", icon: LuCalendarRange, label: "Days" },
] as const;

/**
 * Exports a TypeScript type representing the valid time unit values, derived from the configuration array.
 */
export type TimeUnit = (typeof timeUnitOptions)[number]["value"];

/**
 * Defines the props for the PmiWidgetToolbar component.
 */
interface PmiWidgetToolbarProps {
  /** The currently selected time unit for display. */
  selectedUnit: TimeUnit;
  /** A callback function to handle the selection of a new time unit. */
  onUnitSelect: (unit: TimeUnit) => void;
  /** A callback function to open the information panel. */
  onInfoClick: () => void;
  /** A boolean indicating if a PMI estimation is currently available to display. */
  hasEstimation: boolean;
  /** A boolean that determines if the information button should be enabled. */
  isInfoButtonEnabled: boolean;
  /** A boolean to indicate if the current estimation is outdated and needs recalculation. */
  isRecalculationNeeded: boolean;
}

/**
 * A memoized component that renders the toolbar for the PMI widget. It includes controls
 * for changing the time unit, viewing information, and displays a warning when the
 * estimation is outdated.
 */
export const PmiWidgetToolbar = memo(
  ({
    selectedUnit,
    onUnitSelect,
    onInfoClick,
    hasEstimation,
    isInfoButtonEnabled,
    isRecalculationNeeded,
  }: PmiWidgetToolbarProps) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    // Dynamically selects the appropriate icon for the time unit dropdown trigger.
    const SelectedTimeUnitIcon =
      timeUnitOptions.find((o) => o.value === selectedUnit)?.icon ?? FaRegHourglass;

    if (!isMounted) {
      return (
        <div className="flex items-center">
          {isRecalculationNeeded && (
            <div className="mr-2 size-8 rounded-md border-2 border-amber-300 bg-amber-50 md:size-9" />
          )}
          <div className="size-8 rounded-none rounded-l-md border-2 border-slate-200 bg-slate-100 md:size-9" />
          <div className="-ml-[2px] size-8 rounded-none rounded-r-md border-2 border-slate-200 bg-slate-100 md:size-9" />
        </div>
      );
    }

    return (
      <div className="flex items-center">
        {/* Manages the smooth entry and exit of the warning icon. */}
        <AnimatePresence>
          {isRecalculationNeeded && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <Tooltip key="warning-tooltip">
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    aria-label="PMI estimation outdated"
                    className="relative mr-2 size-8 cursor-pointer rounded-md border-2 border-amber-300 bg-amber-50 text-amber-400 transition-all duration-300 ease-in-out hover:border-amber-400 hover:bg-amber-100 hover:text-amber-500 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9"
                  >
                    <PiWarning className="size-4 md:size-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-inter">PMI estimation outdated</p>
                </TooltipContent>
              </Tooltip>
            </motion.div>
          )}
        </AnimatePresence>
        {/* The time unit selection dropdown menu. */}
        <Tooltip key="time-unit-tooltip">
          <DropdownMenu key="time-unit-dropdown">
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label="Adjust time unit"
                  disabled={!hasEstimation}
                  className={cn(
                    "relative size-8 rounded-none rounded-l-md border-2 border-slate-200 bg-slate-100 text-slate-500 transition-all duration-300 ease-in-out focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9",
                    hasEstimation &&
                      "cursor-pointer hover:z-10 hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500",
                    !hasEstimation && "cursor-not-allowed opacity-50"
                  )}
                >
                  <SelectedTimeUnitIcon className="size-4 md:size-5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-inter">Adjust time unit</p>
            </TooltipContent>
            <DropdownMenuContent
              align="end"
              onCloseAutoFocus={(e) => e.preventDefault()}
              className="w-40 border-2 border-slate-200"
            >
              {/* Maps over the configuration array to render the dropdown options. */}
              {timeUnitOptions.map((option, index) => {
                const isActive = selectedUnit === option.value;
                const prevOption = timeUnitOptions[index - 1];
                const isPrevActive = prevOption?.value === selectedUnit;

                return (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => onUnitSelect(option.value)}
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
        {/* The information button. */}
        <Tooltip key="pmi-info-tooltip">
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              aria-label="Information"
              onClick={onInfoClick}
              disabled={!isInfoButtonEnabled}
              className={cn(
                "relative -ml-[2px] size-8 rounded-none rounded-r-md border-2 border-slate-200 bg-slate-100 text-slate-500 transition-all duration-300 ease-in-out focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9",
                isInfoButtonEnabled &&
                  "cursor-pointer hover:z-10 hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500",
                !isInfoButtonEnabled && "cursor-not-allowed opacity-50"
              )}
            >
              <IoInformation className="size-4 md:size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-inter">Information</p>
          </TooltipContent>
        </Tooltip>
      </div>
    );
  }
);

PmiWidgetToolbar.displayName = "PmiWidgetToolbar";
