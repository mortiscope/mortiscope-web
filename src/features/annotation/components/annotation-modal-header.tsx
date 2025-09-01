"use client";

import { motion, type Variants } from "framer-motion";
import { memo } from "react";

import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for individual modal items.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

/**
 * Defines the available color variants for the modal header.
 */
type ColorVariant = "rose" | "amber" | "emerald" | "sky";

/**
 * Defines the props for the annotation modal header component.
 */
interface AnnotationModalHeaderProps {
  /** The title text to display in the modal header. */
  title: string;
  /** Optional description content to display below the title. */
  description?: React.ReactNode;
  /** The color variant for the title. */
  colorVariant?: ColorVariant;
}

/**
 * A reusable modal header component for annotation modals.
 */
export const AnnotationModalHeader = memo(
  ({ title, description, colorVariant = "emerald" }: AnnotationModalHeaderProps) => {
    // Map color variants to Tailwind classes
    const titleColorClasses: Record<ColorVariant, string> = {
      rose: "text-rose-600",
      amber: "text-amber-500",
      emerald: "text-emerald-600",
      sky: "text-sky-600",
    };

    return (
      <motion.div variants={itemVariants} className="shrink-0 px-6 pt-6">
        <DialogHeader className="text-center">
          <DialogTitle
            className={cn(
              "font-plus-jakarta-sans text-center text-xl font-bold md:text-2xl",
              titleColorClasses[colorVariant]
            )}
          >
            {title}
          </DialogTitle>
          {description && (
            <DialogDescription asChild>
              <div className="font-inter pt-4 text-center text-sm text-slate-600">
                {description}
              </div>
            </DialogDescription>
          )}
        </DialogHeader>
      </motion.div>
    );
  }
);

AnnotationModalHeader.displayName = "AnnotationModalHeader";
