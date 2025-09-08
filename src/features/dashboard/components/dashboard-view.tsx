"use client";

import { subMonths, subWeeks, subYears } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";

import { getDashboardMetrics } from "@/features/dashboard/actions/get-dashboard-metrics";
import { DashboardAnalysis } from "@/features/dashboard/components/dashboard-analysis";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DashboardMetricsGrid } from "@/features/dashboard/components/dashboard-metrics-grid";
import type { CaseData } from "@/features/dashboard/components/dashboard-table-columns";

/**
 * Type definition for time period values.
 */
type TimePeriodValue = "all-time" | "past-year" | "past-month" | "past-week" | "custom";

/**
 * Defines the props for the dashboard view component.
 */
interface DashboardViewProps {
  /** The first name of the user, used for a personalized greeting. */
  firstName: string;
  /** The oldest case date from the case data, used for the "all-time" filter option. */
  oldestCaseDate?: string;
  /** The list of cases to display. */
  caseData: CaseData[];
  /** Initial metrics data fetched on the server. */
  initialData: Awaited<ReturnType<typeof getDashboardMetrics>>;
}

/**
 * A client component that orchestrates the entire dashboard view.
 * Manages the date range state and passes it to all child components for filtering.
 * @param {DashboardViewProps} props The props for the component.
 * @returns A React component representing the dashboard view.
 */
export function DashboardView({
  firstName,
  oldestCaseDate,
  caseData,
  initialData,
}: DashboardViewProps) {
  /**
   * Memoized today's date to prevent unnecessary recalculations.
   */
  const today = useMemo(() => new Date(), []);

  /**
   * Memoized oldest date to prevent unnecessary recalculations.
   */
  const oldestDate = useMemo(
    () => (oldestCaseDate ? new Date(oldestCaseDate) : subYears(today, 1)),
    [oldestCaseDate, today]
  );

  // State for the selected time period, defaulting to all-time.
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriodValue>("all-time");

  // State for the selected date range, defaulting to all-time range.
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: oldestDate,
    to: today,
  });

  // State to track if data is being loaded.
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Calculates the date range based on the selected time period.
   * @param period The selected time period value.
   * @returns The calculated date range.
   */
  const calculateDateRange = useCallback(
    (period: TimePeriodValue): DateRange => {
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
    },
    [oldestDate]
  );

  /**
   * Handles changes to the selected time period and updates the date range accordingly.
   * @param period The newly selected time period value.
   */
  const handlePeriodChange = useCallback(
    (period: TimePeriodValue) => {
      setSelectedPeriod(period);
      const newDateRange = calculateDateRange(period);
      setDateRange(newDateRange);
    },
    [calculateDateRange]
  );

  /**
   * Handles manual changes to the date range from the date range picker.
   * @param range The newly selected date range.
   */
  const handleDateChange = useCallback((range: DateRange | undefined) => {
    setDateRange(range);
    setSelectedPeriod("custom");
  }, []);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      {/* Renders the header component with date filtering controls. */}
      <DashboardHeader
        firstName={firstName}
        oldestCaseDate={oldestCaseDate}
        selectedPeriod={selectedPeriod}
        dateRange={dateRange}
        onPeriodChange={handlePeriodChange}
        onDateChange={handleDateChange}
        isLoading={isLoading}
      />
      {/* Renders the main metrics grid with date filtering. */}
      <DashboardMetricsGrid
        initialData={initialData}
        dateRange={dateRange}
        onLoadingChange={setIsLoading}
      />
      {/* Renders the analytics widgets grid and table with date filtering. */}
      <DashboardAnalysis caseData={caseData} dateRange={dateRange} />
    </div>
  );
}

DashboardView.displayName = "DashboardView";
