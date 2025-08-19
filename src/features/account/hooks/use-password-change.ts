"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useUpdatePassword } from "@/features/account/hooks/use-update-password";
import { useUpdateProfile } from "@/features/account/hooks/use-update-profile";

// Password change specific schema
const PasswordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, { message: "Current password is required." }),
    newPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
    repeatPassword: z.string().min(1, { message: "Please confirm your password." }),
  })
  .refine((data) => data.newPassword === data.repeatPassword, {
    message: "Passwords don't match.",
    path: ["repeatPassword"],
  });

type PasswordChangeFormValues = z.infer<typeof PasswordChangeSchema>;

/**
 * A self-contained orchestrator hook that manages password change functionality.
 * Handles its own form state, validation, and password operations.
 * @returns An object containing password change state, form, handlers, and computed values.
 */
export function usePasswordChange() {
  const [isPasswordLocked, setIsPasswordLocked] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);

  // Password-specific form
  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(PasswordChangeSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      repeatPassword: "",
    },
    mode: "onChange",
  });

  // Password mutations
  const { verifyPassword } = useUpdateProfile();
  const { updatePassword } = useUpdatePassword();

  // Combined error messages for responsive validation
  const currentPasswordFieldsError = form.formState.errors.currentPassword?.message;

  const newPasswordFieldsError =
    form.formState.errors.newPassword?.message || form.formState.errors.repeatPassword?.message;

  // Button state logic
  const isPasswordSubmitEnabled =
    !isPasswordLocked &&
    Boolean(form.watch("currentPassword")) &&
    !form.formState.errors.currentPassword &&
    !verifyPassword.isPending;

  const isNewPasswordSaveEnabled =
    isPasswordVerified &&
    Boolean(form.watch("newPassword")) &&
    Boolean(form.watch("repeatPassword")) &&
    !form.formState.errors.newPassword &&
    !form.formState.errors.repeatPassword &&
    !updatePassword.isPending;

  // Handle password verification
  const handlePasswordVerification = () => {
    const currentPassword = form.getValues("currentPassword");
    verifyPassword.mutate(
      { currentPassword },
      {
        onSuccess: (data) => {
          if (data?.success) {
            setIsPasswordVerified(true);
          }
        },
      }
    );
  };

  // Handle current password change to reset verification
  const handleCurrentPasswordChange = (value: string) => {
    if (isPasswordVerified) {
      setIsPasswordVerified(false);
    }
    return value;
  };

  // Handle password update
  const handlePasswordUpdate = () => {
    const { currentPassword, newPassword, repeatPassword } = form.getValues();
    updatePassword.mutate({
      currentPassword,
      newPassword,
      repeatPassword,
    });
  };

  // Handle lock/unlock with field reset
  const handlePasswordLockToggle = () => {
    if (!isPasswordLocked) {
      // If locking, reset password fields and verification state
      form.setValue("currentPassword", "");
      form.setValue("newPassword", "");
      form.setValue("repeatPassword", "");
      form.clearErrors("currentPassword");
      form.clearErrors("newPassword");
      form.clearErrors("repeatPassword");
      setIsPasswordVerified(false);
    }
    setIsPasswordLocked(!isPasswordLocked);
  };

  return {
    // Form state
    form,

    // Password change state
    isPasswordLocked,
    isPasswordVerified,
    isPasswordSubmitEnabled,
    isNewPasswordSaveEnabled,

    // Password visibility states
    showCurrentPassword,
    setShowCurrentPassword,
    showNewPassword,
    setShowNewPassword,
    showConfirmPassword,
    setShowConfirmPassword,

    // Error messages
    currentPasswordFieldsError,
    newPasswordFieldsError,

    // Password change mutations
    verifyPassword,
    updatePassword,

    // Password change handlers
    handlePasswordVerification,
    handleCurrentPasswordChange,
    handlePasswordUpdate,
    handlePasswordLockToggle,
  };
}
