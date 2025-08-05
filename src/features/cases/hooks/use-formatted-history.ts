import { format } from "date-fns";
import { groupBy } from "lodash";
import { useMemo } from "react";

import { getCaseHistory } from "@/features/results/actions/get-case-history";

// A type alias for the data returned by our server action.
type CaseHistoryData = Awaited<ReturnType<typeof getCaseHistory>>;
type LogEntry = CaseHistoryData[number];

type GroupedHistory = {
  [day: string]: {
    [batchId: string]: LogEntry[];
  };
};

/**
 * A custom hook to process and group case history data.
 * It groups logs by day, and then by batchId within each day.
 *
 * @param data - The raw case history data array.
 * @returns An object where keys are day strings and values are objects of logs grouped by batchId.
 */
export const useFormattedHistory = (data: CaseHistoryData | undefined) => {
  const groupedData: GroupedHistory = useMemo(() => {
    if (!data || data.length === 0) {
      return {};
    }

    // Group logs by day.
    const groupedByDay = groupBy(data, (log) => format(new Date(log.timestamp), "yyyy-MM-dd"));

    // Within each day, group logs by `batchId`.
    const fullyGrouped = Object.fromEntries(
      Object.entries(groupedByDay).map(([day, logs]) => [day, groupBy(logs, "batchId")])
    );

    return fullyGrouped;
  }, [data]);

  return groupedData;
};
