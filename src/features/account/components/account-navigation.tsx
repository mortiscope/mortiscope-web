"use client";

import { motion } from "framer-motion";
import { memo } from "react";
import { GoShieldCheck } from "react-icons/go";
import { HiOutlineUserCircle } from "react-icons/hi2";
import { IoTrashBinOutline } from "react-icons/io5";
import { PiDevices } from "react-icons/pi";

import { cn } from "@/lib/utils";

/**
 * Defines the props for the account navigation component.
 */
interface AccountNavigationProps {
  /** The currently active tab's value. */
  activeTab: string;
  /** A callback function to handle tab changes. */
  onTabChange: (value: string) => void;
}

/**
 * A list of tab configurations to be rendered.
 */
const TABS = [
  { value: "profile", label: "Profile", icon: HiOutlineUserCircle },
  { value: "security", label: "Security", icon: GoShieldCheck },
  { value: "sessions", label: "Sessions", icon: PiDevices },
  { value: "deletion", label: "Deletion", icon: IoTrashBinOutline },
];

/**
 * The navigation component for the account settings page.
 * It serves as the container for the different account settings tabs.
 */
export const AccountNavigation = memo(({ activeTab, onTabChange }: AccountNavigationProps) => {
  return (
    <div className="w-full">
      <div className="font-inter grid h-12 w-full grid-cols-4 rounded-none bg-transparent p-1.5 md:h-14 md:rounded-xl md:bg-emerald-600 md:p-2 lg:flex lg:h-auto lg:flex-col lg:gap-2 lg:bg-transparent lg:p-0">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onTabChange(tab.value)}
            className={cn(
              "relative cursor-pointer py-3 text-emerald-700 md:py-0 md:text-white lg:w-full lg:justify-start lg:rounded-lg lg:px-4 lg:py-3 lg:text-emerald-700",
              "flex items-center justify-center lg:justify-start"
            )}
          >
            {/* The animated pill that slides to the active tab */}
            {activeTab === tab.value && (
              <motion.div
                layoutId="active-account-tab-pill"
                transition={{ type: "tween", ease: "easeInOut", duration: 0.6 }}
                className="absolute inset-0 rounded-lg sm:border-none sm:border-0 border-2 border-emerald-300 bg-emerald-200/75 md:bg-emerald-500 lg:bg-emerald-200/75"
              />
            )}
            <span className="relative z-10 flex items-center justify-center lg:justify-start">
              <tab.icon className="size-5 md:size-4 lg:mr-3 lg:size-5" />
              <span className="ml-2 hidden text-sm sm:inline lg:ml-0 lg:inline">{tab.label}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

AccountNavigation.displayName = "AccountNavigation";
