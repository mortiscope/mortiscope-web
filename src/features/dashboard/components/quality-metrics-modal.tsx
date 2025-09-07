"use client";

import { motion, type Variants } from "framer-motion";
import { useMemo } from "react";
import { GoGitCompare } from "react-icons/go";
import { IoIosCellular } from "react-icons/io";
import { LuTrendingUp } from "react-icons/lu";

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
 * A reusable component for list items in the information modal.
 * Handles both plain text strings and JSX content with formatting.
 */
const InformationItem = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) => {
  // Split the text content by periods to create bullet points
  // Handle both string and JSX children
  const sentences =
    typeof children === "string"
      ? children
          .split(".")
          .filter((s) => s.trim().length > 0)
          .map((s) => s.trim() + ".")
      : [];

  return (
    <li className="cursor-pointer rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all duration-200 ease-in-out hover:border-emerald-200 hover:bg-emerald-50">
      {/* First row for the icon and title */}
      <div className="flex items-center">
        <Icon className="mr-3 h-5 w-5 flex-shrink-0 text-emerald-500" />
        <h4 className="font-inter font-medium text-slate-800">{title}</h4>
      </div>
      {/* Bullet list for content */}
      {typeof children === "string" ? (
        <ul className="font-inter mt-2 space-y-1 text-sm leading-relaxed text-slate-600 marker:text-emerald-500">
          {sentences.map((sentence, index) => (
            <li key={index} className="ml-6 list-disc pl-2">
              {sentence}
            </li>
          ))}
        </ul>
      ) : (
        <div className="font-inter mt-2 text-sm leading-relaxed text-slate-600">{children}</div>
      )}
    </li>
  );
};

interface QualityMetricsModalProps {
  /** Controls whether the modal is currently open. */
  isOpen: boolean;
  /** A callback function to handle changes to the open state. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal dialog that provides information on the quality metrics charts and AI model performance.
 */
export function QualityMetricsModal({ isOpen, onOpenChange }: QualityMetricsModalProps) {
  /**
   * Memoized modal content to prevent unnecessary re-renders.
   */
  const modalContent = useMemo(
    () => (
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
              Quality Metrics Information
            </DialogTitle>
            <DialogDescription className="font-inter text-center text-sm text-slate-600">
              A guide to understanding AI model performance and data quality indicators.
            </DialogDescription>
          </DialogHeader>
        </motion.div>

        {/* Main content area */}
        <motion.div
          variants={itemVariants}
          className="flex-1 overflow-y-auto border-y border-slate-200 p-6"
        >
          <div className="space-y-4">
            <div>
              <ul className="space-y-4">
                <InformationItem icon={LuTrendingUp} title="Model Percentage by Stage">
                  <ul className="space-y-1 marker:text-emerald-500">
                    <li className="ml-6 list-disc pl-2">
                      Displays the average confidence score of the model&apos;s predictions for each
                      life stage.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      The confidence percentage indicates how certain the model is about its
                      detections.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Higher confidence scores suggest the model is more <strong>reliable</strong>{" "}
                      for that particular life stage, while lower scores indicate stages that may
                      require more careful manual verification at that specific stage.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      This helps identify which life stages the model handles well and which need
                      improvement.
                    </li>
                  </ul>
                </InformationItem>
                <InformationItem icon={GoGitCompare} title="User Correction Ratio">
                  <ul className="space-y-1 marker:text-emerald-500">
                    <li className="ml-6 list-disc pl-2">
                      Compares model predictions that were <strong>verified</strong> as correct
                      against those requiring manual <strong>correction</strong>.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Verified predictions represent detections where the model was accurate and
                      users simply confirmed them.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Corrected predictions indicate detections where users had to manually edit the
                      model output due to incorrect labels or missed bounding boxes.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      A <strong>high correction ratio</strong> suggests the model may need
                      retraining, while a <strong>low ratio</strong> indicates decent performance
                      depending on the quantity of model&apos;s detection that are verified without
                      user intervention.
                    </li>
                  </ul>
                </InformationItem>
                <InformationItem icon={IoIosCellular} title="Confidence Score Distribution">
                  <ul className="space-y-1 marker:text-emerald-500">
                    <li className="ml-6 list-disc pl-2">
                      Shows how detections are spread across different confidence score ranges.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      This visualization reveals the overall certainty distribution of the model
                      across all detections.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      A healthy distribution should show most detections concentrated in higher
                      confidence ranges ranging from <strong>70-100%</strong>.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Many detections in lower ranges suggest the model is uncertain and its output
                      requires thorough manual review.
                    </li>
                  </ul>
                </InformationItem>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Dialog footer */}
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
    ),
    [onOpenChange]
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-full max-h-[85vh] flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-lg md:h-auto md:rounded-3xl">
        {modalContent}
      </DialogContent>
    </Dialog>
  );
}

QualityMetricsModal.displayName = "QualityMetricsModal";
