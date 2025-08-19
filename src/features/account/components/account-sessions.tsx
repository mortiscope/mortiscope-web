"use client";

import { motion, type Variants } from "framer-motion";
import dynamic from "next/dynamic";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { GoGear, GoGlobe } from "react-icons/go";
import { IoCheckmarkCircleOutline, IoCloseCircleOutline, IoLocationOutline } from "react-icons/io5";
import { PiDeviceTabletLight } from "react-icons/pi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserSessionInfo } from "@/features/account/actions/get-current-session";
import { AccountTabHeader } from "@/features/account/components/account-tab-header";
import { useSessionToken } from "@/features/account/hooks/use-session";
import { useUserSessions } from "@/features/account/hooks/use-user-sessions";
import { cn } from "@/lib/utils";

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
 * A utility function to extract just the browser name from a full browser string.
 * @param browser The full browser string.
 * @returns The extracted browser name.
 */
const getBrowserName = (browser: string): string => {
  return browser.replace(/\s+[\d.]+.*$/, "").trim() || browser;
};

/**
 * A utility function to shorten a full location string to just "City, Province".
 * @param location The full location string.
 * @returns A shortened location string.
 */
const getCityProvince = (location: string): string => {
  if (location === "Unknown Location") return "Unknown Location";
  const parts = location.split(", ");
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1]}`;
  }
  return location;
};

/**
 * The smart container component for the sessions tab in the account settings page.
 * It orchestrates data fetching, state management for modals, and renders the list of active user sessions.
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

      {/* "Sign Out All" Button Section */}
      <motion.div variants={itemVariants} className="mb-6 flex justify-end">
        <div className={cn("w-full md:w-auto", typedSessions.length <= 1 && "cursor-not-allowed")}>
          <Button
            onClick={handleSignOutAllDevices}
            disabled={!session?.user?.id || typedSessions.length <= 1}
            className={cn(
              "font-inter h-10 w-full rounded-lg font-normal text-white transition-all duration-300 ease-in-out",
              // Applies disabled styling based on the number of sessions.
              typedSessions.length > 1 && session?.user?.id
                ? "cursor-pointer bg-rose-600 hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/20"
                : "cursor-not-allowed bg-rose-400 opacity-50"
            )}
          >
            Sign out of all devices
          </Button>
        </div>
      </motion.div>

      {/* Sessions Grid Section */}
      <motion.div
        variants={itemVariants}
        key={typedSessions.length}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.8,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-3"
      >
        {typedSessions.map((sessionItem: UserSessionInfo) => {
          // A derived boolean to identify the current device's session.
          const isCurrentSession = currentSessionToken === sessionItem.sessionToken;

          return (
            <div
              key={sessionItem.id}
              onClick={() => handleSessionClick(sessionItem)}
              className={`group relative flex h-full cursor-pointer flex-col rounded-xl border-2 bg-white p-4 transition-all duration-200 ${
                isCurrentSession
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-200 hover:border-emerald-300"
              }`}
            >
              {isCurrentSession && (
                <Badge className="font-inter absolute -top-2 -right-2 rounded-md bg-emerald-500 text-xs font-normal text-white hover:bg-emerald-500">
                  Current
                </Badge>
              )}

              {/* Session Info Section */}
              <div className="flex-1 space-y-3">
                {/* Browser */}
                <div className="flex items-center gap-2">
                  <GoGlobe className="h-4 w-4 text-emerald-600" />
                  <span className="font-inter text-sm font-normal text-slate-800">
                    {getBrowserName(sessionItem.browser)}
                  </span>
                </div>

                {/* Device */}
                <div className="flex items-center gap-2">
                  <PiDeviceTabletLight className="h-4 w-4 text-emerald-600" />
                  <span className="font-inter text-sm font-normal text-slate-600">
                    {sessionItem.device}
                  </span>
                </div>

                {/* Operating System */}
                <div className="flex items-center gap-2">
                  <GoGear className="h-4 w-4 text-emerald-600" />
                  <span className="font-inter text-sm font-normal text-slate-600">
                    {sessionItem.operatingSystem}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2">
                  <IoLocationOutline className="h-4 w-4 text-emerald-600" />
                  <span className="font-inter text-sm font-normal text-slate-600">
                    {getCityProvince(sessionItem.location)}
                  </span>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  {sessionItem.isActiveNow ? (
                    <IoCheckmarkCircleOutline className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <IoCloseCircleOutline className="h-4 w-4 text-emerald-600" />
                  )}
                  <span className="font-inter text-sm font-normal text-slate-600">
                    {sessionItem.isActiveNow ? "Active now" : "Inactive"}
                  </span>
                </div>
              </div>

              {/* Review Button */}
              <div className="mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  className={`font-inter w-full border-2 font-normal group-hover:border-emerald-300 group-hover:bg-emerald-50 group-hover:text-emerald-700 hover:cursor-pointer hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 ${
                    isCurrentSession
                      ? "border-emerald-500 text-emerald-700"
                      : "border-slate-200 text-slate-600"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSessionClick(sessionItem);
                  }}
                >
                  Review
                </Button>
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Conditionally rendered modals, lazy-loaded for performance. */}
      <AccountAllSessionsModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        userId={session?.user?.id || ""}
        currentSessionToken={currentSessionToken || undefined}
        onSuccess={handleModalSuccess}
      />

      <AccountSessionModal
        isOpen={isSessionModalOpen}
        onOpenChange={setIsSessionModalOpen}
        session={selectedSession}
        userId={session?.user?.id || ""}
        currentSessionToken={currentSessionToken || undefined}
        onSuccess={handleSessionModalSuccess}
      />
    </motion.div>
  );
};

AccountSessions.displayName = "AccountSessions";
