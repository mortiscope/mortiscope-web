"use client";

import { motion } from "framer-motion";
import { memo } from "react";

/**
 * Defines the props for the panel information row component.
 */
interface PanelInformationRowProps {
  /** The icon component to display. */
  icon: React.ElementType;
  /** The label text to display. */
  label: string;
  /** The value content to display. */
  value: React.ReactNode;
  /** Optional delay for staggered animations. */
  delay?: number;
}

/**
 * A reusable panel information row component with icon, label, and value.
 */
export const PanelInformationRow = memo(
  ({ icon: Icon, label, value, delay = 0 }: PanelInformationRowProps) => {
    return (
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 150, delay }}
        className="flex items-center gap-3"
      >
        <Icon className="h-6 w-6 flex-shrink-0 text-white" />
        <div className="min-w-0 flex-1">
          <p className="font-inter text-xs tracking-wide text-emerald-200">{label}</p>
          <p className="font-inter text-sm break-words hyphens-auto text-white">{value}</p>
        </div>
      </motion.div>
    );
  }
);

PanelInformationRow.displayName = "PanelInformationRow";
