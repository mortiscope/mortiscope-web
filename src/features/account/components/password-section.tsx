import type { UseFormReturn } from "react-hook-form";

import { PasswordChangeSection } from "@/features/account/components/password-change-section";
import { PasswordVerificationSection } from "@/features/account/components/password-verification-section";

interface PasswordSectionProps {
  form: UseFormReturn<{ currentPassword: string; newPassword: string; repeatPassword: string }>;
  isSocialUser: boolean;
  isSocialProviderLoading: boolean;
  isPasswordLocked: boolean;
  isPasswordVerified: boolean;
  isPasswordSubmitEnabled: boolean;
  isNewPasswordSaveEnabled: boolean;
  verifyPasswordIsPending: boolean;
  updatePasswordIsPending: boolean;
  newPasswordFieldsError?: string;
  onPasswordLockToggle: () => void;
  onPasswordVerification: () => void;
  onPasswordUpdate: () => void;
  onCurrentPasswordChange: (value: string) => string;
}

/**
 * Password section orchestrator component.
 * Coordinates password verification and new password setting sections.
 */
export const PasswordSection = ({
  form,
  isSocialUser,
  isSocialProviderLoading,
  isPasswordLocked,
  isPasswordVerified,
  isPasswordSubmitEnabled,
  isNewPasswordSaveEnabled,
  verifyPasswordIsPending,
  updatePasswordIsPending,
  newPasswordFieldsError,
  onPasswordLockToggle,
  onPasswordVerification,
  onPasswordUpdate,
  onCurrentPasswordChange,
}: PasswordSectionProps) => {
  if (isSocialProviderLoading || isSocialUser) return null;

  return (
    <>
      {/* Password Verification Section */}
      <PasswordVerificationSection
        form={form}
        isPasswordLocked={isPasswordLocked}
        isPasswordSubmitEnabled={isPasswordSubmitEnabled}
        verifyPasswordIsPending={verifyPasswordIsPending}
        onPasswordLockToggle={onPasswordLockToggle}
        onPasswordVerification={onPasswordVerification}
        onCurrentPasswordChange={onCurrentPasswordChange}
      />

      {/* Password Change Section */}
      <PasswordChangeSection
        form={form}
        isPasswordVerified={isPasswordVerified}
        isNewPasswordSaveEnabled={isNewPasswordSaveEnabled}
        updatePasswordIsPending={updatePasswordIsPending}
        newPasswordFieldsError={newPasswordFieldsError}
        onPasswordUpdate={onPasswordUpdate}
      />
    </>
  );
};

PasswordSection.displayName = "PasswordSection";
