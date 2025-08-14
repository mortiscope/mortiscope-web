"use client";

import { motion, type Variants } from "framer-motion";

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
 * The sessions tab content component for the account settings page.
 */
export const AccountSessions = () => {
  return (
    <motion.div className="w-full" variants={contentVariants} initial="hidden" animate="show">
      {/* Sessions Header */}
      <motion.div variants={itemVariants} className="text-center lg:text-left">
        <h1 className="font-plus-jakarta-sans text-2xl font-semibold text-slate-800 uppercase md:text-3xl">
          Sessions
        </h1>
        <p className="font-inter mt-2 text-sm text-slate-600">
          Review all active logins on your devices and browsers.
        </p>
      </motion.div>
    </motion.div>
  );
};

AccountSessions.displayName = "AccountSessions";
