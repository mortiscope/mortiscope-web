"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useRef } from "react";

/**
 * A custom hook to monitor the user's authentication status in real-time.
 * @returns An object containing the current session's validity and the raw status string.
 */
export function useSessionMonitor() {
  // The core NextAuth hook to get session data and status.
  const { data: session, status } = useSession();
  const router = useRouter();

  /** A ref to store the session's user ID from the *previous* render for comparison. */
  const previousSessionRef = useRef<string | null>(null);
  /** A ref to track if the hook has run at least once, to prevent firing logic on the initial mount. */
  const isInitializedRef = useRef(false);
  /** A ref to ensure the redirect logic is only executed once, preventing potential redirect loops. */
  const hasRedirectedRef = useRef(false);

  /**
   * Checks if the server is reachable by attempting to fetch the session endpoint.
   * @returns A promise that resolves to true if the server is reachable, false otherwise.
   */
  const isServerReachable = async (): Promise<boolean> => {
    try {
      await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
      });
      // If we get any response (even 401/403), the server is reachable
      return true;
    } catch {
      // Network error means server is not reachable
      return false;
    }
  };

  /**
   * This effect runs on every change to the session or its status. It contains the
   * core state-machine logic to detect a logout event.
   */
  useEffect(() => {
    // Do nothing while the session status is still being determined.
    if (status === "loading") return;

    // If a redirect has already been performed, do nothing further to prevent loops.
    if (hasRedirectedRef.current) return;

    // Get the user ID from the current session, or null if it's unauthenticated.
    const currentSessionId = session?.user?.id || null;

    // On the very first run, initialize the `previousSessionRef` with the current session state and then exit.
    if (!isInitializedRef.current) {
      previousSessionRef.current = currentSessionId;
      isInitializedRef.current = true;
      return;
    }

    // Core logout detection logic.
    if (previousSessionRef.current && !currentSessionId && status === "unauthenticated") {
      // Before redirecting, verify the server is actually reachable
      isServerReachable().then((reachable) => {
        if (reachable && !hasRedirectedRef.current) {
          // Server is reachable and session is genuinely unauthenticated
          hasRedirectedRef.current = true;
          router.replace("/");
        }
        // If server is not reachable, don't redirect - just stay on the page
      });
      return;
    }

    // At the end of every run, update the `previousSessionRef` to the current state.
    previousSessionRef.current = currentSessionId;
  }, [session, status, router]);

  // Exposes a simple API for consuming components to check the current session state.
  return {
    isSessionValid: !!session?.user?.id,
    sessionStatus: status,
  };
}
