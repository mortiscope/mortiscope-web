"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { updateProfile } from "@/features/account/actions/update-profile";
import { verifyCurrentPassword } from "@/features/account/actions/verify-current-password";

/**
 * A custom hook that provides mutations for profile-related operations.
 * @returns An object containing profile mutation functions and their status.
 */
export function useUpdateProfile() {
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

  return {
    verifyPassword: {
      mutate: verifyPasswordMutation.mutate,
      isPending: verifyPasswordMutation.isPending,
      isSuccess: verifyPasswordMutation.isSuccess,
      data: verifyPasswordMutation.data,
    },
    updateProfile: {
      mutate: updateProfileMutation.mutate,
      isPending: updateProfileMutation.isPending,
      isSuccess: updateProfileMutation.isSuccess,
    },
  };
}
