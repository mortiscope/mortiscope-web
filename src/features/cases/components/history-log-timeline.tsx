import { format, isToday, isYesterday } from "date-fns";

import { HistoryLogTimelineEvent } from "@/features/cases/components/history-log-timeline-event";
import { getCaseHistory } from "@/features/results/actions/get-case-history";

// Type definitions
type CaseHistoryData = Awaited<ReturnType<typeof getCaseHistory>>;
type LogEntry = CaseHistoryData[number];
type GroupedHistory = {
  [day: string]: {
    [batchId: string]: LogEntry[];
  };
};

/**
 * Formats a date into a friendly, relative string like "Today", "Yesterday", or "Month Day, Year".
 */
const formatDateHeading = (dateStr: string) => {
  const date = new Date(dateStr);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
};

interface HistoryLogTimelineProps {
  groupedData: GroupedHistory;
}

export const HistoryLogTimeline = ({ groupedData }: HistoryLogTimelineProps) => {
  return (
    <div className="font-inter p-6 sm:p-8">
      {Object.entries(groupedData).map(([day, groupedByBatch]) => (
        <div key={day} className="mb-10">
          <h1 className="mb-4 text-xl font-semibold text-slate-800">{formatDateHeading(day)}</h1>
          {/* Establishes the positioning context for the timeline bar. */}
          <div className="relative">
            {/* The vertical timeline bar with fading effect */}
            <div
              className="absolute top-4 left-4 h-full w-0.5 bg-gradient-to-b from-emerald-600 via-emerald-400 to-transparent opacity-60 md:top-5 md:left-5"
              aria-hidden="true"
            />
            <div className="space-y-8">
              {Object.entries(groupedByBatch).map(([batchId, batchLogs]) => (
                <HistoryLogTimelineEvent key={batchId} batchId={batchId} batchLogs={batchLogs} />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

HistoryLogTimeline.displayName = "HistoryLogTimeline";
