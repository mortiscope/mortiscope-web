"use client";

import { DateRange } from "react-day-picker";

import { TooltipProvider } from "@/components/ui/tooltip";
import type { CaseData } from "@/features/dashboard/components/dashboard-table-columns";
import { DashboardTableContainer } from "@/features/dashboard/components/dashboard-table-container";
import { ForensicInsightsWidget } from "@/features/dashboard/components/forensic-insights-widget";
import { QualityMetricsWidget } from "@/features/dashboard/components/quality-metrics-widget";
import { VerificationStatusWidget } from "@/features/dashboard/components/verification-status-widget";

interface DashboardAnalysisProps {
  caseData: CaseData[];
  dateRange: DateRange | undefined;
}

/**
 * A container component that orchestrates and lays out the main widgets for the
 * dashboard's analysis section. Passes the date range to all child components for filtering.
 *
 * @returns A React component representing the dashboard analysis layout.
 */
export const DashboardAnalysis = ({ caseData, dateRange }: DashboardAnalysisProps) => {
  return (
    // Wraps all widgets in a single tooltip provider to enable tooltips within them.
    <TooltipProvider delayDuration={300} skipDelayDuration={100}>
      <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2 lg:grid-cols-6 lg:grid-rows-2">
        {/* Each of these is a smart widget component that fetches and displays its own data. */}
        <ForensicInsightsWidget dateRange={dateRange} />
        <VerificationStatusWidget dateRange={dateRange} />
        <QualityMetricsWidget dateRange={dateRange} />
      </div>
      {/* Only render the table container if there is case data available. */}
      {caseData.length > 0 && (
        <div className="min-w-0">
          <DashboardTableContainer data={caseData} dateRange={dateRange} />
        </div>
      )}
    </TooltipProvider>
  );
};

DashboardAnalysis.displayName = "DashboardAnalysis";
