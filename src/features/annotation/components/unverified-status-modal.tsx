"use client";

import { motion, type Variants } from "framer-motion";

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
 * Defines the props for the unverified status modal component.
 */
interface UnverifiedStatusModalProps {
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * An informational modal that explains what the unverified status means.
 * This modal provides details about unverified detections in an image.
 *
 * @param {UnverifiedStatusModalProps} props The props for controlling the modal's state.
 */
export const UnverifiedStatusModal = ({ isOpen, onOpenChange }: UnverifiedStatusModalProps) => {
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
                Unverified
              </DialogTitle>
              <DialogDescription asChild>
                <div className="font-inter pt-4 text-left text-sm text-slate-600">
                  <p className="mb-3">
                    This status indicates that some detections in the current image have not been
                    reviewed or confirmed.
                  </p>
                  <ul className="space-y-1 text-slate-600">
                    <li className="flex items-start">
                      <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      <p>
                        <strong className="font-medium text-slate-700">Pending Review:</strong> Some
                        detections have not been manually inspected yet.
                      </p>
                    </li>
                    <li className="flex items-start">
                      <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      <p>
                        <strong className="font-medium text-slate-700">Needs Verification:</strong>{" "}
                        Unverified detections may require confirmation or correction.
                      </p>
                    </li>
                    <li className="flex items-start">
                      <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      <p>
                        <strong className="font-medium text-slate-700">Action Required:</strong>{" "}
                        Review and verify all detections to make it verified.
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
                className="font-inter h-10 w-full cursor-pointer bg-amber-500 uppercase transition-all duration-300 ease-in-out hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-400/20"
              >
                Understood
              </Button>
            </DialogFooter>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

UnverifiedStatusModal.displayName = "UnverifiedStatusModal";
