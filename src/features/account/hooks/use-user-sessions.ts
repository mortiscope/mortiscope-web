"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getUserSessions } from "@/features/account/actions/get-user-sessions";
import { revokeAllSessions } from "@/features/account/actions/revoke-all-sessions";
import { revokeSession } from "@/features/account/actions/revoke-session";

/**
 * A custom hook to fetch and manage a user's active sessions. It provides functionality
 * for querying all sessions, revoking a single session, and revoking all sessions,
 * while handling loading states, error feedback, and cache management with Tanstack Query.
 *
 * @param userId The unique ID of the user whose sessions are being managed.
 * @returns A comprehensive API for interacting with the user's sessions.
 */
export function useUserSessions(userId: string) {
  // Initializes the Tanstack Query client for cache invalidation.
  const queryClient = useQueryClient();

  /**
   * Initializes a query with Tanstack Query to fetch the list of all active user sessions.
   * This query automatically refetches data in the background to keep the session list current.
   */
  const {
    data: sessions = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    // The query key includes the userId to ensure data is cached on a per-user basis.
    queryKey: ["user-sessions", userId],
    // The query function calls the `getUserSessions` server action.
    queryFn: () => getUserSessions(userId),
    // The query is only enabled when a valid `userId` is provided.
    enabled: !!userId,
    // Configures the data to be considered 'fresh' for 5 minutes, reducing redundant refetches.
    staleTime: 1000 * 60 * 5,
    // Automatically refetches the session list every 2 minutes in the background.
    refetchInterval: 1000 * 60 * 2,
  });

  /**
   * Initializes a mutation for revoking a single, specific user session.
   * It handles success and error feedback and invalidates the session list query on success.
   */
  const revokeSessionMutation = useMutation({
    mutationFn: ({ sessionId }: { sessionId: string }) => revokeSession(sessionId, userId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Session revoked successfully.");
        // Invalidate the 'user-sessions' query to trigger a refetch and update the UI.
        void queryClient.invalidateQueries({ queryKey: ["user-sessions", userId] });
      } else {
        toast.error(result.error || "Failed to revoke session.");
      }
    },
    onError: () => {
      toast.error("Failed to revoke session.");
    },
  });

  /**
   * Initializes a mutation for revoking all user sessions.
   * It handles success and error feedback and invalidates the session list query on success.
   */
  const revokeAllSessionsMutation = useMutation({
    mutationFn: ({ currentSessionToken }: { currentSessionToken?: string }) =>
      revokeAllSessions(userId, currentSessionToken),
    onSuccess: (result) => {
      if (result.success) {
        const count = result.revokedCount || 0;
        if (count > 0) {
          // Provides a specific count in the success message for better user feedback.
          toast.success(`${count} session${count === 1 ? "" : "s"} revoked successfully`);
        } else {
          // Handles the case where there were no other sessions to revoke.
          toast.info("No other sessions to revoke.");
        }
        // Invalidate the 'user-sessions' query to update the UI.
        void queryClient.invalidateQueries({ queryKey: ["user-sessions", userId] });
      } else {
        toast.error(result.error || "Failed to revoke sessions.");
      }
    },
    onError: () => {
      toast.error("Failed to revoke sessions.");
    },
  });

  // Exposes a clean, unified API for the consuming component.
  return {
    /** The array of user session info objects. Defaults to an empty array. */
    sessions,
    /** A boolean indicating if the initial session list is being fetched. */
    isLoading,
    /** A boolean indicating if the query encountered an error. */
    isError,
    /** The error object if `isError` is true. */
    error,
    /** A function to manually trigger a refetch of the session list. */
    refetch,
    /** A stable wrapper function to trigger the single session revocation mutation. */
    revokeSession: (sessionId: string) => revokeSessionMutation.mutate({ sessionId }),
    /** A stable wrapper function to trigger the "revoke all" sessions mutation. */
    revokeAllSessions: (currentSessionToken?: string) =>
      revokeAllSessionsMutation.mutate({ currentSessionToken }),
    /** A boolean indicating if the single session revocation is in progress. */
    isRevokingSession: revokeSessionMutation.isPending,
    /** A boolean indicating if the "revoke all" operation is in progress. */
    isRevokingAllSessions: revokeAllSessionsMutation.isPending,
  };
}
