"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { useSocialProvider } from "@/features/account/hooks/use-social-provider";
import { useUpdateProfile } from "@/features/account/hooks/use-update-profile";
import {
  type AccountDeletionPasswordFormValues,
  AccountDeletionPasswordSchema,
} from "@/features/account/schemas/account";

/**
 * A custom hook that manages account deletion functionality.
 * Handles password verification, social provider detection, and deletion states.
 * @returns An object containing deletion state, handlers, and computed values.
 */
export function useAccountDeletion() {
  const [isPasswordLocked, setIsPasswordLocked] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [isDeleteLocked, setIsDeleteLocked] = useState(true);

  // Check if user is using social providers
  const { isSocialUser, isLoading: isSocialProviderLoading } = useSocialProvider();

  // Wait for social provider data to be ready before showing animations
  const isDataReady = !isSocialProviderLoading;

  // Account mutations
  const { verifyPassword } = useUpdateProfile();

  // Form setup with validation
  const form = useForm<AccountDeletionPasswordFormValues>({
    resolver: zodResolver(AccountDeletionPasswordSchema),
    defaultValues: {
      password: "",
    },
    mode: "onChange",
  });

  /**
   * Handle password verification
   */
  const handlePasswordVerification = () => {
    const password = form.getValues("password");
    verifyPassword.mutate(
      { currentPassword: password },
      {
        onSuccess: (data) => {
          if (data?.success) {
            setIsPasswordVerified(true);
          }
        },
      }
    );
  };

  /**
   * Handle current password change to reset verification
   */
  const handlePasswordChange = (value: string) => {
    if (isPasswordVerified) {
      setIsPasswordVerified(false);
    }
    return value;
  };

  /**
   * Handle lock/unlock with field reset
   */
  const handlePasswordLockToggle = () => {
    if (!isPasswordLocked) {
      // If locking, reset password field and verification state
      form.setValue("password", "");
      form.clearErrors("password");
      setIsPasswordVerified(false);
    }
    setIsPasswordLocked(!isPasswordLocked);
  };

  /**
   * Button state logic
   */
  const isPasswordSubmitEnabled =
    !isSocialUser &&
    !isPasswordLocked &&
    Boolean(form.watch("password")) &&
    !form.formState.errors.password &&
    !verifyPassword.isPending &&
    !isPasswordVerified;

  const isDeleteEnabled = isSocialProviderLoading
    ? false
    : isSocialUser
      ? !isDeleteLocked
      : isPasswordVerified;

  return {
    // Form state
    form,
    isDataReady,
    isSocialUser,
    isSocialProviderLoading,

    // Password states
    isPasswordLocked,
    showPassword,
    setShowPassword,
    isPasswordVerified,
    isPasswordSubmitEnabled,

    // Delete states
    isDeleteLocked,
    setIsDeleteLocked,
    isDeleteEnabled,

    // Modal state
    isModalOpen,
    setIsModalOpen,

    // Mutations
    verifyPassword,

    // Handlers
    handlePasswordVerification,
    handlePasswordChange,
    handlePasswordLockToggle,
  };
}
