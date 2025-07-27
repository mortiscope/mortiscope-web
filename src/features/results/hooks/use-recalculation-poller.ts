import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { getRecalculationStatus } from "@/features/results/actions/get-recalculation-status";

/**
 * A custom hook to poll for the status of a case recalculation.
 *
 * This hook periodically calls a server action to check the `recalculationNeeded`
 * flag for a given case. When the flag becomes `false`, it signifies that the
 * background job is complete, and it triggers a success callback.
 *
 * @param {object} params - The parameters for the hook.
 * @param {string | null} params.caseId - The ID of the case to poll.
 * @param {boolean} params.enabled - A boolean to enable or disable the polling.
 * @param {() => void} params.onSuccess - A callback function to execute when recalculation is complete.
 */
export const useRecalculationPoller = ({
  caseId,
  enabled,
  onSuccess,
}: {
  caseId: string | null;
  enabled: boolean;
  onSuccess: () => void;
}) => {
  const hasCompletedRef = useRef(false);
  const previousEnabledRef = useRef(enabled);

  const { data: isRecalculationNeeded } = useQuery({
    queryKey: ["recalculationStatus", caseId],
    queryFn: async () => {
      if (!caseId) {
        return true;
      }
      return await getRecalculationStatus(caseId);
    },
    // Only enable the query if the hook is enabled and the user have a caseId.
    enabled: enabled && !!caseId,
    // Poll every 3 seconds.
    refetchInterval: 3000,
    // Do not refetch when the window regains focus.
    refetchOnWindowFocus: false,
    // Ensure fresh data on each poll
    staleTime: 0,
    gcTime: 0,
  });

  // Reset completion flag when polling starts or when caseId changes
  useEffect(() => {
    if (enabled && !previousEnabledRef.current) {
      hasCompletedRef.current = false;
    }
    previousEnabledRef.current = enabled;
  }, [enabled]);

  // Reset completion flag when caseId changes
  useEffect(() => {
    hasCompletedRef.current = false;
  }, [caseId]);

  useEffect(() => {
    // Only trigger success callback once per polling session
    if (isRecalculationNeeded === false && enabled && !hasCompletedRef.current) {
      hasCompletedRef.current = true;

      // Add a small delay to ensure the server has fully committed the changes
      setTimeout(() => {
        onSuccess();
      }, 500);
    }
  }, [isRecalculationNeeded, onSuccess, enabled, caseId]);
};
