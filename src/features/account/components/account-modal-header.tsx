import { motion, type Variants } from "framer-motion";
import { memo } from "react";

import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the header's entrance animation.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

/**
 * Defines the props for the account modal header component.
 */
type AccountModalHeaderProps = {
  /** The main title text to be displayed in the header. */
  title: string;
  /** The optional description text or React node to be displayed below the title. */
  description?: React.ReactNode;
  /**
   * The color variant for the title, used to convey the context of the modal
   * @default "emerald"
   */
  variant?: "emerald" | "rose" | "slate";
};

/**
 * A memoized, reusable component that renders a standardized header for account-related modals.
 * It includes an animated entrance and supports different color variants for the title to
 * visually communicate the modal's purpose.
 *
 * @param {AccountModalHeaderProps} props The props for the component.
 * @returns A React component representing the modal header.
 */
export const AccountModalHeader = memo(
  ({ title, description, variant = "emerald" }: AccountModalHeaderProps) => (
    // The main animated container for the header.
    <motion.div variants={itemVariants} className="shrink-0 px-6 pt-6">
      <DialogHeader>
        <DialogTitle
          // Applies conditional class names to change the title's color based on the selected variant.
          className={cn(
            "font-plus-jakarta-sans text-center text-xl font-bold md:text-2xl",
            variant === "emerald" && "text-emerald-600",
            variant === "rose" && "text-rose-600",
            variant === "slate" && "text-slate-600"
          )}
        >
          {title}
        </DialogTitle>
        {/* The description is only rendered if it is provided. */}
        {description && (
          <DialogDescription className="font-inter pt-2 text-center text-sm text-slate-600">
            {description}
          </DialogDescription>
        )}
      </DialogHeader>
    </motion.div>
  )
);

AccountModalHeader.displayName = "AccountModalHeader";
