"use client";

import { useMutation } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { useMemo } from "react";
import { toast } from "sonner";

import { updatePassword } from "@/features/account/actions/change-password";
import { updateEmail } from "@/features/account/actions/request-email-change";
import { updateProfile } from "@/features/account/actions/update-profile";
import { verifyCurrentPassword } from "@/features/account/actions/verify-current-password";

/**
 * A custom hook that provides a centralized API for all account-related server mutations.
 * @returns An object containing a simplified API for each mutation, including its `mutate` function and status flags.
 */
export function useAccountMutation() {
  /**
   * A mutation to verify the user's current password. This is often used as a
   * re-authentication step before performing a sensitive action.
   */
  const verifyPasswordMutation = useMutation({
    mutationFn: verifyCurrentPassword,
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Password verified successfully.", {
          className: "font-inter",
        });
      } else {
        toast.error(data.error || "Failed to verify password.", {
          className: "font-inter",
        });
      }
    },
    onError: () => {
      toast.error("An unexpected error occurred.", {
        className: "font-inter",
      });
    },
  });

  /**
   * A mutation to update the user's password. On success, it notifies the user
   * and then automatically signs them out for security reasons.
   */
  const updatePasswordMutation = useMutation({
    mutationFn: updatePassword,
    onSuccess: async (data) => {
      if (data.success) {
        // Provide immediate success feedback to the user.
        toast.success("Password changed successfully.", {
          className: "font-inter",
        });

        // Warn the user about the impending sign-out.
        toast.warning("You will be logged out shortly.", {
          className: "font-inter",
        });

        // After a brief delay to allow the user to read the toasts, sign them out.
        setTimeout(async () => {
          await signOut({ callbackUrl: "/signin" });
        }, 2000);
      } else {
        toast.error(data.error || "Failed to update password.", {
          className: "font-inter",
        });
      }
    },
    onError: () => {
      toast.error("An unexpected error occurred.", {
        className: "font-inter",
      });
    },
  });

  /**
   * A mutation to request an email change. On success, it notifies the user that a
   * verification email has been sent and then automatically signs them out for security.
   */
  const updateEmailMutation = useMutation({
    mutationFn: updateEmail,
    onSuccess: async (data) => {
      if (data.success) {
        toast.success("Email changed, please verify your new email.", {
          className: "font-inter",
        });

        toast.warning("You will be logged out shortly.", {
          className: "font-inter",
        });

        setTimeout(async () => {
          await signOut({ callbackUrl: "/signin" });
        }, 2000);
      } else {
        toast.error(data.error || "Failed to update email.", {
          className: "font-inter",
        });
      }
    },
    onError: () => {
      toast.error("An unexpected error occurred.", {
        className: "font-inter",
      });
    },
  });

  /**
   * A mutation to update the user's non-sensitive profile information.
   * Success feedback is typically handled in the component that calls this mutation.
   */
  const updateProfileMutation = useMutation({
    mutationFn: updateProfile,
    onError: () => {
      toast.error("An unexpected error occurred.", {
        className: "font-inter",
      });
    },
  });

  /**
   * Memoizes the returned object to provide a stable API to the consuming component.
   */
  return useMemo(
    () => ({
      verifyPassword: {
        mutate: verifyPasswordMutation.mutate,
        isPending: verifyPasswordMutation.isPending,
        isSuccess: verifyPasswordMutation.isSuccess,
        data: verifyPasswordMutation.data,
      },
      updatePassword: {
        mutate: updatePasswordMutation.mutate,
        isPending: updatePasswordMutation.isPending,
        isSuccess: updatePasswordMutation.isSuccess,
      },
      updateEmail: {
        mutate: updateEmailMutation.mutate,
        isPending: updateEmailMutation.isPending,
        isSuccess: updateEmailMutation.isSuccess,
      },
      updateProfile: {
        mutate: updateProfileMutation.mutate,
        isPending: updateProfileMutation.isPending,
        isSuccess: updateProfileMutation.isSuccess,
      },
    }),
    [
      // The dependency array includes all values exposed by the hook to ensure it updates correctly.
      verifyPasswordMutation.mutate,
      verifyPasswordMutation.isPending,
      verifyPasswordMutation.isSuccess,
      verifyPasswordMutation.data,
      updatePasswordMutation.mutate,
      updatePasswordMutation.isPending,
      updatePasswordMutation.isSuccess,
      updateEmailMutation.mutate,
      updateEmailMutation.isPending,
      updateEmailMutation.isSuccess,
      updateProfileMutation.mutate,
      updateProfileMutation.isPending,
      updateProfileMutation.isSuccess,
    ]
  );
}
