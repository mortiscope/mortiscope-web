"use client";

import { memo } from "react";
import { LuClock3, LuClock6, LuClock9, LuClock12 } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Defines the available time period filter options.
 */
const TIME_PERIOD_OPTIONS = [
  { value: "all-time", label: "All-time", icon: LuClock12 },
  { value: "past-year", label: "Past Year", icon: LuClock3 },
  { value: "past-month", label: "Past Month", icon: LuClock6 },
  { value: "past-week", label: "Past Week", icon: LuClock9 },
] as const;

/**
 * Type definition for time period values.
 */
type TimePeriodValue = (typeof TIME_PERIOD_OPTIONS)[number]["value"];

/**
 * Defines the props for the time period filter component.
 */
interface TimePeriodFilterProps {
  /** The currently selected time period value. */
  selectedPeriod: TimePeriodValue;
  /** A callback function to update the selected time period. */
  onPeriodChange: (period: TimePeriodValue) => void;
}

/**
 * A controlled dropdown component for filtering data by time period.
 * @param {TimePeriodFilterProps} props The props for the component.
 * @returns A React component representing the time period filter.
 */
export const TimePeriodFilter = memo(function TimePeriodFilter({
  selectedPeriod,
  onPeriodChange,
}: TimePeriodFilterProps) {
  // A custom hook to determine if the current view is mobile for responsive dropdown alignment.
  const isMobile = useIsMobile();

  // Find the current selected option.
  const currentOption = TIME_PERIOD_OPTIONS.find((option) => option.value === selectedPeriod);
  const CurrentIcon = currentOption?.icon ?? LuClock12;
  const currentLabel = currentOption?.label ?? "All-time";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          aria-label="Time period filter"
          className="font-inter cursor-pointer rounded-lg text-left font-normal shadow-none transition-all duration-300 ease-in-out focus-visible:ring-0 focus-visible:ring-offset-0 sm:gap-2"
        >
          <CurrentIcon className="h-4 w-4 shrink-0 text-slate-600" />
          <span className="font-inter hidden text-sm font-normal text-slate-800 sm:inline">
            {currentLabel}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-36 border-2 border-slate-200"
        align={isMobile ? "start" : "end"}
      >
        {TIME_PERIOD_OPTIONS.map((option, index) => {
          const isActive = option.value === selectedPeriod;
          const prevOption = TIME_PERIOD_OPTIONS[index - 1];
          const isPrevActive = prevOption?.value === selectedPeriod;
          const OptionIcon = option.icon;

          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => onPeriodChange(option.value)}
              className={cn(
                "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 hover:[&_svg]:!text-emerald-600",
                index > 0 && "mt-0.5",
                isActive &&
                  "border-emerald-200 bg-emerald-50 text-emerald-700 [&_svg]:text-emerald-600",
                isActive && index > 0 && !isPrevActive && "mt-1",
                !isActive && isPrevActive && "mt-1"
              )}
            >
              <OptionIcon className="h-4 w-4 text-slate-600" />
              {option.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

TimePeriodFilter.displayName = "TimePeriodFilter";
