"use client";

import { motion, type Variants } from "framer-motion";
import { useState } from "react";
import { GoClock, GoGear, GoGlobe } from "react-icons/go";
import { IoCalendarClearOutline, IoLocationOutline } from "react-icons/io5";
import { PiDeviceTabletLight, PiMapPinSimpleAreaLight } from "react-icons/pi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserSessionInfo } from "@/features/account/actions/get-user-sessions";
import { revokeSession } from "@/features/account/actions/revoke-session";
import { cn } from "@/lib/utils";

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
 * A utility function to format a date into a full, readable string.
 * @param date The date object to format.
 * @returns A formatted date and time string.
 */
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * A utility function to format a date into a user-friendly relative time string.
 * It falls back to the full date format for older dates.
 * @param date The date object to format.
 * @returns A formatted relative time string.
 */
const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;

  // For dates older than 30 days, show the full date.
  return formatDate(date);
};

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
  /** A local state to track the pending state of the sign-out action. */
  const [isSigningOut, setIsSigningOut] = useState(false);

  /**
   * A wrapper for `onOpenChange` that ensures the signing out state is reset when the modal is closed.
   */
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setIsSigningOut(false);
    }
    onOpenChange(open);
  };

  /** A derived boolean to determine if the session being viewed is the current user's active session. */
  const isCurrentSession = currentSessionToken === session?.sessionToken;

  /**
   * Handles the sign out action by calling the revoke session server action.
   * It manages the pending state and provides user feedback via toasts.
   */
  const handleSignOut = async () => {
    // Prevent revoking the current session from this modal.
    if (!session || isCurrentSession) return;

    setIsSigningOut(true);

    try {
      // Call the server action to revoke the session.
      const result = await revokeSession(session.id, userId);

      if (result.success) {
        toast.success("Session revoked successfully.", {
          className: "font-inter",
        });

        // Close the modal and notify the parent component of the success.
        handleOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to revoke session.", {
          className: "font-inter",
        });
        setIsSigningOut(false);
      }
    } catch {
      toast.error("An unexpected error occurred.", {
        className: "font-inter",
      });
      setIsSigningOut(false);
    }
  };

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
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-6">
            <DialogHeader>
              <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-emerald-600 md:text-2xl">
                Session Details
              </DialogTitle>
              <DialogDescription className="font-inter pt-2 text-center text-sm text-slate-600">
                View detailed information about this session and manage access.
              </DialogDescription>
            </DialogHeader>
          </motion.div>

          {/* Session Information List */}
          <motion.div
            variants={itemVariants}
            className="flex-1 overflow-y-auto border-y border-slate-200 px-6 py-4"
          >
            <div className="space-y-4">
              {/* Browser */}
              <div className="flex items-center gap-3">
                <GoGlobe className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                <div className="flex-1">
                  <span className="font-inter text-sm text-slate-600">
                    <span className="font-medium text-slate-700">Browser:</span> {session.browser}
                  </span>
                </div>
              </div>

              {/* Operating System */}
              <div className="flex items-center gap-3">
                <GoGear className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                <div className="flex-1">
                  <span className="font-inter text-sm text-slate-600">
                    <span className="font-medium text-slate-700">Operating System:</span>{" "}
                    {session.operatingSystem}
                  </span>
                </div>
              </div>

              {/* Device */}
              <div className="flex items-center gap-3">
                <PiDeviceTabletLight className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                <div className="flex-1">
                  <span className="font-inter text-sm text-slate-600">
                    <span className="font-medium text-slate-700">Device:</span> {session.device}
                  </span>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-3">
                <IoLocationOutline className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                <div className="flex-1">
                  <span className="font-inter text-sm text-slate-600">
                    <span className="font-medium text-slate-700">Location:</span> {session.location}
                  </span>
                </div>
              </div>

              {/* IP Address */}
              <div className="flex items-center gap-3">
                <PiMapPinSimpleAreaLight className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                <div className="flex-1">
                  <span className="font-inter text-sm text-slate-600">
                    <span className="font-medium text-slate-700">IP Address:</span>{" "}
                    <span className="font-mono">{session.ipAddress}</span>
                  </span>
                </div>
              </div>

              {/* Date Added */}
              <div className="flex items-center gap-3">
                <IoCalendarClearOutline className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                <div className="flex-1">
                  <span className="font-inter text-sm text-slate-600">
                    <span className="font-medium text-slate-700">Date Added:</span>{" "}
                    {formatDate(session.dateAdded)}
                  </span>
                </div>
              </div>

              {/* Last Active */}
              <div className="flex items-center gap-3">
                <GoClock className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                <div className="flex-1">
                  <span className="font-inter text-sm text-slate-600">
                    <span className="font-medium text-slate-700">Last Active:</span>{" "}
                    {formatRelativeTime(session.lastActive)}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Footer/Actions Section */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-2 pb-6">
            <DialogFooter className="flex w-full flex-row gap-3">
              <div className="flex-1">
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  className="font-inter h-10 w-full cursor-pointer overflow-hidden uppercase transition-all duration-300 ease-in-out hover:bg-slate-100"
                  disabled={isSigningOut}
                >
                  Close
                </Button>
              </div>
              <div
                className={cn("flex-1", (isCurrentSession || isSigningOut) && "cursor-not-allowed")}
              >
                <Button
                  onClick={handleSignOut}
                  disabled={isSigningOut || isCurrentSession}
                  className={cn(
                    "font-inter h-10 w-full overflow-hidden uppercase transition-all duration-300 ease-in-out",
                    isCurrentSession
                      ? "cursor-not-allowed bg-emerald-400 text-white opacity-50"
                      : isSigningOut
                        ? "cursor-not-allowed bg-emerald-600 text-white opacity-75"
                        : "cursor-pointer bg-emerald-600 text-white hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20"
                  )}
                >
                  {isSigningOut ? "Signing out..." : "Sign Out"}
                </Button>
              </div>
            </DialogFooter>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

AccountSessionModal.displayName = "AccountSessionModal";
