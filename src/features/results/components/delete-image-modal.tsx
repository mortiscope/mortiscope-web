"use client";

import { motion } from "framer-motion";
import { ImSpinner2 } from "react-icons/im";

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
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.2,
      staggerChildren: 0.2,
    },
  },
};

/**
 * Framer Motion variants for individual animated items within the modal.
 */
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 150,
    },
  },
};

/**
 * Defines the props for the DeleteImageModal component.
 */
interface DeleteImageModalProps {
  /** The name of the image, displayed for confirmation. */
  imageName: string | null;
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal to confirm the deletion of a single image.
 * It warns the user about the irreversible nature of the action and the
 * subsequent PMI recalculation that will be triggered.
 *
 * @param {DeleteImageModalProps} props The props for controlling the modal's state.
 */
export const DeleteImageModal = ({ imageName, isOpen, onOpenChange }: DeleteImageModalProps) => {
  // A placeholder for the mutation's pending state.
  const isPending = false;

  /**
   * Handles the click event for the delete confirmation button.
   */
  const handleDelete = () => {};

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
              <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-rose-600 md:text-2xl">
                Delete Image
              </DialogTitle>
              <DialogDescription className="font-inter pt-4 text-center text-sm text-slate-600">
                Are you sure you want to permanently delete the image named&nbsp;
                <strong className="font-semibold text-slate-800">{`${imageName}`}</strong>? This
                action will trigger a PMI recalculation for the case and is irreversible.
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
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                  className="font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 uppercase transition-all duration-300 ease-in-out hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/20"
                >
                  {isPending ? (
                    <>
                      <ImSpinner2 className="h-5 w-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
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
