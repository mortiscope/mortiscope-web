"use client";

import { motion, type Variants } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect } from "react";
import { toast } from "sonner";

import { Form } from "@/components/ui/form";
import { AccountTabHeader } from "@/features/account/components/account-tab-header";
import { EmailSection } from "@/features/account/components/email-section";
import { PasswordChangeSection } from "@/features/account/components/password-change-section";
import { PasswordVerificationSection } from "@/features/account/components/password-verification-section";
import { TwoFactorSection } from "@/features/account/components/two-factor-section";
import { useAccountSecurity } from "@/features/account/hooks/use-account-security";
import { useEmailField } from "@/features/account/hooks/use-email-field";
import { usePasswordChange } from "@/features/account/hooks/use-password-change";
import { useSocialProvider } from "@/features/account/hooks/use-social-provider";
import { useTwoFactorManagement } from "@/features/account/hooks/use-two-factor-management";

/**
 * Dynamically imported two-factor authentication modal component.
 */
const TwoFactorEnableModal = dynamic(
  () =>
    import("@/features/account/components/two-factor-enable-modal").then(
      (module) => module.TwoFactorEnableModal
    ),
  { ssr: false }
);

/**
 * Dynamically imported recovery codes modal component.
 */
const RecoveryCodesModal = dynamic(
  () =>
    import("@/features/account/components/recovery-codes-modal").then(
      (module) => module.RecoveryCodesModal
    ),
  { ssr: false }
);

/**
 * Dynamically imported two-factor disable modal component.
 */
const TwoFactorDisableModal = dynamic(
  () =>
    import("@/features/account/components/two-factor-disable-modal").then(
      (module) => module.TwoFactorDisableModal
    ),
  { ssr: false }
);

/**
 * Framer Motion variants for the main content container.
 */
const contentVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
      delayChildren: 0.1,
      staggerChildren: 0.1,
    },
  },
};

/**
 * Framer Motion variants for individual items.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring" as const,
      damping: 20,
      stiffness: 150,
    },
  },
};

/**
 * The security tab content component for the account settings page.
 */
export const AccountSecurity = () => {
  // General security data for error handling and coordination
  const { data: securityData, error, isLoading: isSecurityLoading } = useAccountSecurity();

  // Check if user is using social providers
  const { isSocialUser, isLoading: isSocialProviderLoading } = useSocialProvider();

  // Wait for all data to be ready before showing animations
  const isDataReady = !isSecurityLoading && !isSocialProviderLoading;

  // Show toast notification for errors
  useEffect(() => {
    if (error) {
      toast.error("Failed to load security data.", {
        className: "font-inter",
      });
    }
  }, [error]);

  // Use self-contained orchestrator hooks
  const emailField = useEmailField({ securityData });
  const passwordChange = usePasswordChange();
  const twoFactorManagement = useTwoFactorManagement({ securityData });

  // Don't render anything until all data is ready
  if (!isDataReady) {
    return <div className="w-full" />;
  }

  return (
    <motion.div className="w-full" variants={contentVariants} initial="hidden" animate="show">
      {/* Security Header */}
      <AccountTabHeader
        title="Security"
        description="Change your password or enable extra security measures."
      />

      {/* Security Form */}
      <motion.div variants={itemVariants}>
        <div className="mt-8 space-y-4">
          {/* Email and Password Verification Section */}
          <div>
            {!isSocialProviderLoading &&
              (isSocialUser ? (
                /* Email Field for Social Users - Full Width and Disabled */
                <Form {...emailField.form}>
                  <EmailSection
                    form={emailField.form}
                    isSocialUser={isSocialUser}
                    isSocialProviderLoading={isSocialProviderLoading}
                    isEmailLocked={emailField.isEmailLocked}
                    isEmailSaveEnabled={emailField.isEmailSaveEnabled}
                    updateEmailIsPending={emailField.updateEmail.isPending}
                    onEmailLockToggle={emailField.handleEmailLockToggle}
                    onEmailUpdate={emailField.handleEmailUpdate}
                  />
                </Form>
              ) : (
                /* Email and Current Password Side by Side for Regular Users */
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Form {...emailField.form}>
                    <EmailSection
                      form={emailField.form}
                      isSocialUser={isSocialUser}
                      isSocialProviderLoading={isSocialProviderLoading}
                      isEmailLocked={emailField.isEmailLocked}
                      isEmailSaveEnabled={emailField.isEmailSaveEnabled}
                      updateEmailIsPending={emailField.updateEmail.isPending}
                      onEmailLockToggle={emailField.handleEmailLockToggle}
                      onEmailUpdate={emailField.handleEmailUpdate}
                    />
                  </Form>

                  <Form {...passwordChange.form}>
                    <PasswordVerificationSection
                      form={passwordChange.form}
                      isPasswordLocked={passwordChange.isPasswordLocked}
                      isPasswordSubmitEnabled={passwordChange.isPasswordSubmitEnabled}
                      verifyPasswordIsPending={passwordChange.verifyPassword.isPending}
                      onPasswordLockToggle={passwordChange.handlePasswordLockToggle}
                      onPasswordVerification={passwordChange.handlePasswordVerification}
                      onCurrentPasswordChange={passwordChange.handleCurrentPasswordChange}
                    />
                  </Form>
                </div>
              ))}

            {/* Combined validation message for medium screens */}
            {!isSocialProviderLoading &&
              !isSocialUser &&
              passwordChange.currentPasswordFieldsError && (
                <div className="text-destructive font-inter mt-1 hidden text-xs md:block">
                  <p>{passwordChange.currentPasswordFieldsError}</p>
                </div>
              )}
          </div>

          {/* Password Change Section - Hidden for Social Users */}
          {!isSocialProviderLoading && !isSocialUser && (
            <Form {...passwordChange.form}>
              <PasswordChangeSection
                form={passwordChange.form}
                isPasswordVerified={passwordChange.isPasswordVerified}
                isNewPasswordSaveEnabled={passwordChange.isNewPasswordSaveEnabled}
                updatePasswordIsPending={passwordChange.updatePassword.isPending}
                newPasswordFieldsError={passwordChange.newPasswordFieldsError}
                onPasswordUpdate={passwordChange.handlePasswordUpdate}
              />
            </Form>
          )}

          {/* Two-Factor Authentication Section */}
          <TwoFactorSection
            isTwoFactorEnabled={twoFactorManagement.isTwoFactorEnabled}
            onTwoFactorToggle={twoFactorManagement.handleTwoFactorToggle}
            onRecoveryCodesClick={() => twoFactorManagement.setIsRecoveryCodesModalOpen(true)}
          />
        </div>
      </motion.div>

      {/* Two-Factor Authentication Modal */}
      <TwoFactorEnableModal
        isOpen={twoFactorManagement.isTwoFactorModalOpen}
        onOpenChange={twoFactorManagement.setIsTwoFactorModalOpen}
        onSuccess={twoFactorManagement.handleTwoFactorSuccess}
      />

      {/* Recovery Codes Modal */}
      <RecoveryCodesModal
        isOpen={twoFactorManagement.isRecoveryCodesModalOpen}
        onOpenChange={(open) => {
          twoFactorManagement.setIsRecoveryCodesModalOpen(open);
          if (!open) {
            twoFactorManagement.setInitialRecoveryCodes(undefined);
          }
        }}
        initialCodes={twoFactorManagement.initialRecoveryCodes}
      />

      {/* Two-Factor Disable Modal */}
      <TwoFactorDisableModal
        isOpen={twoFactorManagement.isTwoFactorDisableModalOpen}
        onOpenChange={(open) => {
          twoFactorManagement.setIsTwoFactorDisableModalOpen(open);
        }}
        onSuccess={twoFactorManagement.handleTwoFactorDisableSuccess}
      />
    </motion.div>
  );
};

AccountSecurity.displayName = "AccountSecurity";
