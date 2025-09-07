import { useQuery } from "@tanstack/react-query";
import { DateRange } from "react-day-picker";

import { getDashboardMetrics } from "@/features/dashboard/actions/get-dashboard-metrics";

/**
 * A custom hook that polls for dashboard metrics.
 * @param initialData - The initial data to hydrate the query with (from SSR).
 * @param dateRange - The date range to filter metrics by.
 */
export const useMetricsPoller = (
  initialData: Awaited<ReturnType<typeof getDashboardMetrics>>,
  dateRange: DateRange | undefined
) => {
  return useQuery({
    queryKey: ["dashboard-metrics", dateRange?.from, dateRange?.to],
    queryFn: () => getDashboardMetrics(dateRange?.from, dateRange?.to),
    // Poll every 10 seconds.
    refetchInterval: 10000,
    // Disable background polling to reduce unnecessary database queries.
    refetchIntervalInBackground: false,
    // Use initial data from the server to avoid a loading state on first render.
    initialData,
  });
};
