"use client";

import { useQuery } from "@tanstack/react-query";

import { getCaseById } from "@/features/results/actions/get-case-by-id";
import { type CaseWithRelations } from "@/features/results/components/results-view";

/**
 * A react-query hook to fetch and cache the complete data for a single case.
 *
 * @param caseId The ID of the case.
 * @param initialData The data fetched from the server component to prevent initial loading flashes.
 */
export const useCaseData = (caseId: string, initialData: CaseWithRelations) => {
  return useQuery({
    // This unique key tells react-query how to cache this specific data.
    queryKey: ["case", caseId],
    queryFn: () => getCaseById(caseId),
    // Use the server-fetched data as the initial state.
    initialData,
  });
};
