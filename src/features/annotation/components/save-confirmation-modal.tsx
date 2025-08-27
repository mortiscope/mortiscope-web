"use client";

import { motion, type Variants } from "framer-motion";
import { memo, useState } from "react";
import { PiInfo } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { HIDE_SAVE_CONFIRMATION } from "@/lib/constants";

/**
 * Framer Motion variants for the main modal content container.
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
 * Defines the props for the save confirmation modal component.
 */
interface SaveConfirmationModalProps {
  /** The name of the image being saved. */
  imageName: string | null;
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
  /** Function to call when save is confirmed. */
  onConfirm: () => void;
}

/**
 * A modal to confirm saving changes to detections.
 */
export const SaveConfirmationModal = memo(
  ({ imageName, isOpen, onOpenChange, onConfirm }: SaveConfirmationModalProps) => {
    const [doNotShowAgain, setDoNotShowAgain] = useState(false);

    /**
     * Handles the save confirmation.
     */
    const handleSave = () => {
      // Store preference in localStorage if checkbox is checked
      if (doNotShowAgain) {
        localStorage.setItem(HIDE_SAVE_CONFIRMATION, "true");
      }

      onConfirm();
      onOpenChange(false);
    };

    /**
     * Handles the modal close action.
     */
    const handleModalClose = (open: boolean) => {
      if (!open) {
        setDoNotShowAgain(false);
      }
      onOpenChange(open);
    };

    return (
      <Dialog open={isOpen} onOpenChange={handleModalClose}>
        <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-sm md:rounded-3xl">
          <motion.div
            className="contents"
            variants={modalContentVariants}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={itemVariants} className="shrink-0 px-6 pt-6">
              <DialogHeader className="text-center">
                <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-emerald-600 md:text-2xl">
                  Save Changes
                </DialogTitle>
                <DialogDescription asChild>
                  <div className="font-inter pt-4 text-center text-sm text-slate-600">
                    <p>
                      Are you sure you want to save all changes to the image named{" "}
                      <strong className="font-semibold break-all text-slate-800">
                        {imageName}
                      </strong>
                      ?
                    </p>

                    <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-emerald-400 bg-emerald-100 p-4 text-left">
                      <PiInfo className="h-5 w-5 flex-shrink-0 text-emerald-600" />
                      <p className="flex-1 text-slate-700">
                        <strong className="font-semibold text-emerald-600">Note:</strong> This will
                        save all your edits including{" "}
                        <strong className="font-semibold text-slate-800">added</strong>,{" "}
                        <strong className="font-semibold text-slate-800">deleted</strong>, and{" "}
                        <strong className="font-semibold text-slate-800">modified</strong>{" "}
                        detections. The state before won&apos;t be recovered anymore after saving.
                      </p>
                    </div>

                    {/* Do not show again checkbox */}
                    <div className="mt-4 flex items-center space-x-2">
                      <Checkbox
                        id="do-not-show-again"
                        checked={doNotShowAgain}
                        onCheckedChange={(checked) => setDoNotShowAgain(!!checked)}
                        className="cursor-pointer data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
                      />
                      <Label
                        htmlFor="do-not-show-again"
                        className="font-inter cursor-pointer text-sm font-normal text-slate-700"
                      >
                        Do not show this message again
                      </Label>
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </motion.div>

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
                    onClick={handleSave}
                    className="font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 bg-emerald-600 uppercase transition-all duration-300 ease-in-out hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20"
                  >
                    Save
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

SaveConfirmationModal.displayName = "SaveConfirmationModal";

/**
 * Helper function to check if the user has opted to hide the save confirmation modal.
 */
export const shouldShowSaveConfirmation = (): boolean => {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(HIDE_SAVE_CONFIRMATION) !== "true";
};
