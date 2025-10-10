"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { getTwoFactorStatus } from "@/features/account/actions/get-two-factor-status";

/**
 * Hook to get the current two-factor authentication status for the user.
 */
export function useTwoFactorStatus(): UseQueryResult<
  Awaited<ReturnType<typeof getTwoFactorStatus>>
> {
  return useQuery({
    queryKey: ["twoFactorStatus"],
    queryFn: getTwoFactorStatus,
    staleTime: 1000 * 60 * 5,
  });
}
