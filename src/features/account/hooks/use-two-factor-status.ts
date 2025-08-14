"use client";

import { useQuery } from "@tanstack/react-query";

import { getTwoFactorStatus } from "@/features/account/actions/get-two-factor-status";

/**
 * Hook to get the current two-factor authentication status for the user.
 */
export function useTwoFactorStatus() {
  return useQuery({
    queryKey: ["twoFactorStatus"],
    queryFn: getTwoFactorStatus,
    staleTime: 1000 * 60 * 5,
  });
}
