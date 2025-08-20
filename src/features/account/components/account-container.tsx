"use client";

import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";

import { AccountContent } from "@/features/account/components/account-content";
import { AccountNavigation } from "@/features/account/components/account-navigation";

/**
 * Framer Motion variants for the main container.
 */
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.15,
    },
  },
};

/**
 * Framer Motion variants for individual sections.
 */
const sectionVariants = {
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
 * The main container component for the account settings page.
 * Manages tab state and coordinates between navigation and content.
 */
export const AccountContainer = () => {
  const searchParams = useSearchParams();

  // Initialize active tab from URL search params
  const getInitialTab = () => {
    const tabFromUrl = searchParams.get("tab");
    const validTabs = ["profile", "security", "sessions", "deletion"];
    return tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : "profile";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Handle tab change with pure local state
  const handleTabChange = useCallback((newTab: string) => {
    setActiveTab(newTab);
  }, []);

  return (
    <motion.div
      className="flex w-full flex-col gap-6 lg:grid lg:grid-cols-4 lg:gap-x-16"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div
        className="lg:col-span-1 lg:-mx-6 lg:-mt-8 lg:-mb-8 lg:rounded-tl-3xl lg:rounded-bl-3xl lg:bg-emerald-50"
        variants={sectionVariants}
      >
        <AccountNavigation activeTab={activeTab} onTabChange={handleTabChange} />
      </motion.div>
      <motion.div className="lg:col-span-3" variants={sectionVariants}>
        <AccountContent activeTab={activeTab} />
      </motion.div>
    </motion.div>
  );
};

AccountContainer.displayName = "AccountContainer";
