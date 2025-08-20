"use client";

import { motion, type Variants } from "framer-motion";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AccountModalFooter } from "@/features/account/components/account-modal-footer";
import { AccountModalHeader } from "@/features/account/components/account-modal-header";
import { SignOutAllForm } from "@/features/account/components/sign-out-all-form";
import { useSignOutAllSessions } from "@/features/account/hooks/use-sign-out-all-sessions";

/**
 * Framer Motion variants for the main modal content container.
 */
const modalContentVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.2 } },
};

/**
 * Framer Motion variants for individual animated items in the modal.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring" as const, damping: 20, stiffness: 150 } },
};

/**
 * Defines the props for the account all sessions modal component.
 */
interface AccountAllSessionsModalProps {
  /** A boolean to control the visibility of the modal. */
  isOpen: boolean;
  /** A callback function to handle changes to the modal's open state. */
  onOpenChange: (isOpen: boolean) => void;
  /** The unique ID of the user whose sessions will be revoked. */
  userId: string;
  /** The optional session token of the current device, used to exclude it from revocation. */
  currentSessionToken?: string;
  /** An optional callback function invoked after a successful "sign out other devices" operation. */
  onSuccess?: () => void;
}

/**
 * A smart modal component that provides a secure way for users to sign out of all their active sessions.
 * It requires password re-authentication and orchestrates multiple server actions to complete the process.
 */
export const AccountAllSessionsModal = ({
  isOpen,
  onOpenChange,
  userId,
  currentSessionToken,
  onSuccess,
}: AccountAllSessionsModalProps) => {
  /**
   * A wrapper for `onOpenChange` that ensures all local form state is reset when the modal is closed.
   */
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  // Use the custom hook to manage sign-out functionality
  const { form, isSigningOut, isFormValid, handleSubmit, resetForm } = useSignOutAllSessions(
    userId,
    currentSessionToken,
    onSuccess,
    () => handleOpenChange(false)
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:rounded-3xl">
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          {/* Header Section */}
          <AccountModalHeader
            title="Sign Out All Devices"
            description="Revoke access to your account from all the available devices."
            variant="rose"
          />

          {/* Form Content Section */}
          <motion.div variants={itemVariants} className="px-6 py-0">
            <SignOutAllForm form={form} isSigningOut={isSigningOut} onSubmit={handleSubmit} />
          </motion.div>

          {/* Footer/Actions Section */}
          <AccountModalFooter
            isPending={isSigningOut}
            onCancel={() => handleOpenChange(false)}
            onAction={form.handleSubmit(handleSubmit)}
            actionButtonText="Sign Out"
            pendingButtonText="Signing out..."
            disabled={!isFormValid}
            variant="rose"
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

AccountAllSessionsModal.displayName = "AccountAllSessionsModal";
