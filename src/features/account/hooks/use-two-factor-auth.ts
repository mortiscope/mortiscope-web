"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { disableTwoFactor } from "@/features/account/actions/disable-two-factor";
import { getRecoveryCodes } from "@/features/account/actions/get-recovery-codes";
import { regenerateRecoveryCodes } from "@/features/account/actions/regenerate-recovery-codes";
import { setupTwoFactor } from "@/features/account/actions/setup-two-factor";
import { verifyTwoFactor } from "@/features/account/actions/verify-two-factor";

/**
 * A custom hook that provides mutations for two-factor authentication operations.
 * @returns An object containing 2FA mutation functions and their status.
 */
export function useTwoFactorAuth() {
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

  return {
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
  };
}
