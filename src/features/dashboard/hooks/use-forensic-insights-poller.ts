import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { DateRange } from "react-day-picker";

import { getLifeStageDistribution } from "@/features/dashboard/actions/get-life-stage-distribution";
import { getPmiDistribution } from "@/features/dashboard/actions/get-pmi-distribution";
import { getSamplingDensity } from "@/features/dashboard/actions/get-sampling-density";
import { useDashboardStore } from "@/features/dashboard/store/dashboard-store";

/**
 * Defines the shape of the data for life stage distributions.
 */
interface LifeStageData {
  name: string;
  quantity: number;
}

/**
 * Defines the props for the use forensic insights poller hook.
 */
interface UseForensicInsightsPollerProps {
  /** An optional date range to filter the insights. */
  dateRange: DateRange | undefined;
}

/**
 * A smart hook that fetches three distinct but related datasets for forensic insights
 * using an adaptive polling strategy. It uses Tanstack Query for the data fetching and a
 * shared Zustand store to coordinate polling behavior based on user activity and data changes.
 *
 * @param {UseForensicInsightsPollerProps} props The props for the hook.
 * @returns An object containing the fetched datasets, `isFetching` state, and other relevant polling info.
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

export const useForensicInsightsPoller = ({ dateRange }: UseForensicInsightsPollerProps) => {
  // Retrieves state and actions from the shared `useDashboardStore` to control polling behavior.
  const pollInterval = useDashboardStore((state) => state.pollInterval);
  const isUserActive = useDashboardStore((state) => state.isUserActive);
  const resetToFastPolling = useDashboardStore((state) => state.resetToFastPolling);
  const increasePollingInterval = useDashboardStore((state) => state.increasePollingInterval);

  // A ref to store a stringified version of the previous data set.
  const previousDataRef = useRef<string | undefined>(undefined);

  /**
   * An asynchronous function that fetches all three insight datasets concurrently using `Promise.all`.
   * @returns A promise that resolves to an object containing all three datasets.
   */
  const fetchForensicInsights = async () => {
    const [lifeStage, pmi, sampling] = await Promise.all([
      getLifeStageDistribution(dateRange?.from, dateRange?.to),
      getPmiDistribution(dateRange?.from, dateRange?.to),
      getSamplingDensity(dateRange?.from, dateRange?.to),
    ]);

    return { lifeStage, pmi, sampling };
  };

  /**
   * The core Tanstack Query hook for fetching and polling the data.
   */
  const { data, isFetching, dataUpdatedAt, error } = useQuery({
    // The query key includes the date range so that the query automatically refetches when the range changes.
    queryKey: ["forensic-insights", dateRange?.from, dateRange?.to],
    queryFn: fetchForensicInsights,
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

  // Exposes the public API of the hook, separating the combined data object into individual properties.
  return {
    lifeStageData: (data?.lifeStage as LifeStageData[]) || null,
    pmiData: (data?.pmi as LifeStageData[]) || null,
    samplingData: (data?.sampling as LifeStageData[]) || null,
    isFetching,
    pollInterval,
    isUserActive,
    error,
  };
};
