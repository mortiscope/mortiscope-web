"use client";

import { useEffect, useState } from "react";

import { useAccountSecurity } from "@/features/account/hooks/use-account-security";

interface UseTwoFactorManagementProps {
  securityData?: {
    twoFactorEnabled?: boolean;
  } | null;
}

/**
 * A custom hook that manages two-factor authentication state and operations.
 * @param props Configuration object containing security data
 * @returns An object containing 2FA state, handlers, and computed values.
 */
export function useTwoFactorManagement({ securityData }: UseTwoFactorManagementProps = {}) {
  const [isTwoFactorEnabled, setIsTwoFactorEnabled] = useState(false);
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false);
  const [isTwoFactorDisableModalOpen, setIsTwoFactorDisableModalOpen] = useState(false);
  const [isRecoveryCodesModalOpen, setIsRecoveryCodesModalOpen] = useState(false);
  const [initialRecoveryCodes, setInitialRecoveryCodes] = useState<string[]>();

  // Get refetch function for updating data after changes
  const { refetch } = useAccountSecurity();

  // Update 2FA status when security data is loaded
  useEffect(() => {
    if (securityData) {
      setIsTwoFactorEnabled(securityData.twoFactorEnabled || false);
    }
  }, [securityData]);

  // Handle two-factor authentication toggle
  const handleTwoFactorToggle = (checked: boolean) => {
    if (checked && !isTwoFactorEnabled) {
      // If enabling 2FA, open the setup modal
      setIsTwoFactorModalOpen(true);
    } else if (!checked && isTwoFactorEnabled) {
      // If disabling 2FA, open the disable modal for password confirmation
      setIsTwoFactorDisableModalOpen(true);
    }
  };

  // Handle successful two-factor setup
  const handleTwoFactorSuccess = (recoveryCodes?: string[]) => {
    setIsTwoFactorEnabled(true);
    // Store recovery codes
    if (recoveryCodes) {
      setInitialRecoveryCodes(recoveryCodes);
    }
  };

  // Handle successful two-factor disable
  const handleTwoFactorDisableSuccess = () => {
    setIsTwoFactorEnabled(false);
    // Refetch security data to update the UI
    refetch();
  };

  return {
    // Two-factor states
    isTwoFactorEnabled,
    isTwoFactorModalOpen,
    setIsTwoFactorModalOpen,
    isTwoFactorDisableModalOpen,
    setIsTwoFactorDisableModalOpen,
    isRecoveryCodesModalOpen,
    setIsRecoveryCodesModalOpen,
    initialRecoveryCodes,
    setInitialRecoveryCodes,

    // Two-factor handlers
    handleTwoFactorToggle,
    handleTwoFactorSuccess,
    handleTwoFactorDisableSuccess,
  };
}
