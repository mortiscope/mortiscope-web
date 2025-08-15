"use client";

import { useMutation } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { useMemo } from "react";
import { toast } from "sonner";

import { updatePassword } from "@/features/account/actions/change-password";
import { disableTwoFactor } from "@/features/account/actions/disable-two-factor";
import { getRecoveryCodes } from "@/features/account/actions/get-recovery-codes";
import { regenerateRecoveryCodes } from "@/features/account/actions/regenerate-recovery-codes";
import { updateEmail } from "@/features/account/actions/request-email-change";
import { setupTwoFactor } from "@/features/account/actions/setup-two-factor";
import { updateProfile } from "@/features/account/actions/update-profile";
import { verifyCurrentPassword } from "@/features/account/actions/verify-current-password";
import { verifyTwoFactor } from "@/features/account/actions/verify-two-factor";

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
   * A mutation to setup two-factor authentication by generating a secret and QR code.
   */
  const setupTwoFactorMutation = useMutation({
    mutationFn: setupTwoFactor,
    onError: () => {
      toast.error("Failed to setup two-factor authentication.", {
        className: "font-inter",
      });
    },
  });

  /**
   * A mutation to verify the two-factor authentication code and enable 2FA.
   */
  const verifyTwoFactorMutation = useMutation({
    mutationFn: verifyTwoFactor,
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Two-factor authentication successfully setup.", {
          className: "font-inter",
        });
      } else {
        toast.error(data.error || "Failed to verify two-factor authentication.", {
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
   * A mutation to get recovery codes status.
   */
  const getRecoveryCodesMutation = useMutation({
    mutationFn: getRecoveryCodes,
    onError: () => {
      toast.error("Failed to load recovery codes.", {
        className: "font-inter",
      });
    },
  });

  /**
   * A mutation to regenerate recovery codes.
   */
  const regenerateRecoveryCodesMutation = useMutation({
    mutationFn: regenerateRecoveryCodes,
    onSuccess: (data) => {
      if (data.success) {
        toast.success("Recovery codes regenerated successfully.", {
          className: "font-inter",
        });
      } else {
        toast.error(data.error || "Failed to regenerate recovery codes.", {
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
   * A mutation to disable two-factor authentication.
   */
  const disableTwoFactorMutation = useMutation({
    mutationFn: disableTwoFactor,
    // Let the component handle success/error toasts
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
      setupTwoFactor: {
        mutate: setupTwoFactorMutation.mutate,
        isPending: setupTwoFactorMutation.isPending,
        isSuccess: setupTwoFactorMutation.isSuccess,
        data: setupTwoFactorMutation.data,
      },
      verifyTwoFactor: {
        mutate: verifyTwoFactorMutation.mutate,
        isPending: verifyTwoFactorMutation.isPending,
        isSuccess: verifyTwoFactorMutation.isSuccess,
        data: verifyTwoFactorMutation.data,
      },
      getRecoveryCodes: {
        mutate: getRecoveryCodesMutation.mutate,
        isPending: getRecoveryCodesMutation.isPending,
        isSuccess: getRecoveryCodesMutation.isSuccess,
        data: getRecoveryCodesMutation.data,
      },
      regenerateRecoveryCodes: {
        mutate: regenerateRecoveryCodesMutation.mutate,
        isPending: regenerateRecoveryCodesMutation.isPending,
        isSuccess: regenerateRecoveryCodesMutation.isSuccess,
        data: regenerateRecoveryCodesMutation.data,
      },
      disableTwoFactor: {
        mutate: disableTwoFactorMutation.mutate,
        isPending: disableTwoFactorMutation.isPending,
        isSuccess: disableTwoFactorMutation.isSuccess,
        data: disableTwoFactorMutation.data,
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
      setupTwoFactorMutation.mutate,
      setupTwoFactorMutation.isPending,
      setupTwoFactorMutation.isSuccess,
      setupTwoFactorMutation.data,
      verifyTwoFactorMutation.mutate,
      verifyTwoFactorMutation.isPending,
      verifyTwoFactorMutation.isSuccess,
      verifyTwoFactorMutation.data,
      getRecoveryCodesMutation.mutate,
      getRecoveryCodesMutation.isPending,
      getRecoveryCodesMutation.isSuccess,
      getRecoveryCodesMutation.data,
      regenerateRecoveryCodesMutation.mutate,
      regenerateRecoveryCodesMutation.isPending,
      regenerateRecoveryCodesMutation.isSuccess,
      regenerateRecoveryCodesMutation.data,
      disableTwoFactorMutation.mutate,
      disableTwoFactorMutation.isPending,
      disableTwoFactorMutation.isSuccess,
      disableTwoFactorMutation.data,
    ]
  );
}
