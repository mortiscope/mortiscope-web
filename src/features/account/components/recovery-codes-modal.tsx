"use client";

import { motion } from "framer-motion";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AccountModalFooter } from "@/features/account/components/account-modal-footer";
import { AccountModalHeader } from "@/features/account/components/account-modal-header";
import { RecoveryCodeActions } from "@/features/account/components/recovery-code-actions";
import { RecoveryCodeGrid } from "@/features/account/components/recovery-code-grid";
import { useRecoveryCodes } from "@/features/account/hooks/use-recovery-codes";

/**
 * Framer Motion variants for the main modal content container.
 */
const modalContentVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.2 } },
};

/**
 * Framer Motion variants for individual items.
 */
const itemVariants = {
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
 * Props for the RecoveryCodesModal component.
 */
interface RecoveryCodesModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to handle modal open state changes */
  onOpenChange: (isOpen: boolean) => void;
  /** Optional initial recovery codes (from 2FA setup) */
  initialCodes?: string[];
}

/**
 * A smart modal component for displaying and managing two-factor authentication recovery codes.
 * It handles two primary modes: displaying newly generated codes during setup, and showing the
 * status of existing codes. It orchestrates server actions for fetching and regenerating codes.
 */
export const RecoveryCodesModal = ({
  isOpen,
  onOpenChange,
  initialCodes,
}: RecoveryCodesModalProps) => {
  // Use the custom hook to manage recovery codes state and actions
  const {
    displayCodes,
    isLoading,
    canCopy,
    canDownload,
    hasVisibleCodes,
    handleCopy,
    handleDownload,
    handleRegenerate,
  } = useRecoveryCodes(isOpen, initialCodes);

  /**
   * A wrapper for the `onOpenChange` callback that handles modal closing.
   */
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="flex h-full max-h-[85vh] flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-lg md:h-auto md:rounded-3xl">
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          {/* Header Section */}
          <AccountModalHeader
            title="Recovery Codes"
            description={
              /* Dynamically changes the description based on whether codes are visible. */
              initialCodes || hasVisibleCodes
                ? "Save these recovery codes in a safe place. Each code can only be used once to access your account if you lose your authenticator device."
                : "For security, recovery codes can only be viewed when first generated or regenerated."
            }
            variant="emerald"
          />

          {/* Main Content: Codes Grid and Actions */}
          <motion.div
            variants={itemVariants}
            className="flex-1 overflow-y-auto border-y border-slate-200 p-6"
          >
            <RecoveryCodeGrid displayCodes={displayCodes} isLoading={isLoading} />

            {/* Action Buttons: Copy, Download, Regenerate */}
            <RecoveryCodeActions
              canCopy={canCopy}
              canDownload={canDownload}
              isLoading={isLoading}
              onCopy={handleCopy}
              onDownload={handleDownload}
              onRegenerate={handleRegenerate}
            />
          </motion.div>

          {/* Footer Section with main actions. */}
          <AccountModalFooter
            isPending={false}
            onCancel={handleClose}
            onAction={handleClose}
            actionButtonText="Finish"
            cancelButtonText="Cancel"
            disabled={false}
            variant="emerald"
            showSpinner={false}
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

RecoveryCodesModal.displayName = "RecoveryCodesModal";
