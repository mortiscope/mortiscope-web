"use client";

import { motion } from "framer-motion";
import { memo } from "react";

import { cn } from "@/lib/utils";

/**
 * Defines the available color variants for the panel section header.
 */
type ColorVariant = "emerald" | "amber" | "teal" | "sky" | "violet";

/**
 * Defines the props for the panel section header component.
 */
interface PanelSectionHeaderProps {
  /** The icon component to display. */
  icon: React.ElementType;
  /** The title text to display. */
  title: string;
  /** The color variant for the icon and title. */
  colorVariant?: ColorVariant;
  /** Optional delay for staggered animations. */
  delay?: number;
}

/**
 * A reusable panel section header component with icon and title.
 */
export const PanelSectionHeader = memo(
  ({ icon: Icon, title, colorVariant = "emerald", delay = 0 }: PanelSectionHeaderProps) => {
    const iconColorClasses: Record<ColorVariant, string> = {
      emerald: "text-emerald-300",
      amber: "text-amber-300",
      teal: "text-teal-300",
      sky: "text-sky-300",
      violet: "text-violet-300",
    };

    const titleColorClasses: Record<ColorVariant, string> = {
      emerald: "text-emerald-200",
      amber: "text-amber-200",
      teal: "text-teal-200",
      sky: "text-sky-200",
      violet: "text-violet-200",
    };

    return (
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 150, delay }}
        className="flex items-center gap-2 pb-2"
      >
        <Icon className={cn("h-6 w-6", iconColorClasses[colorVariant])} />
        <h3
          className={cn(
            "font-plus-jakarta-sans font-semibold tracking-wide uppercase",
            titleColorClasses[colorVariant]
          )}
        >
          {title}
        </h3>
      </motion.div>
    );
  }
);

PanelSectionHeader.displayName = "PanelSectionHeader";
