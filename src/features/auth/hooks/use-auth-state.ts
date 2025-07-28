"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

/**
 * Custom hook to manage authentication state with proper loading states
 * during navigation and authentication transitions.
 */
export function useAuthState() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  // Track pathname changes to detect navigation
  useEffect(() => {
    if (pathname !== lastPathname) {
      setIsNavigating(true);
      setLastPathname(pathname);

      // Reset navigation state after a short delay to allow for page rendering
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [pathname, lastPathname]);

  // Reset navigation state when session status changes
  useEffect(() => {
    if (status !== "loading") {
      const timer = setTimeout(() => {
        setIsNavigating(false);
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [status]);

  const isLoading = status === "loading" || isNavigating;
  const isAuthenticated = status === "authenticated" && !!session?.user && !isNavigating;
  const isUnauthenticated = status === "unauthenticated" && !isNavigating;

  return {
    session,
    status,
    isLoading,
    isAuthenticated,
    isUnauthenticated,
    isNavigating,
    user: session?.user,
  };
}
