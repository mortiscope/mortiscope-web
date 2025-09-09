"use client";

import dynamic from "next/dynamic";
import { DateRange } from "react-day-picker";

import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCaseDataPoller } from "@/features/dashboard/hooks/use-case-data-poller";
import type { CaseData } from "@/features/dashboard/schemas/dashboard";

/**
 * Loading component for the forensic insights widget.
 */
const ForensicInsightsLoader = () => (
  <Skeleton className="col-span-1 h-64 rounded-3xl bg-white md:col-span-2 md:h-96 lg:col-span-4 lg:row-span-2 lg:h-auto" />
);

/**
 * Loading component for the verification status widget.
 */
const VerificationStatusLoader = () => (
  <Skeleton className="col-span-1 h-64 rounded-3xl bg-white lg:col-span-2" />
);

/**
 * Loading component for the quality metrics widget.
 */
const QualityMetricsLoader = () => (
  <Skeleton className="col-span-1 h-64 rounded-3xl bg-white lg:col-span-2" />
);

/**
 * Loading component for the dashboard table container.
 */
const DashboardTableLoader = () => (
  <Skeleton className="h-96 w-full rounded-3xl bg-white p-4 md:p-8" />
);

/**
 * Dynamically loads the forensic insights widget component on the client-side.
 */
const ForensicInsightsWidget = dynamic(
  () =>
    import("@/features/dashboard/components/forensic-insights-widget").then(
      (module) => module.ForensicInsightsWidget
    ),
  {
    loading: () => <ForensicInsightsLoader />,
    ssr: false,
  }
);

/**
 * Dynamically loads the verification status widget component on the client-side.
 */
const VerificationStatusWidget = dynamic(
  () =>
    import("@/features/dashboard/components/verification-status-widget").then(
      (module) => module.VerificationStatusWidget
    ),
  {
    loading: () => <VerificationStatusLoader />,
    ssr: false,
  }
);

/**
 * Dynamically loads the quality metrics widget component on the client-side.
 */
const QualityMetricsWidget = dynamic(
  () =>
    import("@/features/dashboard/components/quality-metrics-widget").then(
      (module) => module.QualityMetricsWidget
    ),
  {
    loading: () => <QualityMetricsLoader />,
    ssr: false,
  }
);

/**
 * Dynamically loads the dashboard table container component on the client-side.
 */
const DashboardTableContainer = dynamic(
  () =>
    import("@/features/dashboard/components/dashboard-table-container").then(
      (module) => module.DashboardTableContainer
    ),
  {
    loading: () => <DashboardTableLoader />,
    ssr: false,
  }
);

interface DashboardAnalysisProps {
  initialCaseData: CaseData[];
  dateRange: DateRange | undefined;
}

/**
 * A container component that orchestrates and lays out the main widgets for the
 * dashboard's analysis section. Uses React Query to poll for case data updates
 * and passes the date range to all child components for filtering.
 *
 * @returns A React component representing the dashboard analysis layout.
 */
export const DashboardAnalysis = ({ initialCaseData, dateRange }: DashboardAnalysisProps) => {
  // Use React Query to poll for case data updates every 10 seconds
  const { data: caseData } = useCaseDataPoller(initialCaseData, dateRange);

  return (
    // Wraps all widgets in a single tooltip provider to enable tooltips within them.
    <TooltipProvider delayDuration={300} skipDelayDuration={100}>
      <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2 lg:grid-cols-6 lg:grid-rows-2">
        {/* Each of these is a smart widget component that fetches and displays its own data. */}
        <ForensicInsightsWidget dateRange={dateRange} />
        <VerificationStatusWidget dateRange={dateRange} />
        <QualityMetricsWidget dateRange={dateRange} />
      </div>
      {/* Render the table container, which handles empty state internally. */}
      <div className="min-w-0">
        <DashboardTableContainer data={caseData} dateRange={dateRange} />
      </div>
    </TooltipProvider>
  );
};

DashboardAnalysis.displayName = "DashboardAnalysis";
