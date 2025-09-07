"use client";

import { subMonths, subWeeks, subYears } from "date-fns";
import { useState } from "react";
import { DateRange } from "react-day-picker";

import { DateRangePicker } from "@/features/dashboard/components/date-range-picker";
import { TimePeriodFilter } from "@/features/dashboard/components/time-period-filter";

/**
 * Type definition for time period values.
 */
type TimePeriodValue = "all-time" | "past-year" | "past-month" | "past-week";

/**
 * Defines the props for the dashboard header component.
 */
interface DashboardHeaderProps {
  /** The first name of the logged-in user, used to display a personalized greeting. */
  firstName: string;
  /** The oldest case date from the case data, used for the "all-time" filter option. */
  oldestCaseDate?: string;
}

/**
 * A client component that renders the main header for the dashboard and manages
 * the state for the time period filter and date range picker.
 * @param {DashboardHeaderProps} props The props for the component.
 * @returns A React component representing the dashboard header.
 */
export function DashboardHeader({ firstName, oldestCaseDate }: DashboardHeaderProps) {
  // Calculate the initial date range based on the "all-time" period.
  const today = new Date();
  const oldestDate = oldestCaseDate ? new Date(oldestCaseDate) : subYears(today, 1);

  // State for the selected time period, defaulting to "all-time".
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriodValue>("all-time");

  // State for the selected date range, defaulting to all-time range.
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: oldestDate,
    to: today,
  });

  /**
   * Calculates the date range based on the selected time period.
   * @param period The selected time period value.
   * @returns The calculated date range.
   */
  const calculateDateRange = (period: TimePeriodValue): DateRange => {
    const currentDate = new Date();

    switch (period) {
      case "all-time":
        return { from: oldestDate, to: currentDate };
      case "past-year":
        return { from: subYears(currentDate, 1), to: currentDate };
      case "past-month":
        return { from: subMonths(currentDate, 1), to: currentDate };
      case "past-week":
        return { from: subWeeks(currentDate, 1), to: currentDate };
      default:
        return { from: subMonths(currentDate, 1), to: currentDate };
    }
  };

  /**
   * Handles changes to the selected time period and updates the date range accordingly.
   * @param period The newly selected time period value.
   */
  const handlePeriodChange = (period: TimePeriodValue) => {
    setSelectedPeriod(period);
    const newDateRange = calculateDateRange(period);
    setDateRange(newDateRange);
  };

  /**
   * Handles manual changes to the date range from the date range picker.
   * @param range The newly selected date range.
   */
  const handleDateChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };

  return (
    // The main container uses a responsive flexbox layout.
    <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between">
      {/* The container for the welcome message. */}
      <div className="min-w-0 flex-1">
        <h1 className="font-plus-jakarta-sans grid grid-cols-[auto_minmax(0,1fr)] justify-center gap-1 py-0.5 text-2xl leading-normal font-medium tracking-tight text-slate-800 md:justify-start md:text-3xl lg:text-4xl">
          <span>Welcome,</span>
          <span className="truncate">{firstName}!</span>
        </h1>
      </div>
      {/* The container for the time period filter and date range picker. */}
      <div className="flex w-full flex-shrink-0 items-center gap-2 md:w-auto">
        <div className="w-auto">
          <TimePeriodFilter selectedPeriod={selectedPeriod} onPeriodChange={handlePeriodChange} />
        </div>
        <div className="flex-1 md:w-auto md:flex-none">
          <DateRangePicker date={dateRange} onDateChange={handleDateChange} />
        </div>
      </div>
    </div>
  );
}

DashboardHeader.displayName = "DashboardHeader";
