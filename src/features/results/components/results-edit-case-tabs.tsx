import { motion } from "framer-motion";
import { memo } from "react";
import {
  HiMiniListBullet,
  HiOutlineClipboardDocument,
  HiOutlineClipboardDocumentList,
} from "react-icons/hi2";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the results edit case tabs component.
 */
interface ResultsEditCaseTabsProps {
  /** The currently active tab's value. */
  activeTab: string;
  /** A callback function to handle tab changes. */
  onTabChange: (value: string) => void;
}

/**
 * A list of tab configurations to be rendered.
 */
const TABS = [
  { value: "details", label: "Details", icon: HiOutlineClipboardDocumentList },
  { value: "notes", label: "Notes", icon: HiOutlineClipboardDocument },
  { value: "history", label: "History", icon: HiMiniListBullet },
];

/**
 * Renders the tabs for the results edit case sheet, complete with a smooth
 * sliding animation for the active tab indicator.
 */
export const ResultsEditCaseTabs = memo(({ activeTab, onTabChange }: ResultsEditCaseTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <TabsList className="font-inter grid h-14 w-full grid-cols-3 rounded-none bg-emerald-600 px-3 py-2 md:h-16 md:px-3 md:py-2.5">
        {TABS.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "relative cursor-pointer font-medium text-white data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            )}
          >
            {/* The animated pill that slides to the active tab. */}
            {activeTab === tab.value && (
              <motion.div
                layoutId="active-edit-case-tab-pill"
                transition={{ type: "tween", ease: "easeInOut", duration: 0.6 }}
                className="absolute inset-0 rounded-md bg-emerald-500 md:rounded-lg"
              />
            )}
            <span className="relative z-10 flex items-center justify-center">
              <tab.icon className="size-5 sm:mr-2" />
              <span className="hidden sm:inline">{tab.label}</span>
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
});

ResultsEditCaseTabs.displayName = "ResultsEditCaseTabs";
