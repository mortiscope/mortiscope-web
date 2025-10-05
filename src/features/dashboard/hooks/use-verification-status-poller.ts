import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { DateRange } from "react-day-picker";

import { getVerificationStatus } from "@/features/dashboard/actions/get-verification-status";
import { useDashboardStore } from "@/features/dashboard/store/dashboard-store";

/**
 * Defines the props for the use verification status poller hook.
 */
interface UseVerificationStatusPollerProps {
  /** An optional date range to filter the status data. */
  dateRange: DateRange | undefined;
}

/**
 * A smart hook that fetches verification status data using an adaptive polling strategy.
 * It uses Tanstack Query for the data fetching and a shared Zustand store to coordinate
 * polling behavior based on user activity and data changes.
 *
 * @param {UseVerificationStatusPollerProps} props The props for the hook.
 * @returns An object containing the fetched `metrics` data, `isFetching` state, and other relevant polling info.
 */
export const calculateRefetchInterval = (
  isError: boolean,
  isUserActive: boolean,
  pollInterval: number
) => {
  if (isError || !isUserActive) {
    return false;
  }
  return pollInterval;
};

export const calculateRetryDelay = (attemptIndex: number) => {
  return Math.min(1000 * 2 ** attemptIndex, 30000);
};

export const useVerificationStatusPoller = ({ dateRange }: UseVerificationStatusPollerProps) => {
  // Retrieves state and actions from the shared `useDashboardStore` to control polling behavior.
  const pollInterval = useDashboardStore((state) => state.pollInterval);
  const isUserActive = useDashboardStore((state) => state.isUserActive);
  const resetToFastPolling = useDashboardStore((state) => state.resetToFastPolling);
  const increasePollingInterval = useDashboardStore((state) => state.increasePollingInterval);

  // A ref to store a stringified version of the previous data set.
  const previousDataRef = useRef<string | undefined>(undefined);

  /**
   * The core Tanstack Query hook for fetching and polling the data.
   */
  const { data, isFetching, dataUpdatedAt, error } = useQuery({
    // The query key includes the date range so that the query automatically refetches when the range changes.
    queryKey: ["verification-status", dateRange?.from, dateRange?.to],
    // The query function calls the `getVerificationStatus` server action with the date range.
    queryFn: () => getVerificationStatus(dateRange?.from, dateRange?.to),
    /**
     * A function that defines the dynamic polling interval.
     */
    refetchInterval: (query) =>
      calculateRefetchInterval(!!query.state.error, isUserActive, pollInterval),
    // Disables polling when the browser tab is not in focus, saving resources.
    refetchIntervalInBackground: false,
    // Ensures that every poll triggers a hard refetch, ignoring any cached data.
    staleTime: 0,
    // Configures an exponential back-off retry strategy for failed fetches.
    retry: 3,
    retryDelay: calculateRetryDelay,
  });

  /**
   * This effect implements the core adaptive polling logic. It compares the current data
   * with the previous data set after each successful fetch and adjusts the polling speed accordingly.
   */
  useEffect(() => {
    // The logic only runs if there is data to compare and the user is active.
    if (data && isUserActive) {
      // A stringified hash of the data is created for efficient comparison.
      const currentHash = JSON.stringify(data);

      if (previousDataRef.current === undefined) {
        // On the first successful fetch, it initializes the `previousDataRef` with the current data hash.
        previousDataRef.current = currentHash;
      } else if (previousDataRef.current !== currentHash) {
        // If the data has changed since the last poll, it resets the polling interval to its fastest rate.
        resetToFastPolling();
        previousDataRef.current = currentHash;
      } else {
        // If the data has not changed, it gradually increases the polling interval to reduce server load.
        increasePollingInterval();
      }
    }
  }, [data, dataUpdatedAt, isUserActive, resetToFastPolling, increasePollingInterval]);

  // Exposes the public API of the hook for the consuming component.
  return {
    metrics: data || null,
    isFetching,
    pollInterval,
    isUserActive,
    error,
  };
};
