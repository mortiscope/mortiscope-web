"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { useFormChange } from "@/features/account/hooks/use-form-change";
import { useUpdateEmail } from "@/features/account/hooks/use-update-email";
import type { AccountSecurityFormValues } from "@/features/account/schemas/account";

interface UseEmailFieldProps {
  securityData?: {
    email?: string | null;
  } | null;
}

/**
 * A self-contained orchestrator hook that manages email field functionality.
 * Handles its own form state and email operations.
 * @param props Configuration object containing security data
 * @returns An object containing email field state, form, handlers, and computed values.
 */
export function useEmailField({ securityData }: UseEmailFieldProps = {}) {
  const [isEmailLocked, setIsEmailLocked] = useState(true);
  const [initialValues, setInitialValues] = useState<Pick<
    AccountSecurityFormValues,
    "email"
  > | null>(null);

  // Email-specific form
  const form = useForm<Pick<AccountSecurityFormValues, "email">>({
    defaultValues: {
      email: "",
    },
    mode: "onChange",
  });

  // Update form when security data is loaded
  useEffect(() => {
    if (securityData) {
      const emailData = {
        email: securityData.email || "",
      };
      form.reset(emailData);
      setInitialValues(emailData);
    }
  }, [securityData, form]);

  // Form change detection
  const { isFieldChanged } = useFormChange(form, initialValues);

  // Email mutation
  const { updateEmail } = useUpdateEmail();

  // Button state logic
  const isEmailSaveEnabled =
    !isEmailLocked &&
    isFieldChanged("email") &&
    !form.formState.errors.email &&
    !updateEmail.isPending;

  // Handle email update
  const handleEmailUpdate = () => {
    const { email } = form.getValues();
    updateEmail.mutate({
      email,
      currentPassword: "",
    });
  };

  // Handle lock/unlock with field reset
  const handleEmailLockToggle = () => {
    if (!isEmailLocked) {
      // If locking, reset to original value
      if (initialValues) {
        form.setValue("email", initialValues.email);
        form.clearErrors("email");
      }
    }
    setIsEmailLocked(!isEmailLocked);
  };

  return {
    // Form state
    form,

    // Email field state
    isEmailLocked,
    isEmailSaveEnabled,

    // Email field mutations
    updateEmail,

    // Email field handlers
    handleEmailUpdate,
    handleEmailLockToggle,
  };
}
