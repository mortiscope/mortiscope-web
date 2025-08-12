"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getAccountProfile } from "@/features/account/actions/get-account-profile";

/**
 * Defines the data structure for the user's account profile.
 */
type ProfileData = {
  id: string;
  name: string | null;
  email: string;
  professionalTitle: string | null;
  institution: string | null;
  locationRegion: string | null;
  locationProvince: string | null;
  locationCity: string | null;
  locationBarangay: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Defines the return type and public API of the `useAccountProfile` hook.
 */
type UseAccountProfileReturn = {
  data: ProfileData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

/**
 * A custom hook to fetch and manage the current user's account profile data.
 * @returns An object containing the profile `data`, `isLoading` state, `error` message, and a `refetch` function.
 */
export function useAccountProfile(): UseAccountProfileReturn {
  /** Stores the fetched profile data. */
  const [data, setData] = useState<ProfileData | null>(null);
  /** Tracks the loading state of the data fetch. */
  const [isLoading, setIsLoading] = useState(true);
  /** Stores any error message that occurs during the fetch. */
  const [error, setError] = useState<string | null>(null);

  /**
   * A memoized function that performs the asynchronous data fetch by calling the `getAccountProfile` server action.
   * It manages the loading and error states throughout the request lifecycle.
   */
  const fetchProfile = useCallback(async () => {
    try {
      // Set the initial state for a new fetch operation.
      setIsLoading(true);
      setError(null);

      // Call the server action to get the profile data.
      const result = await getAccountProfile();

      // Handle the structured response from the server action.
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to fetch profile");
        setData(null);
      }
    } catch (err) {
      // Handle unexpected network or runtime errors.
      setError("An unexpected error occurred");
      setData(null);
      console.error("Profile fetch error:", err);
    } finally {
      // Ensure the loading state is always turned off after the fetch completes.
      setIsLoading(false);
    }
  }, []);

  /**
   * A memoized function that exposes the internal `fetchProfile` logic, allowing
   * components to manually trigger a data refetch.
   */
  const refetch = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  /**
   * A side effect that triggers the initial data fetch when the hook is first mounted.
   */
  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  /**
   * Memoizes the returned object to ensure a stable reference is provided to the consuming component.
   */
  return useMemo(
    () => ({
      data,
      isLoading,
      error,
      refetch,
    }),
    [data, isLoading, error, refetch]
  );
}
