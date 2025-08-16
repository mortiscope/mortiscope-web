"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { memo } from "react";

/**
 * Framer Motion variants for tab content transitions.
 */
const tabContentVariants = {
  hidden: {
    opacity: 0,
    y: 10,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      damping: 25,
      stiffness: 200,
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.98,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * A map of dynamically imported tab components.
 */
const TabComponents = {
  profile: dynamic(
    () =>
      import("@/features/account/components/account-profile").then(
        (module) => module.AccountProfile
      ),
    { ssr: false }
  ),
  security: dynamic(
    () =>
      import("@/features/account/components/account-security").then(
        (module) => module.AccountSecurity
      ),
    { ssr: false }
  ),
  sessions: dynamic(
    () =>
      import("@/features/account/components/account-sessions").then(
        (module) => module.AccountSessions
      ),
    { ssr: false }
  ),
  deletion: dynamic(
    () =>
      import("@/features/account/components/account-deletion").then(
        (module) => module.AccountDeletion
      ),
    { ssr: false }
  ),
};

/**
 * Defines the props for the account content component.
 */
interface AccountContentProps {
  /** The currently active tab's value. */
  activeTab: string;
}

/**
 * A memoized content display component for the account settings page.
 * It renders the forms and information corresponding to the selected tab with lazy loading.
 */
export const AccountContent = memo(({ activeTab }: AccountContentProps) => {
  // Dynamically selects the correct, lazily-loaded tab component from the map.
  const SelectedTabComponent = TabComponents[activeTab as keyof typeof TabComponents];

  if (!SelectedTabComponent) {
    return null;
  }

  return (
    <div className="w-full">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          variants={tabContentVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="w-full"
        >
          <SelectedTabComponent />
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

AccountContent.displayName = "AccountContent";
