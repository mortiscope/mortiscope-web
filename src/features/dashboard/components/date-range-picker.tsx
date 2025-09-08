"use client";

import { ChevronDown } from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { BsCalendar4Week } from "react-icons/bs";
import { LuLoaderCircle } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateRange } from "@/features/dashboard/utils/format-date-range";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the date range picker component.
 */
interface DateRangePickerProps {
  /** The currently selected date range. */
  date: DateRange | undefined;
  /** A callback function to update the selected date range. */
  onDateChange: (range: DateRange | undefined) => void;
  /** A callback function to reset to all-time period. */
  onReset: () => void;
  /** Optional loading state to indicate data is being fetched. */
  isLoading?: boolean;
}

/**
 * A controlled, responsive date range picker component. It uses a popover to display
 * a calendar for selecting a date range, with a different layout for mobile and desktop views.
 * @param {DateRangePickerProps} props The props for the component.
 * @returns A React component representing the date range picker.
 */
export const DateRangePicker = memo(function DateRangePicker({
  date,
  onDateChange,
  onReset,
  isLoading = false,
}: DateRangePickerProps) {
  // A custom hook to determine if the current view is mobile for responsive rendering.
  const isMobile = useIsMobile();

  // State to control the popover open/close manually.
  const [isOpen, setIsOpen] = useState(false);

  // State to store the temporary date selection before applying.
  const [tempDate, setTempDate] = useState<DateRange | undefined>(date);

  // State to track which action is loading ('reset' | 'apply' | null).
  const [loadingAction, setLoadingAction] = useState<"reset" | "apply" | null>(null);

  /**
   * Sync tempDate with the date prop when the popover opens.
   */
  useEffect(() => {
    if (isOpen) {
      setTempDate(date);
    }
  }, [isOpen, date]);

  /**
   * Closes the popover when loading is complete with a minimum delay.
   * The delay ensures all widgets have time to fetch their data.
   */
  useEffect(() => {
    if (loadingAction && !isLoading) {
      // Add a minimum delay of 8 seconds to ensure all widgets have loaded their data
      const timer = setTimeout(() => {
        setIsOpen(false);
        setLoadingAction(null);
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [isLoading, loadingAction]);

  /**
   * Handles popover open/close changes.
   * Prevents closing when loading is in progress.
   */
  const handleOpenChange = useCallback(
    (open: boolean) => {
      // Prevent closing if loading is in progress
      if (!open && loadingAction !== null) {
        return;
      }
      setIsOpen(open);
    },
    [loadingAction]
  );

  /**
   * Handles the Apply button click.
   */
  const handleApply = useCallback(() => {
    if (tempDate?.from && tempDate?.to) {
      setLoadingAction("apply");
      onDateChange(tempDate);
    }
  }, [tempDate, onDateChange]);

  /**
   * Handles the Reset button click.
   * Resets to all-time period.
   */
  const handleReset = useCallback(() => {
    setLoadingAction("reset");
    onReset();
  }, [onReset]);

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "font-inter w-full cursor-pointer justify-center rounded-lg text-left font-normal shadow-none transition-all duration-300 ease-in-out md:w-auto md:justify-start",
            !date && "text-muted-foreground"
          )}
        >
          <BsCalendar4Week className="mr-2 h-4 w-4" />
          {/* Uses a utility function to display the selected date range in a user-friendly format. */}
          <span className="text-sm">{formatDateRange(date)}</span>
          <ChevronDown className="ml-2 size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto rounded-xl p-0 shadow-none"
        align={isMobile ? "center" : "end"}
      >
        <Calendar
          autoFocus
          mode="range"
          defaultMonth={tempDate?.from || date?.from}
          selected={tempDate}
          onSelect={setTempDate}
          // Renders one month on mobile and two months on desktop for a better layout.
          numberOfMonths={isMobile ? 1 : 2}
          // Disables selection of future dates.
          disabled={{ after: new Date() }}
          className="font-inter rounded-xl shadow-none"
          buttonVariant="outline"
          classNames={{
            range_start: "!rounded-l-full bg-emerald-100 text-emerald-900",
            range_end: "!rounded-r-full bg-emerald-100 text-emerald-900",
            range_middle: "!rounded-lg bg-emerald-100 text-emerald-900",
            day_selected:
              "bg-emerald-100 text-emerald-900 hover:bg-emerald-100 hover:text-emerald-900 focus:bg-emerald-100 focus:text-emerald-900",
          }}
        />
        {/* The footer section of the popover, containing the action buttons. */}
        <div className="flex w-full items-center gap-x-2 px-4 pb-4">
          <div className={loadingAction !== null ? "w-1/2 cursor-not-allowed" : "w-1/2"}>
            <Button
              className="font-inter w-full cursor-pointer bg-rose-600 font-normal shadow-none transition-all duration-300 ease-in-out hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-200/50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleReset}
              disabled={loadingAction !== null}
            >
              {loadingAction === "reset" ? (
                <span className="flex items-center gap-2">
                  <LuLoaderCircle className="h-4 w-4 animate-spin" />
                  Reset
                </span>
              ) : (
                "Reset"
              )}
            </Button>
          </div>
          <div
            className={
              loadingAction !== null || !tempDate?.from || !tempDate?.to
                ? "w-1/2 cursor-not-allowed"
                : "w-1/2"
            }
          >
            <Button
              className="font-inter w-full cursor-pointer bg-emerald-500 font-normal shadow-none transition-all duration-300 ease-in-out hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-200/50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleApply}
              // The apply button is disabled until a complete date range is selected or when loading.
              disabled={!tempDate?.from || !tempDate?.to || loadingAction !== null}
            >
              {loadingAction === "apply" ? (
                <span className="flex items-center gap-2">
                  <LuLoaderCircle className="h-4 w-4 animate-spin" />
                  Apply
                </span>
              ) : (
                "Apply"
              )}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

DateRangePicker.displayName = "DateRangePicker";
