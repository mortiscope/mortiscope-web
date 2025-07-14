"use client";

import { useQuery } from "@tanstack/react-query";

import { getCases } from "@/features/results/actions/get-cases";

/**
 * A custom hook to fetch the user's cases.
 *
 * @returns The result of the useQuery hook for cases.
 */
export const useCases = () => {
  return useQuery({
    // The query key is a unique identifier for this data.
    queryKey: ["cases"],
    // The query function is the async function that fetches the data.
    queryFn: () => getCases(),
  });
};
