"use client";

import { useMutation } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

import { updatePassword } from "@/features/account/actions/change-password";

/**
 * A custom hook that provides mutations for password-related operations.
 * @returns An object containing password mutation functions and their status.
 */
export function useUpdatePassword() {
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

  return {
    updatePassword: {
      mutate: updatePasswordMutation.mutate,
      isPending: updatePasswordMutation.isPending,
      isSuccess: updatePasswordMutation.isSuccess,
    },
  };
}
