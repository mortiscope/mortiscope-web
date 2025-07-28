"use client";

import { useQuery } from "@tanstack/react-query";

import { getCaseName } from "@/features/results/actions/get-case-name";

/**
 * A TanStack Query hook to fetch the name of a case by its ID.
 *
 * @param {string | null | undefined} caseId The ID of the case to fetch. The query is disabled if the ID is falsy.
 * @returns The result of the useQuery hook containing the case name data.
 */
export const useCaseName = (caseId: string | null | undefined) => {
  return useQuery({
    queryKey: ["caseName", caseId],
    queryFn: async () => {
      if (!caseId) return null;
      const caseName = await getCaseName(caseId);
      return caseName ? { caseName } : null;
    },
    enabled: !!caseId,
    staleTime: 1000 * 60 * 5,
  });
};
