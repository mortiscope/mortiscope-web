import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { DateRange } from "react-day-picker";

import { getCaseData } from "@/features/dashboard/actions/get-case-data";
import { type CaseData } from "@/features/dashboard/schemas/dashboard";
import { useDashboardStore } from "@/features/dashboard/store/dashboard-store";

/**
 * A smart hook that fetches dashboard case data using an adaptive polling strategy.
 * It uses Tanstack Query for the data fetching and a shared Zustand store to coordinate
 * polling behavior based on user activity and data changes.
 *
 * @param initialData The initial set of case data, typically passed from a server component for the first render.
 * @param dateRange An optional date range to filter the cases. The query will refetch when this changes.
 * @returns An object containing the fetched `data`, `isFetching` state, and other relevant polling info.
 */
export const useCaseDataPoller = (initialData: CaseData[], dateRange: DateRange | undefined) => {
  // Retrieves state and actions from the shared `useDashboardStore` to control polling behavior.
  const pollInterval = useDashboardStore((state) => state.pollInterval);
  const isUserActive = useDashboardStore((state) => state.isUserActive);
  const resetToFastPolling = useDashboardStore((state) => state.resetToFastPolling);
  const increasePollingInterval = useDashboardStore((state) => state.increasePollingInterval);
  const initializeActivityListeners = useDashboardStore(
    (state) => state.initializeActivityListeners
  );

  // A ref to store a stringified version of the previous data set.
  const previousDataRef = useRef<string | undefined>(undefined);

  /**
   * Initializes the user activity listeners from the Zustand store on component mount.
   */
  useEffect(() => {
    initializeActivityListeners();
  }, [initializeActivityListeners]);

  /**
   * The core Tanstack Query hook for fetching and polling the data.
   */
  const { data, isFetching, dataUpdatedAt, error } = useQuery({
    // The query key includes the date range so that the query automatically refetches when the range changes.
    queryKey: ["dashboard-cases", dateRange?.from, dateRange?.to],
    // The query function calls the `getCaseData` server action with the date range.
    queryFn: () => getCaseData(dateRange?.from, dateRange?.to),
    /**
     * A function that defines the dynamic polling interval.
     */
    refetchInterval: (query) => {
      if (query.state.error || !isUserActive) {
        return false;
      }
      return pollInterval;
    },
    // Disables polling when the browser tab is not in focus, saving resources.
    refetchIntervalInBackground: false,
    // Ensures that every poll triggers a "hard" refetch, ignoring any cached data.
    staleTime: 0,
    // Provides the initial data set from props for the very first render, preventing a loading state.
    initialData,
    // Configures an exponential back-off retry strategy for failed fetches.
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
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
    // Falls back to `initialData` to ensure there's always an array to render, even during the very first client-side fetch.
    data: data || initialData,
    isFetching,
    pollInterval,
    isUserActive,
    error,
  };
};
