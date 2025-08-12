"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getAccountSecurity } from "@/features/account/actions/get-account-security";

/**
 * Defines the data structure for the user's account security information.
 */
type SecurityData = {
  id: string;
  email: string;
};

/**
 * Defines the return type and public API of the `useAccountSecurity` hook.
 */
type UseAccountSecurityReturn = {
  data: SecurityData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

/**
 * A custom hook to fetch and manage the current user's security-related data.
 * @returns An object containing the security `data`, `isLoading` state, `error` message, and a `refetch` function.
 */
export function useAccountSecurity(): UseAccountSecurityReturn {
  /** Stores the fetched security data. */
  const [data, setData] = useState<SecurityData | null>(null);
  /** Tracks the loading state of the data fetch. Initialized to `true` for the first fetch. */
  const [isLoading, setIsLoading] = useState(true);
  /** Stores any error message that occurs during the fetch. */
  const [error, setError] = useState<string | null>(null);

  /**
   * A memoized function that performs the asynchronous data fetch by calling the `getAccountSecurity` server action.
   * It manages the loading and error states throughout the request lifecycle.
   */
  const fetchSecurity = useCallback(async () => {
    try {
      // Set the initial state for a new fetch operation.
      setIsLoading(true);
      setError(null);

      // Call the server action to get the security data.
      const result = await getAccountSecurity();

      // Handle the structured response from the server action.
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || "Failed to fetch security data");
        setData(null);
      }
    } catch (err) {
      // Handle unexpected network or runtime errors.
      setError("An unexpected error occurred");
      setData(null);
      console.error("Security fetch error:", err);
    } finally {
      // Ensure the loading state is always turned off after the fetch completes.
      setIsLoading(false);
    }
  }, []);

  /**
   * A memoized function that exposes the internal `fetchSecurity` logic, allowing
   * components to manually trigger a data refetch.
   */
  const refetch = useCallback(async () => {
    await fetchSecurity();
  }, [fetchSecurity]);

  /**
   * A side effect that triggers the initial data fetch when the hook is first mounted.
   */
  useEffect(() => {
    void fetchSecurity();
  }, [fetchSecurity]);

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
