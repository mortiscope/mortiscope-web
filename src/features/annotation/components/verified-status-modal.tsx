"use client";

import { motion, type Variants } from "framer-motion";
import { memo } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
 * Defines the props for the verified status modal component.
 */
interface VerifiedStatusModalProps {
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * An informational modal that explains what the verified status means.
 * This modal provides details about verified detections in an image.
 *
 * @param {VerifiedStatusModalProps} props The props for controlling the modal's state.
 */
export const VerifiedStatusModal = memo(({ isOpen, onOpenChange }: VerifiedStatusModalProps) => {
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
              <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-emerald-600 md:text-2xl">
                Verified
              </DialogTitle>
              <DialogDescription asChild>
                <div className="font-inter pt-4 text-left text-sm text-slate-600">
                  <p className="mb-3">
                    This status indicates that all detections in the current image have been
                    reviewed and confirmed.
                  </p>
                  <ul className="space-y-1 text-slate-600">
                    <li className="flex items-start">
                      <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <p>
                        <strong className="font-medium text-slate-700">Reviewed:</strong> All
                        detections have been manually inspected and assessed.
                      </p>
                    </li>
                    <li className="flex items-start">
                      <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <p>
                        <strong className="font-medium text-slate-700">Confirmed:</strong> Each
                        detection has been marked as accurate and correct.
                      </p>
                    </li>
                    <li className="flex items-start">
                      <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <p>
                        <strong className="font-medium text-slate-700">Editable:</strong> You can
                        still modify detections if you notice missed or incorrect annotations.
                      </p>
                    </li>
                  </ul>
                </div>
              </DialogDescription>
            </DialogHeader>
          </motion.div>

          {/* Animated wrapper for the dialog footer. */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4 pb-6">
            <DialogFooter className="flex w-full">
              <Button
                onClick={() => handleModalClose(false)}
                className="font-inter h-10 w-full cursor-pointer bg-emerald-600 uppercase transition-all duration-300 ease-in-out hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20"
              >
                Understood
              </Button>
            </DialogFooter>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
});

VerifiedStatusModal.displayName = "VerifiedStatusModal";
