"use client";

import { motion } from "framer-motion";
import { memo, useState } from "react";
import { GoShieldCheck } from "react-icons/go";
import { HiOutlineUserCircle } from "react-icons/hi2";
import { IoTrashBinOutline } from "react-icons/io5";
import { PiDevices } from "react-icons/pi";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the account navigation component.
 */
interface AccountNavigationProps {
  /** The currently active tab's value. */
  activeTab?: string;
  /** A callback function to handle tab changes. */
  onTabChange?: (value: string) => void;
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
export const AccountNavigation = memo(
  ({ activeTab = "profile", onTabChange }: AccountNavigationProps) => {
    const [currentTab, setCurrentTab] = useState(activeTab);

    const handleTabChange = (value: string) => {
      setCurrentTab(value);
      onTabChange?.(value);
    };

    return (
      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="font-inter grid h-12 w-full grid-cols-4 rounded-none bg-transparent p-1.5 md:h-14 md:rounded-xl md:bg-emerald-600 md:p-2 lg:flex lg:h-auto lg:flex-col lg:gap-2 lg:bg-transparent lg:p-0">
          {TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "relative cursor-pointer py-3 text-slate-800 data-[state=active]:bg-transparent data-[state=active]:shadow-none md:py-0 md:text-white lg:w-full lg:justify-start lg:rounded-lg lg:px-4 lg:py-3 lg:text-slate-700 lg:data-[state=active]:text-slate-700"
              )}
            >
              {/* Animated pill that slides to the active tab */}
              {currentTab === tab.value && (
                <motion.div
                  layoutId="active-account-tab-pill"
                  transition={{ type: "tween", ease: "easeInOut", duration: 0.6 }}
                  className="absolute inset-0 rounded-lg bg-emerald-100 md:bg-emerald-500 lg:bg-emerald-100"
                />
              )}
              <span className="relative z-10 flex items-center justify-center lg:justify-start">
                <tab.icon className="size-5 md:size-4 lg:mr-3 lg:size-5" />
                <span className="ml-2 hidden sm:inline lg:ml-0 lg:inline">{tab.label}</span>
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    );
  }
);

AccountNavigation.displayName = "AccountNavigation";
