import { AnimatePresence, motion, type Variants } from "framer-motion";
import { memo } from "react";
import { ImSpinner2 } from "react-icons/im";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the footer's entrance animation.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

/**
 * Defines the animation variants for the text transition inside the buttons,
 * creating a subtle vertical slide and fade effect.
 */
const textVariants: Variants = {
  initial: { y: 10, opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: -10, opacity: 0 },
};

/**
 * Defines the props for the account modal footer component.
 */
type AccountModalFooterProps = {
  /** A boolean indicating if an asynchronous action is in progress. */
  isPending: boolean;
  /** A callback function for the "Cancel" button. */
  onCancel: () => void;
  /** A callback function for the primary action button. */
  onAction: () => void;
  /** The text for the primary action button. */
  actionButtonText?: string;
  /** The text for the cancel button. */
  cancelButtonText?: string;
  /** The text for the primary action button when `isPending` is true. */
  pendingButtonText?: string;
  /** An additional boolean to disable the buttons, independent of the pending state. */
  disabled?: boolean;
  /** The color variant for the primary action button, used to convey context. */
  variant?: "emerald" | "rose" | "slate";
  /** A boolean to control the visibility of the spinner in the pending state. */
  showSpinner?: boolean;
};

/**
 * A memoized, reusable component that renders a standardized footer for account-related modals.
 * It includes a cancel button and a primary action button, with support for pending states,
 * different color variants, and animated text transitions.
 */
export const AccountModalFooter = memo(
  ({
    isPending,
    onCancel,
    onAction,
    actionButtonText = "Confirm",
    cancelButtonText = "Cancel",
    pendingButtonText = "Processing...",
    disabled = false,
    variant = "emerald",
    showSpinner = true,
  }: AccountModalFooterProps) => {
    // A derived boolean to determine the final disabled state of the action button.
    const isButtonDisabled = isPending || disabled;

    /**
     * A helper function that returns the appropriate CSS classes for the primary action button
     * based on its current state (enabled, disabled) and color variant.
     */
    const getActionButtonClasses = () => {
      const baseClasses =
        "font-inter h-10 w-full overflow-hidden uppercase transition-all duration-300 ease-in-out";

      // Styles for the disabled state.
      if (isButtonDisabled) {
        return cn(
          baseClasses,
          "cursor-not-allowed",
          variant === "emerald" && "bg-emerald-400 text-emerald-100 hover:bg-emerald-400",
          variant === "rose" && "bg-rose-400 text-rose-100 hover:bg-rose-400",
          variant === "slate" && "bg-slate-400 text-slate-100 hover:bg-slate-400"
        );
      }

      // Styles for the enabled state.
      return cn(
        baseClasses,
        "cursor-pointer text-white",
        variant === "emerald" &&
          "bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20",
        variant === "rose" &&
          "bg-rose-600 hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/20",
        variant === "slate" &&
          "bg-slate-600 hover:bg-slate-500 hover:shadow-lg hover:shadow-slate-500/20"
      );
    };

    return (
      // The main animated container for the footer.
      <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4 pb-6">
        <DialogFooter className="flex w-full flex-row gap-3">
          {/* Cancel Button */}
          <div className={cn("flex-1", isPending && "cursor-not-allowed")}>
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isPending}
              className="font-inter h-10 w-full cursor-pointer overflow-hidden uppercase transition-all duration-300 ease-in-out hover:bg-slate-100 disabled:cursor-not-allowed"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={cancelButtonText}
                  variants={textVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ ease: "easeInOut", duration: 0.2 }}
                  className="block"
                >
                  {cancelButtonText}
                </motion.span>
              </AnimatePresence>
            </Button>
          </div>
          {/* Primary Action Button */}
          <div className={cn("flex-1", isButtonDisabled && "cursor-not-allowed")}>
            <Button
              onClick={onAction}
              disabled={isButtonDisabled}
              className={getActionButtonClasses()}
            >
              {isPending ? (
                // The content to display when an action is in progress.
                <div className="flex items-center justify-center gap-2">
                  {showSpinner && <ImSpinner2 className="h-5 w-5 animate-spin" />}
                  {/* Provides an accessible label for the pending state. */}
                  <span className="sr-only">Action started successfully.</span>
                  <span>{pendingButtonText}</span>
                </div>
              ) : (
                // The content for the default, non-pending state.
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={actionButtonText}
                    variants={textVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ ease: "easeInOut", duration: 0.2 }}
                    className="block"
                  >
                    {actionButtonText}
                  </motion.span>
                </AnimatePresence>
              )}
            </Button>
          </div>
        </DialogFooter>
      </motion.div>
    );
  }
);

AccountModalFooter.displayName = "AccountModalFooter";
