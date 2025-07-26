"use client";

import { motion } from "framer-motion";
import { ImSpinner2 } from "react-icons/im";
import { PiWarning } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the main modal content container.
 * This orchestrates the animation of its children with a staggered effect.
 */
const modalContentVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.2 } },
};

/**
 * Framer Motion variants for individual animated items within the modal.
 */
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

/**
 * Defines the props for the ResultsRecalculateModal component.
 */
interface ResultsRecalculateModalProps {
  /** The unique identifier of the case to be recalculated. */
  caseId: string | null;
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal to confirm the PMI recalculation for a case.
 * It warns the user about overwriting existing data and handles the recalculation logic.
 *
 * @param {ResultsRecalculateModalProps} props The props for controlling the modal's state.
 */
export const ResultsRecalculateModal = ({ isOpen, onOpenChange }: ResultsRecalculateModalProps) => {
  // Placeholder for the mutation's pending state.
  const isPending = false;

  /**
   * Handles the click event for the recalculate confirmation button.
   */
  const handleRecalculate = () => {};

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-sm md:rounded-3xl">
        {/* Main animation wrapper for the modal content. */}
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          {/* Animated wrapper for the dialog header. */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-6">
            <DialogHeader className="text-center">
              <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-amber-500 md:text-2xl">
                Recalculate PMI
              </DialogTitle>
              <DialogDescription asChild>
                <div className="font-inter pt-4 text-center text-sm text-slate-600">
                  <p>
                    A value affecting the&nbsp;
                    <strong className="font-semibold text-slate-800">
                      Post-Mortem Interval (PMI) estimation
                    </strong>
                    &nbsp;has been updated, and the current estimate may be inaccurate. Would you
                    like to recalculate it now?
                  </p>

                  <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-left">
                    <PiWarning className="h-5 w-5 flex-shrink-0 text-amber-500" />
                    <p className="flex-1 text-slate-700">
                      <strong className="font-semibold text-amber-500">Note:</strong> Proceeding
                      with this action will permanently&nbsp;
                      <strong className="font-semibold text-slate-800">overwrite</strong> the
                      current PMI estimation with a new calculation.
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
          </motion.div>

          {/* Animated wrapper for the dialog footer. */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4 pb-6">
            <DialogFooter className="flex w-full flex-row gap-3">
              <div className={cn("flex-1", isPending && "cursor-not-allowed")}>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isPending}
                  className="font-inter h-10 w-full cursor-pointer uppercase transition-all duration-300 ease-in-out hover:bg-slate-100"
                >
                  Cancel
                </Button>
              </div>

              <div className={cn("flex-1", isPending && "cursor-not-allowed")}>
                <Button
                  onClick={handleRecalculate}
                  disabled={isPending}
                  className="font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 border-amber-500 bg-amber-500 text-white uppercase transition-all duration-300 ease-in-out hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/20"
                >
                  {isPending ? (
                    <>
                      <ImSpinner2 className="h-5 w-5 animate-spin" />
                      Recalculating...
                    </>
                  ) : (
                    "Recalculate"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
