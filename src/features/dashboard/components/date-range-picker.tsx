"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { subDays } from "date-fns";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { DateRange } from "react-day-picker";
import { BsCalendar4Week } from "react-icons/bs";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDateRange } from "@/features/dashboard/utils/format-date-range";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/**
 * A custom wrapper around the Radix UI popover close primitive.
 */
function PopoverClose({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Close>) {
  return <PopoverPrimitive.Close {...props} />;
}

/**
 * A responsive and highly styled date range picker component. It uses a popover to display
 * a calendar for selecting a date range, with a different layout for mobile and desktop views.
 */
export const DateRangePicker = () => {
  // Sets the default date range to the last 30 days.
  const defaultTo = new Date();
  const defaultFrom = subDays(defaultTo, 30);

  // A custom hook to determine if the current view is mobile for responsive rendering.
  const isMobile = useIsMobile();

  // The core state for the component, storing the selected date range.
  const [date, setDate] = useState<DateRange | undefined>({
    from: defaultFrom,
    to: defaultTo,
  });

  /** Resets the selected date range to its undefined (empty) state. */
  const onReset = () => {
    setDate(undefined);
  };

  return (
    <Popover>
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
          defaultMonth={date?.from}
          selected={date}
          onSelect={setDate}
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
          <PopoverClose asChild>
            <Button
              className="font-inter w-1/2 cursor-pointer bg-rose-600 font-normal shadow-none transition-all duration-300 ease-in-out hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-200/50"
              onClick={onReset}
            >
              Reset
            </Button>
          </PopoverClose>
          <PopoverClose asChild>
            <Button
              className="font-inter w-1/2 cursor-pointer bg-emerald-500 font-normal shadow-none transition-all duration-300 ease-in-out hover:bg-emerald-400 hover:shadow-lg hover:shadow-emerald-200/50"
              // The apply button is disabled until a complete date range is selected.
              disabled={!date?.from || !date?.to}
            >
              Apply
            </Button>
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  );
};

DateRangePicker.displayName = "DateRangePicker";
