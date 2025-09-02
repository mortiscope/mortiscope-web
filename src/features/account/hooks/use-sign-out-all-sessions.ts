"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { revokeAllSessions } from "@/features/account/actions/revoke-all-sessions";
import { verifyCurrentPassword } from "@/features/account/actions/verify-current-password";
import {
  type AccountAllSessionsModalFormValues,
  AccountAllSessionsModalSchema,
} from "@/features/account/schemas/account";

/**
 * Custom hook for managing sign out all sessions functionality.
 * Handles form state, validation, and the complete sign-out process.
 */
export const useSignOutAllSessions = (
  userId: string,
  currentSessionToken?: string,
  onSuccess?: () => void,
  onClose?: () => void
) => {
  /** A local state to track the pending state of the entire sign-out process. */
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Initializes `react-hook-form` with Zod for schema validation.
  const form = useForm<AccountAllSessionsModalFormValues>({
    resolver: zodResolver(AccountAllSessionsModalSchema),
    defaultValues: {
      password: "",
      signOutOption: "exclude_current",
    },
    mode: "onChange",
  });

  /**
   * Resets the form and signing out state.
   */
  const resetForm = () => {
    form.reset();
    setIsSigningOut(false);
  };

  /**
   * The main submission handler. It orchestrates a sequence of server actions.
   * 1. Verify the user's password.
   * 2. Revoke the targeted sessions.
   * 3. If necessary, sign the current user out.
   */
  const handleSubmit = async (values: AccountAllSessionsModalFormValues) => {
    setIsSigningOut(true);

    try {
      // Re-authenticate the user by verifying their password.
      const passwordResult = await verifyCurrentPassword({
        currentPassword: values.password,
      });

      if (!passwordResult.success) {
        toast.error(passwordResult.error || "Password verification failed.", {
          className: "font-inter",
        });
        setIsSigningOut(false);
        return;
      }

      // Call the server action to revoke the sessions.
      const revokeResult = await revokeAllSessions(
        userId,
        // Conditionally pass the current session token to exclude it from revocation.
        values.signOutOption === "exclude_current" ? currentSessionToken : undefined
      );

      if (revokeResult.success) {
        const count = revokeResult.revokedCount || 0;
        const sessionPlural = count === 1 ? "" : "s";

        // Handle the outcome based on the chosen sign-out option.
        if (values.signOutOption === "include_current") {
          // If signing out everywhere, show a toast, close the modal, and then perform a client-side sign-out.
          toast.success(`${count} session${sessionPlural} revoked.`, {
            className: "font-inter",
          });
          onClose?.();
          // A delay allows the user to see the success message before being redirected.
          setTimeout(async () => {
            await signOut({ redirect: false });
            window.location.href = "/";
          }, 1500);
        } else {
          // If only signing out other devices, show a success message and call the `onSuccess` callback.
          toast.success(`${count} session${sessionPlural} revoked successfully.`, {
            className: "font-inter",
          });
          onClose?.();
          onSuccess?.();
        }
      } else {
        toast.error(revokeResult.error || "Failed to revoke sessions.", {
          className: "font-inter",
        });
      }
    } catch {
      toast.error("An unexpected error occurred.", {
        className: "font-inter",
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  // Watch is used to get the current values of form fields for real-time validation checks.
  const password = form.watch("password");
  const signOutOption = form.watch("signOutOption");
  // A derived boolean to control the disabled state of the submit button.
  const isFormValid = password.length >= 8 && signOutOption && !isSigningOut;

  return {
    form,
    isSigningOut,
    isFormValid,
    password,
    signOutOption,
    handleSubmit,
    resetForm,
  };
};
