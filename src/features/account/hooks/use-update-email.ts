"use client";

import { useMutation } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

import { updateEmail } from "@/features/account/actions/request-email-change";

/**
 * A custom hook that provides mutations for email-related operations.
 * @returns An object containing email mutation functions and their status.
 */
export function useUpdateEmail() {
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

  return {
    updateEmail: {
      mutate: updateEmailMutation.mutate,
      isPending: updateEmailMutation.isPending,
      isSuccess: updateEmailMutation.isSuccess,
    },
  };
}
