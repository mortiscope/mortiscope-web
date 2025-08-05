"use client";

import { useQuery } from "@tanstack/react-query";

import { getCaseHistory } from "@/features/results/actions/get-case-history";

/**
 * A client-side hook to fetch the audit history for a specific case.
 *
 * @param caseId The ID of the case for which to fetch history.
 * @returns The result object from TanStack Query, containing the data, loading, and error states.
 */
export const useCaseHistory = (caseId: string) => {
  return useQuery({
    queryKey: ["caseHistory", caseId],
    queryFn: () => getCaseHistory(caseId),
    // Keep data fresh but don't refetch too aggressively.
    staleTime: 1000 * 60 * 5,
  });
};
