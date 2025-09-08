"use client";

import { motion, type Variants } from "framer-motion";
import { memo } from "react";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

/**
 * Defines the props for the dashboard modal footer component.
 */
interface DashboardModalFooterProps {
  /** Callback function to handle modal close action. */
  onClose: () => void;
  /** Framer Motion variants for animation. */
  variants: Variants;
  /** Optional button text. */
  buttonText?: string;
}

/**
 * A reusable footer component for dashboard information modals.
 */
export const DashboardModalFooter = memo(function DashboardModalFooter({
  onClose,
  variants,
  buttonText = "Got It",
}: DashboardModalFooterProps) {
  return (
    <motion.div variants={variants} className="shrink-0 px-6 pt-2 pb-6">
      <DialogFooter>
        <Button
          onClick={onClose}
          className="font-inter relative mt-2 h-9 w-full cursor-pointer overflow-hidden rounded-lg border-none bg-emerald-600 px-6 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-green-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0 md:mt-0 md:h-10 md:w-auto md:text-base"
        >
          {buttonText}
        </Button>
      </DialogFooter>
    </motion.div>
  );
});

DashboardModalFooter.displayName = "DashboardModalFooter";
