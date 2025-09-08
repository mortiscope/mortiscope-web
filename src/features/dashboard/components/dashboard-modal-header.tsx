"use client";

import { motion, type Variants } from "framer-motion";
import { memo } from "react";

import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * Defines the props for the dashboard modal header component.
 */
interface DashboardModalHeaderProps {
  /** The title text to display in the modal header. */
  title: string;
  /** The description text to display below the title. */
  description: string;
  /** Framer Motion variants for animation. */
  variants: Variants;
}

/**
 * A reusable header component for dashboard information modals.
 */
export const DashboardModalHeader = memo(function DashboardModalHeader({
  title,
  description,
  variants,
}: DashboardModalHeaderProps) {
  return (
    <motion.div variants={variants} className="shrink-0 px-6 pt-6">
      <DialogHeader className="text-center">
        <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-emerald-600 md:text-2xl">
          {title}
        </DialogTitle>
        <DialogDescription className="font-inter text-center text-sm text-slate-600">
          {description}
        </DialogDescription>
      </DialogHeader>
    </motion.div>
  );
});

DashboardModalHeader.displayName = "DashboardModalHeader";
