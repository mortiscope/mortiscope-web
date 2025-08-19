"use client";

import { motion, type Variants } from "framer-motion";
import dynamic from "next/dynamic";
import { PiWarning } from "react-icons/pi";

import { AccountTabHeader } from "@/features/account/components/account-tab-header";
import { CredentialsUserDeletion } from "@/features/account/components/credentials-user-deletion";
import { SocialProviderUserDeletion } from "@/features/account/components/social-provider-user-deletion";
import { useAccountDeletion } from "@/features/account/hooks/use-account-deletion";

/**
 * Dynamically imported account deletion modal component.
 */
const AccountDeletionModal = dynamic(
  () =>
    import("@/features/account/components/account-deletion-modal").then(
      (module) => module.AccountDeletionModal
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
 * The deletion tab content component for the account settings page.
 * Smart container that coordinates deletion functionality for different user types.
 */
export const AccountDeletion = () => {
  const {
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
  } = useAccountDeletion();

  // Don't render anything until all data is ready
  if (!isDataReady) {
    return <div className="w-full" />;
  }

  return (
    <motion.div className="w-full" variants={contentVariants} initial="hidden" animate="show">
      {/* Deletion Header */}
      <AccountTabHeader
        title="Deletion"
        description="Permanently delete your account and all of its associated data."
      />

      {/* Deletion Form */}
      <motion.div variants={itemVariants} className="mt-8 space-y-4">
        <motion.div
          variants={itemVariants}
          className="flex items-start gap-3 rounded-lg border-2 border-rose-400 bg-rose-50 p-3"
        >
          <PiWarning className="h-5 w-5 flex-shrink-0 text-rose-500" />
          <p className="font-inter flex-1 text-sm text-rose-400">
            <strong className="font-semibold text-rose-500">Note:</strong> Actions here may result
            in irreversible data loss. Proceed with extreme caution.
          </p>
        </motion.div>

        {/* Deletion Components */}
        <motion.div variants={itemVariants}>
          {!isSocialProviderLoading &&
            (isSocialUser ? (
              <SocialProviderUserDeletion
                isDeleteLocked={isDeleteLocked}
                isDeleteEnabled={isDeleteEnabled}
                onDeleteAccount={() => setIsModalOpen(true)}
                onDeleteLockToggle={() => setIsDeleteLocked(!isDeleteLocked)}
              />
            ) : (
              <CredentialsUserDeletion
                form={form}
                isPasswordLocked={isPasswordLocked}
                showPassword={showPassword}
                isPasswordSubmitEnabled={isPasswordSubmitEnabled}
                isDeleteEnabled={isDeleteEnabled}
                verifyPasswordIsPending={verifyPassword.isPending}
                onPasswordLockToggle={handlePasswordLockToggle}
                onPasswordVerification={handlePasswordVerification}
                onPasswordChange={handlePasswordChange}
                onDeleteAccount={() => setIsModalOpen(true)}
                setShowPassword={setShowPassword}
              />
            ))}
        </motion.div>
      </motion.div>

      {/* Account Deletion Modal */}
      <AccountDeletionModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        verifiedPassword={
          isSocialUser ? "" : isPasswordVerified ? form.getValues("password") : undefined
        }
      />
    </motion.div>
  );
};

AccountDeletion.displayName = "AccountDeletion";
