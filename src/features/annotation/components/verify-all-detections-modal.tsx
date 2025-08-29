"use client";

import { motion, type Variants } from "framer-motion";
import { memo } from "react";
import { PiInfo } from "react-icons/pi";

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
 * Defines the props for the verify all detections modal component.
 */
interface VerifyAllDetectionsModalProps {
  /** The name of the image, displayed for confirmation. */
  imageName: string | null;
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal to confirm the verification of all detections in the current image.
 * It informs the user about the action and handles the verification logic.
 *
 * @param {VerifyAllDetectionsModalProps} props The props for controlling the modal's state.
 */
export const VerifyAllDetectionsModal = memo(
  ({ imageName, isOpen, onOpenChange }: VerifyAllDetectionsModalProps) => {
    const verifyAllDetections = useAnnotationStore((state) => state.verifyAllDetections);

    /**
     * Handles the click event for the verify confirmation button.
     */
    const handleVerify = () => {
      verifyAllDetections();
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
                <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-emerald-600 md:text-2xl">
                  Verify All Detections
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="font-inter pt-4 text-center text-sm text-slate-600">
                    <p>
                      Are you sure you want to mark all detections as verified in the image named{" "}
                      <strong className="font-semibold break-all text-slate-800">
                        {imageName}
                      </strong>
                      ? This action is irreversible.
                    </p>

                    <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-emerald-400 bg-emerald-100 p-4 text-left">
                      <PiInfo className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                      <p className="flex-1 text-slate-700">
                        <strong className="font-semibold text-emerald-600">Note:</strong> Please
                        make sure that all detections are{" "}
                        <strong className="font-semibold text-slate-800">accurate</strong> and have
                        been thoroughly{" "}
                        <strong className="font-semibold text-slate-800">assessed</strong> before
                        proceeding with this action.
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
                    onClick={handleVerify}
                    className="font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 bg-emerald-600 uppercase transition-all duration-300 ease-in-out hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20"
                  >
                    Verify
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

VerifyAllDetectionsModal.displayName = "VerifyAllDetectionsModal";
