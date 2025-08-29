"use client";

import { motion, type Variants } from "framer-motion";
import { memo } from "react";
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
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

/**
 * Framer Motion variants for the main modal content container.
 * This orchestrates the animation of its children with a staggered effect.
 */
const modalContentVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.2 } },
};

/**
 * Framer Motion variants for individual animated items within the modal.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

/**
 * Defines the props for the reset changes modal component.
 */
interface ResetChangesModalProps {
  /** The name of the image, displayed for confirmation. */
  imageName: string | null;
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal to confirm resetting all changes to detections in the current image.
 * It warns the user about the action and handles the reset logic.
 *
 * @param {ResetChangesModalProps} props The props for controlling the modal's state.
 */
export const ResetChangesModal = memo(
  ({ imageName, isOpen, onOpenChange }: ResetChangesModalProps) => {
    const resetDetections = useAnnotationStore((state) => state.resetDetections);

    /**
     * Handles the click event for the reset confirmation button.
     */
    const handleReset = () => {
      resetDetections();
      onOpenChange(false);
    };

    /**
     * Handles the modal close action
     */
    const handleModalClose = (open: boolean) => {
      onOpenChange(open);
    };

    return (
      <Dialog open={isOpen} onOpenChange={handleModalClose}>
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
                  Reset Changes
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="font-inter pt-4 text-center text-sm text-slate-600">
                    <p>
                      Are you sure you want to reset all changes to the image named{" "}
                      <strong className="font-semibold break-all text-slate-800">
                        {imageName}
                      </strong>
                      ? This will restore all detections to their state from the previous saved.
                    </p>

                    <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-left">
                      <PiWarning className="h-5 w-5 flex-shrink-0 text-amber-500" />
                      <p className="flex-1 text-slate-700">
                        <strong className="font-semibold text-amber-500">Warning:</strong> This
                        action will undo all your edits, including{" "}
                        <strong className="font-semibold text-slate-800">added</strong>,{" "}
                        <strong className="font-semibold text-slate-800">deleted</strong>, and{" "}
                        <strong className="font-semibold text-slate-800">modified</strong>{" "}
                        detections. This cannot be undone.
                      </p>
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </motion.div>

            {/* Animated wrapper for the dialog footer. */}
            <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4 pb-6">
              <DialogFooter className="flex w-full flex-row gap-3">
                <div className="flex-1">
                  <Button
                    variant="outline"
                    onClick={() => handleModalClose(false)}
                    className="font-inter h-10 w-full cursor-pointer uppercase transition-all duration-300 ease-in-out hover:bg-slate-100"
                  >
                    Cancel
                  </Button>
                </div>

                <div className="flex-1">
                  <Button
                    onClick={handleReset}
                    className="font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 bg-amber-500 uppercase transition-all duration-300 ease-in-out hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-400/20"
                  >
                    Reset
                  </Button>
                </div>
              </DialogFooter>
            </motion.div>
          </motion.div>
        </DialogContent>
      </Dialog>
    );
  }
);

ResetChangesModal.displayName = "ResetChangesModal";
