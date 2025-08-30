"use client";

import { motion } from "framer-motion";
import { memo } from "react";

import { cn } from "@/lib/utils";

/**
 * Defines the available color variants for the panel list item value.
 */
type ColorVariant = "emerald" | "amber" | "teal";

/**
 * Defines the props for the panel list item component.
 */
interface PanelListItemProps {
  /** The label text to display on the left. */
  label: string;
  /** The value content to display on the right. */
  value: React.ReactNode;
  /** The color variant for the value text. */
  colorVariant?: ColorVariant;
  /** Optional delay for staggered animations. */
  delay?: number;
}

/**
 * A reusable panel list item component with label and value.
 */
export const PanelListItem = memo(
  ({ label, value, colorVariant = "emerald", delay = 0 }: PanelListItemProps) => {
    const valueColorClasses: Record<ColorVariant, string> = {
      emerald: "text-emerald-200",
      amber: "text-amber-200",
      teal: "text-teal-200",
    };

    return (
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 150, delay }}
        className="flex items-center justify-between"
      >
        <p className="font-inter text-sm text-white">{label}</p>
        <p className={cn("font-inter text-sm", valueColorClasses[colorVariant])}>{value}</p>
      </motion.div>
    );
  }
);

PanelListItem.displayName = "PanelListItem";
