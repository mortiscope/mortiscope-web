"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession as useNextAuthSession } from "next-auth/react";

import { getCurrentSession } from "@/features/account/actions/get-user-sessions";

/**
 * A comprehensive custom hook that combines the standard metadata fetched from the database via a server action.
 * It provides a unified API for accessing all session-related data and status flags.
 * @returns A unified object containing the session, the detailed session info, and various loading/status flags.
 */
export function useSession() {
  // Initializes the core `useSession` from `next-auth/react` to get the basic authentication status and user data.
  const { data: authSession, status } = useNextAuthSession();

  // Initializes Tanstack Query to fetch the rich session metadata from our custom `userSessions` table.
  const {
    data: sessionInfo,
    isLoading: isSessionInfoLoading,
    error: sessionInfoError,
  } = useQuery({
    // The query key includes the user ID to ensure the data is cached per-user.
    queryKey: ["current-session", authSession?.user?.id],
    // The query function calls the `getCurrentSession` server action.
    queryFn: () => getCurrentSession(authSession?.user?.id as string),
    // The query is only enabled when the user is authenticated and has a valid ID.
    enabled: !!authSession?.user?.id && status === "authenticated",
    // Configures the data to be considered 'fresh' for 5 minutes, reducing redundant refetches on component mounts.
    staleTime: 1000 * 60 * 5,
    // Automatically refetches the session info every 2 minutes in the background to keep the 'last active' status current.
    refetchInterval: 1000 * 60 * 2,
  });

  // Exposes a unified API combining both data sources and derived status flags for easy consumption by UI components.
  return {
    /** The raw session object from `next-auth/react`. */
    session: authSession,
    /** The authentication status string from `next-auth/react`. */
    status,
    /** A boolean indicating if the initial session is loading. */
    isLoading: status === "loading",
    /** A boolean indicating if the user is authenticated according to NextAuth. */
    isAuthenticated: status === "authenticated",
    /** The detailed, rich session metadata fetched from the custom database table. */
    sessionInfo,
    /** A boolean indicating if the rich session metadata is currently being fetched. */
    isSessionInfoLoading,
    /** Any error that occurred while fetching the rich session metadata. */
    sessionInfoError,
    /** A convenience boolean that is `true` only when both the session and the rich session metadata have finished loading. */
    isFullyLoaded: status !== "loading" && !isSessionInfoLoading,
  };
}

/**
 * A lightweight selector hook to extract the custom `sessionToken` from the session object.
 * @returns The session token string if the user is authenticated, otherwise `null`.
 */
export function useSessionToken() {
  const { data: session, status } = useNextAuthSession();

  // Only attempts to access the token if the user is authenticated and the session object exists.
  if (status === "authenticated" && session) {
    return (session as { sessionToken?: string })?.sessionToken || null;
  }

  return null;
}

/**
 * A simple utility hook to determine if a given session token matches the token of the current user's active session.
 *
 * @param sessionToken The session token to check against the current session.
 * @returns `true` if the provided token matches the current session's token, otherwise `false`.
 */
export function useIsCurrentSession(sessionToken: string) {
  // Gets the session token for the user's current device.
  const currentSessionToken = useSessionToken();
  // Performs a direct comparison to check for a match.
  return currentSessionToken === sessionToken;
}
