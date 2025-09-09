"use client";

import { subMonths, subWeeks, subYears } from "date-fns";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DateRange } from "react-day-picker";

import { getDashboardMetrics } from "@/features/dashboard/actions/get-dashboard-metrics";
import { DashboardAnalysis } from "@/features/dashboard/components/dashboard-analysis";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DashboardMetricsGrid } from "@/features/dashboard/components/dashboard-metrics-grid";
import type { CaseData } from "@/features/dashboard/schemas/dashboard";
import { buildDateRangeParams, validateDateRange } from "@/features/dashboard/utils/date-url-sync";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasCheckedInvalidDates = useRef(false);

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

  /**
   * Read and validate date range from URL parameters on initial render.
   */
  const urlDateRange = useMemo(() => {
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    return validateDateRange(startParam, endParam);
  }, [searchParams]);

  /**
   * Clear invalid date parameters from URL on mount.
   */
  useEffect(() => {
    // Only check once on mount to avoid infinite loops
    if (hasCheckedInvalidDates.current) return;

    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    // If params exist but validation fails, clear the URL
    if ((startParam || endParam) && !urlDateRange) {
      router.replace(pathname as never);
    }

    hasCheckedInvalidDates.current = true;
  }, [pathname, router, searchParams, urlDateRange]);

  // State for the selected time period, defaulting based on URL params.
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriodValue>(
    urlDateRange ? "custom" : "all-time"
  );

  // State for the selected date range, defaulting based on URL params or all-time.
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    urlDateRange || {
      from: oldestDate,
      to: today,
    }
  );

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

      // Clear URL parameters for preset periods.
      if (period !== "custom") {
        router.replace(pathname as never);
      }
    },
    [calculateDateRange, pathname, router]
  );

  /**
   * Handles manual changes to the date range from the date range picker.
   * @param range The newly selected date range.
   */
  const handleDateChange = useCallback(
    (range: DateRange | undefined) => {
      setDateRange(range);
      setSelectedPeriod("custom");

      // Update URL with custom date range
      if (range?.from && range?.to) {
        const params = buildDateRangeParams(range.from, range.to);
        router.replace(`${pathname}?${params.toString()}` as never);
      }
    },
    [pathname, router]
  );

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
      <DashboardAnalysis initialCaseData={caseData} dateRange={dateRange} />
    </div>
  );
}

DashboardView.displayName = "DashboardView";
