"use client";

import { subMonths, subWeeks, subYears } from "date-fns";
import { useState } from "react";
import { DateRange } from "react-day-picker";

import { getDashboardMetrics } from "@/features/dashboard/actions/get-dashboard-metrics";
import { DashboardAnalysis } from "@/features/dashboard/components/dashboard-analysis";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DashboardMetricsGrid } from "@/features/dashboard/components/dashboard-metrics-grid";
import type { CaseData } from "@/features/dashboard/components/dashboard-table-columns";

/**
 * Type definition for time period values.
 */
type TimePeriodValue = "all-time" | "past-year" | "past-month" | "past-week";

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
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      {/* Renders the header component with date filtering controls. */}
      <DashboardHeader
        firstName={firstName}
        oldestCaseDate={oldestCaseDate}
        selectedPeriod={selectedPeriod}
        dateRange={dateRange}
        onPeriodChange={handlePeriodChange}
        onDateChange={handleDateChange}
      />
      {/* Renders the main metrics grid with date filtering. */}
      <DashboardMetricsGrid initialData={initialData} dateRange={dateRange} />
      {/* Renders the analytics widgets grid and table with date filtering. */}
      <DashboardAnalysis caseData={caseData} dateRange={dateRange} />
    </div>
  );
}

DashboardView.displayName = "DashboardView";
