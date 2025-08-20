"use client";

import { motion, type Variants } from "framer-motion";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { UserSessionInfo } from "@/features/account/actions/get-current-session";
import { AccountModalFooter } from "@/features/account/components/account-modal-footer";
import { AccountModalHeader } from "@/features/account/components/account-modal-header";
import { SessionDetailsList } from "@/features/account/components/session-details-list";
import { useRevokeSession } from "@/features/account/hooks/use-revoke-session";

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
 * Defines the props for the account session modal component.
 */
interface AccountSessionModalProps {
  /** A boolean to control the visibility of the modal. */
  isOpen: boolean;
  /** A callback function to handle changes to the modal's open state. */
  onOpenChange: (isOpen: boolean) => void;
  /** The session information object to be displayed in the modal. Can be null if no session is selected. */
  session: UserSessionInfo | null;
  /** The unique ID of the currently logged-in user. */
  userId: string;
  /** The session token of the current device, used to identify the current session. */
  currentSessionToken?: string;
  /** An optional callback function invoked after a session is successfully revoked. */
  onSuccess?: () => void;
}

/**
 * A smart modal component for viewing detailed information about a specific user session
 * and providing an action to revoke (sign out) that session.
 */
export const AccountSessionModal = ({
  isOpen,
  onOpenChange,
  session,
  userId,
  currentSessionToken,
  onSuccess,
}: AccountSessionModalProps) => {
  /**
   * A wrapper for `onOpenChange` that ensures the signing out state is reset when the modal is closed.
   */
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetState();
    }
    onOpenChange(open);
  };

  // Use the custom hook to manage session revocation
  const { isSigningOut, handleSignOut, resetState } = useRevokeSession(
    userId,
    currentSessionToken,
    onSuccess,
    () => handleOpenChange(false)
  );

  /** A derived boolean to determine if the session being viewed is the current user's active session. */
  const isCurrentSession = currentSessionToken === session?.sessionToken;

  // If no session data is provided, the modal renders nothing.
  if (!session) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:rounded-3xl">
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          {/* Header Section */}
          <AccountModalHeader
            title="Session Details"
            description="View detailed information about this session and manage access."
            variant="emerald"
          />

          {/* Session Information List */}
          <motion.div
            variants={itemVariants}
            className="flex-1 overflow-y-auto border-y border-slate-200 px-6 py-4"
          >
            <SessionDetailsList session={session} />
          </motion.div>

          {/* Footer/Actions Section */}
          <AccountModalFooter
            isPending={isSigningOut}
            onCancel={() => handleOpenChange(false)}
            onAction={() => handleSignOut(session)}
            actionButtonText="Sign Out"
            cancelButtonText="Close"
            pendingButtonText="Signing out..."
            disabled={isCurrentSession}
            variant="emerald"
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

AccountSessionModal.displayName = "AccountSessionModal";
