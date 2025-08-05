"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import {
  HistoryLogEmptyState,
  HistoryLogErrorState,
  HistoryLogLoadingState,
} from "@/features/cases/components/history-log-empty-state";
import { HistoryLogTimeline } from "@/features/cases/components/history-log-timeline";
import { useFormattedHistory } from "@/features/cases/hooks/use-formatted-history";
import { getCaseHistory } from "@/features/results/actions/get-case-history";

// A type alias for the data returned by our server action.
type CaseHistoryData = Awaited<ReturnType<typeof getCaseHistory>>;

interface CaseHistoryLogProps {
  isLoading: boolean;
  isError: boolean;
  data: CaseHistoryData | undefined;
}

/**
 * Renders the full, grouped, and formatted audit history for a case.
 */
export const CaseHistoryLog = ({ isLoading, isError, data }: CaseHistoryLogProps) => {
  const groupedData = useFormattedHistory(data);

  if (isLoading) {
    return <HistoryLogLoadingState />;
  }

  if (isError) {
    return <HistoryLogErrorState />;
  }

  if (!data || data.length === 0) {
    return <HistoryLogEmptyState />;
  }

  return (
    <TooltipProvider>
      <HistoryLogTimeline groupedData={groupedData} />
    </TooltipProvider>
  );
};

CaseHistoryLog.displayName = "CaseHistoryLog";
