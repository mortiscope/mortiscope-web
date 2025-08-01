"use client";

import { motion, type Variants } from "framer-motion";
import { FaRegHourglass } from "react-icons/fa6";
import { LuCalendarRange, LuClock } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { type analysisResults } from "@/db/schema";
import { formatPmiToInterpretableString } from "@/lib/utils";

/**
 * Framer Motion variants for the main modal content container.
 * This orchestrates the animation of its children with a staggered effect.
 */
const modalContentVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.3,
      staggerChildren: 0.2,
    },
  },
};

/**
 * Framer Motion variants for individual animated items within the modal.
 */
const itemVariants: Variants = {
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
 * Defines the props required by the component.
 */
interface PmiExplanationModalProps {
  /** The full analysis result data to display in the modal. */
  analysisResult: typeof analysisResults.$inferSelect | null | undefined;
  /** Controls whether the modal is currently open. */
  isOpen: boolean;
  /** A callback function to handle changes to the open state. */
  onOpenChange: (isOpen: boolean) => void;
  /** A boolean indicating if a PMI estimation is currently available to display. */
  hasEstimation: boolean;
}

/**
 * A modal dialog component that displays a detailed breakdown of the PMI estimation.
 */
export function PmiExplanationModal({
  analysisResult,
  isOpen,
  onOpenChange,
  hasEstimation,
}: PmiExplanationModalProps) {
  if (!analysisResult) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-full max-h-[85vh] flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-lg md:h-auto md:rounded-3xl">
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
                PMI Explanation
              </DialogTitle>
              <DialogDescription className="font-inter text-center text-sm text-slate-600">
                A detailed breakdown of the Post-Mortem Interval estimation.
              </DialogDescription>
            </DialogHeader>
          </motion.div>

          {/* Main container */}
          <motion.div
            variants={itemVariants}
            className="flex-1 space-y-4 overflow-y-auto border-y border-slate-200 p-6"
          >
            {/* Conditionally render the Summary and Calculated Values sections only when there is a valid estimation. */}
            {hasEstimation && (
              <>
                {/* Interpretable Summary Section */}
                <div>
                  <h3 className="font-plus-jakarta-sans mb-2 text-lg font-semibold text-slate-800">
                    Summary
                  </h3>
                  <p className="font-inter cursor-pointer rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center text-base text-slate-600 hover:border-emerald-200 hover:bg-emerald-50">
                    The estimated minimum PMI is approximately&nbsp;
                    <strong className="font-semibold text-emerald-600">
                      {formatPmiToInterpretableString(analysisResult.pmiMinutes)}
                    </strong>
                    .
                  </p>
                </div>

                <Separator />

                {/* Raw Data Section */}
                <div>
                  <h3 className="font-plus-jakarta-sans mb-3 text-lg font-semibold text-slate-800">
                    Calculated Values
                  </h3>
                  <ul className="font-inter grid gap-3">
                    <li className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-3 transition-all duration-200 ease-in-out hover:border-emerald-200 hover:bg-emerald-50">
                      <div className="flex items-center">
                        <LuCalendarRange className="mr-3 h-5 w-5 flex-shrink-0 text-emerald-500" />
                        <span className="text-sm text-slate-700">PMI in Days</span>
                      </div>
                      <span className="font-medium text-slate-900">
                        {analysisResult.pmiDays?.toFixed(2) ?? "N/A"}
                      </span>
                    </li>
                    <li className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-3 transition-all duration-200 ease-in-out hover:border-emerald-200 hover:bg-emerald-50">
                      <div className="flex items-center">
                        <FaRegHourglass className="mr-3 h-5 w-5 flex-shrink-0 text-emerald-500" />
                        <span className="text-sm text-slate-700">PMI in Hours</span>
                      </div>
                      <span className="font-medium text-slate-900">
                        {analysisResult.pmiHours?.toFixed(2) ?? "N/A"}
                      </span>
                    </li>
                    <li className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-3 transition-all duration-200 ease-in-out hover:border-emerald-200 hover:bg-emerald-50">
                      <div className="flex items-center">
                        <LuClock className="mr-3 h-5 w-5 flex-shrink-0 text-emerald-500" />
                        <span className="text-sm text-slate-700">PMI in Minutes</span>
                      </div>
                      <span className="font-medium text-slate-900">
                        {analysisResult.pmiMinutes?.toFixed(2) ?? "N/A"}
                      </span>
                    </li>
                  </ul>
                </div>

                <Separator />
              </>
            )}

            {/* Explanation Section */}
            <div>
              <h3 className="font-plus-jakarta-sans mb-2 text-lg font-semibold text-slate-800">
                Explanation
              </h3>
              <p className="font-inter text-sm leading-relaxed text-slate-600">
                {analysisResult.explanation || "No explanation provided."}
              </p>
            </div>
          </motion.div>

          {/* Dialog footer. */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-2 pb-6">
            <DialogFooter>
              <Button
                onClick={() => onOpenChange(false)}
                className="font-inter relative mt-2 h-9 w-full cursor-pointer overflow-hidden rounded-lg border-none bg-emerald-600 px-6 text-sm font-normal text-white uppercase transition-all duration-300 ease-in-out before:absolute before:top-0 before:-left-full before:z-[-1] before:h-full before:w-full before:rounded-lg before:bg-gradient-to-r before:from-yellow-400 before:to-yellow-500 before:transition-all before:duration-600 before:ease-in-out hover:scale-100 hover:border-transparent hover:bg-green-600 hover:text-white hover:shadow-lg hover:shadow-yellow-500/20 hover:before:left-0 md:mt-0 md:h-10 md:w-auto md:text-base"
              >
                Got It
              </Button>
            </DialogFooter>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
