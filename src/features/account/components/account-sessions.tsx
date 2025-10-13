"use client";

import { motion, type Variants } from "framer-motion";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useState } from "react";

import type { UserSessionInfo } from "@/features/account/actions/get-current-session";
import { AccountTabHeader } from "@/features/account/components/account-tab-header";
import { SessionList } from "@/features/account/components/session-list";
import { SignOutAllButton } from "@/features/account/components/sign-out-all-button";
import { useSessionToken } from "@/features/account/hooks/use-session";
import { useUserSessions } from "@/features/account/hooks/use-user-sessions";

/**
 * Dynamically imported account all sessions modal component.
 */
const AccountAllSessionsModal = dynamic(
  () =>
    import("@/features/account/components/account-all-sessions-modal").then((module) => ({
      default: module.AccountAllSessionsModal,
    })),
  { ssr: false }
);

/**
 * Dynamically imported account session modal component.
 */
const AccountSessionModal = dynamic(
  () =>
    import("@/features/account/components/account-session-modal").then((module) => ({
      default: module.AccountSessionModal,
    })),
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
 * The smart container component for the sessions tab in the account settings page.
 * It orchestrates data fetching, state management for modals, and coordinates focused components.
 */
export const AccountSessions = () => {
  const { data: session, status: sessionStatus } = useSession();
  // A custom hook to get the raw session token for the current device.
  const currentSessionToken = useSessionToken();
  // A custom hook to fetch and manage the list of all user sessions.
  const { sessions, isLoading, refetch } = useUserSessions(session?.user?.id || "");

  // Type assertion for the fetched sessions data.
  const typedSessions = (sessions as UserSessionInfo[]) || [];

  // A derived boolean to determine when all necessary data has finished loading.
  const isDataReady = !isLoading && sessionStatus !== "loading" && !!session?.user?.id;

  // Local state to control the visibility of the "Sign Out All" modal.
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Local state to hold the data for the session being viewed in the single-session modal.
  const [selectedSession, setSelectedSession] = useState<UserSessionInfo | null>(null);
  // Local state to control the visibility of the single-session detail modal.
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

  /** Opens the "Sign Out All" confirmation modal. */
  const handleSignOutAllDevices = () => {
    setIsModalOpen(true);
  };

  /** A callback function passed to modals, which refetches the session list upon a successful action. */
  const handleModalSuccess = () => {
    void refetch();
  };

  /** Opens the single-session detail modal and sets the context for the selected session. */
  const handleSessionClick = (sessionItem: UserSessionInfo) => {
    setSelectedSession(sessionItem);
    setIsSessionModalOpen(true);
  };

  /** A callback for the single-session modal that refetches data and resets state on success. */
  const handleSessionModalSuccess = () => {
    void refetch();
    setIsSessionModalOpen(false);
    setSelectedSession(null);
  };

  // If data is not yet ready, render an empty div to prevent content flashing.
  if (!isDataReady) {
    return <div className="w-full" />;
  }

  return (
    // The main animated container for the entire tab content.
    <motion.div className="w-full" variants={contentVariants} initial="hidden" animate="show">
      {/* Header Section */}
      <motion.div variants={itemVariants} className="mb-6">
        <AccountTabHeader
          title="Sessions"
          description="Review all active logins on your devices and browsers."
        />
      </motion.div>

      {/* Sign Out All Button Section */}
      <motion.div variants={itemVariants} className="mb-6 flex justify-end">
        <SignOutAllButton
          sessionsCount={typedSessions.length}
          userId={session?.user?.id}
          onSignOutAllDevices={handleSignOutAllDevices}
        />
      </motion.div>

      {/* Sessions Grid Section */}
      <motion.div variants={itemVariants}>
        <SessionList
          sessions={typedSessions}
          currentSessionToken={currentSessionToken}
          onSessionClick={handleSessionClick}
        />
      </motion.div>

      {/* Conditionally rendered modals, lazy-loaded for performance. */}
      <AccountAllSessionsModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        userId={session!.user!.id!}
        currentSessionToken={currentSessionToken || undefined}
        onSuccess={handleModalSuccess}
      />

      <AccountSessionModal
        isOpen={isSessionModalOpen}
        onOpenChange={setIsSessionModalOpen}
        session={selectedSession}
        userId={session!.user!.id!}
        currentSessionToken={currentSessionToken || undefined}
        onSuccess={handleSessionModalSuccess}
      />
    </motion.div>
  );
};

AccountSessions.displayName = "AccountSessions";
