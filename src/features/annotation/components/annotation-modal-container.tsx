"use client";

import { motion, type Variants } from "framer-motion";
import { memo, type ReactNode } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * Framer Motion variants for modal content containers.
 */
const modalContentVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.2 } },
};

/**
 * Defines the props for the annotation modal container component.
 */
interface AnnotationModalContainerProps {
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Callback function when the modal's open state changes. */
  onOpenChange: (open: boolean) => void;
  /** The content to render inside the modal. */
  children: ReactNode;
}

/**
 * A reusable modal container component for annotation modals.
 */
export const AnnotationModalContainer = memo(
  ({ isOpen, onOpenChange, children }: AnnotationModalContainerProps) => {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-sm md:rounded-3xl">
          <motion.div
            className="contents"
            variants={modalContentVariants}
            initial="hidden"
            animate="show"
          >
            {children}
          </motion.div>
        </DialogContent>
      </Dialog>
    );
  }
);

AnnotationModalContainer.displayName = "AnnotationModalContainer";
