"use client";

import { useState } from "react";
import { toast } from "sonner";

import type { UserSessionInfo } from "@/features/account/actions/get-current-session";
import { revokeSession } from "@/features/account/actions/revoke-session";

/**
 * Custom hook for managing session revocation functionality.
 * Handles the revoke session process with loading states and error handling.
 */
export const useRevokeSession = (
  userId: string,
  currentSessionToken?: string,
  onSuccess?: () => void,
  onClose?: () => void
) => {
  /** A local state to track the pending state of the sign-out action. */
  const [isSigningOut, setIsSigningOut] = useState(false);

  /**
   * Resets the signing out state.
   */
  const resetState = () => {
    setIsSigningOut(false);
  };

  /**
   * Handles the sign out action by calling the revoke session server action.
   * It manages the pending state and provides user feedback via toasts.
   */
  const handleSignOut = async (session: UserSessionInfo | null) => {
    // Prevent revoking the current session from this modal.
    const isCurrentSession = currentSessionToken === session?.sessionToken;
    if (!session || isCurrentSession) return;

    setIsSigningOut(true);

    try {
      // Call the server action to revoke the session.
      const result = await revokeSession(session.id, userId);

      if (result.success) {
        toast.success("Session revoked successfully.", {
          className: "font-inter",
        });

        // Close the modal and notify the parent component of the success.
        onClose?.();
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to revoke session.", {
          className: "font-inter",
        });
        setIsSigningOut(false);
      }
    } catch {
      toast.error("An unexpected error occurred.", {
        className: "font-inter",
      });
      setIsSigningOut(false);
    }
  };

  return {
    isSigningOut,
    handleSignOut,
    resetState,
  };
};
