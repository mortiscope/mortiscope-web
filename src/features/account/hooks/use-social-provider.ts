"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getAccountProviders } from "@/features/account/actions/get-account-providers";

/**
 * Defines the data structure for the user's account providers.
 */
type ProvidersData = {
  hasSocialProviders: boolean;
  providers: string[];
  hasPassword: boolean;
};

/**
 * Defines the return type and public API of the `useSocialProvider` hook.
 */
type UseSocialProviderReturn = {
  data: ProvidersData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isSocialUser: boolean;
};

/**
 * A custom hook to detect if the current user is using social providers for authentication.
 * @returns An object containing the providers `data`, `isLoading` state, `error` message, `refetch` function, and `isSocialUser` boolean.
 */
export function useSocialProvider(): UseSocialProviderReturn {
  /** Stores the fetched providers data. */
  const [data, setData] = useState<ProvidersData | null>(null);
  /** Tracks the loading state of the data fetch. */
  const [isLoading, setIsLoading] = useState(true);
  /** Stores any error message that occurs during the fetch. */
  const [error, setError] = useState<string | null>(null);

  /**
   * A memoized function that performs the asynchronous data fetch by calling the `getAccountProviders` server action.
   * It manages the loading and error states throughout the request lifecycle.
   */
  const fetchProviders = useCallback(async () => {
    try {
      // Set the initial state for a new fetch operation.
      setIsLoading(true);
      setError(null);

      // Call the server action to get the providers data.
      const result = await getAccountProviders();

      // Handle the structured response from the server action.
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to fetch providers data");
        setData(null);
      }
    } catch (err) {
      // Handle unexpected network or runtime errors.
      setError("An unexpected error occurred");
      setData(null);
      console.error("Providers fetch error:", err);
    } finally {
      // Ensure the loading state is always turned off after the fetch completes.
      setIsLoading(false);
    }
  }, []);

  /**
   * A memoized function that exposes the internal `fetchProviders` logic, allowing
   * components to manually trigger a data refetch.
   */
  const refetch = useCallback(async () => {
    await fetchProviders();
  }, [fetchProviders]);

  /**
   * A side effect that triggers the initial data fetch when the hook is first mounted.
   */
  useEffect(() => {
    void fetchProviders();
  }, [fetchProviders]);

  /**
   * Determines if the user is a social provider user based on the fetched data.
   */
  const isSocialUser = useMemo(() => {
    return data?.hasSocialProviders === true && data?.hasPassword === false;
  }, [data]);

  /**
   * Memoizes the returned object to ensure a stable reference is provided to the consuming component.
   */
  return useMemo(
    () => ({
      data,
      isLoading,
      error,
      refetch,
      isSocialUser,
    }),
    [data, isLoading, error, refetch, isSocialUser]
  );
}
