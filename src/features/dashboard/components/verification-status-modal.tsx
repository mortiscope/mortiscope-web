"use client";

import { motion, type Variants } from "framer-motion";
import { useMemo } from "react";
import { IoFolderOpenOutline, IoImagesOutline } from "react-icons/io5";
import { PiBoundingBox } from "react-icons/pi";

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

interface VerificationStatusModalProps {
  /** Controls whether the modal is currently open. */
  isOpen: boolean;
  /** A callback function to handle changes to the open state. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal dialog that provides information on the verification status charts and workflow.
 */
export function VerificationStatusModal({ isOpen, onOpenChange }: VerificationStatusModalProps) {
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
              Verification Status Information
            </DialogTitle>
            <DialogDescription className="font-inter text-center text-sm text-slate-600">
              A guide to understanding the verification workflow and progress tracking.
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
                <InformationItem icon={IoFolderOpenOutline} title="Case Verification Status">
                  <ul className="space-y-1 marker:text-emerald-500">
                    <li className="ml-6 list-disc pl-2">
                      Shows the verification status of entire cases based on all detections within
                      each case.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Cases are categorized as <strong>verified</strong> when all detections in the
                      images of a case have been reviewed and confirmed.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Cases are categorized as <strong>in progress</strong> when there&apos;s a mix
                      of verified and unverified detections in the images of a case.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Cases are marked as <strong>unverified</strong> when all detections remain in
                      their original AI-generated state without any user intervention.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      This provides an overview of case completion and helps prioritize workflow.
                    </li>
                  </ul>
                </InformationItem>
                <InformationItem icon={IoImagesOutline} title="Image Verification Status">
                  <ul className="space-y-1 marker:text-emerald-500">
                    <li className="ml-6 list-disc pl-2">
                      Displays the verification status of individual images based on the detections
                      they contain.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Images are marked as <strong>verified</strong> when all their detections have
                      been confirmed.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Images are classified as <strong>in progress</strong> when partially reviewed.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Images are labelled as <strong>unverified</strong> when no detections have
                      been verified yet.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      This helps identify which specific images need attention and estimates
                      remaining workload at the image level.
                    </li>
                  </ul>
                </InformationItem>
                <InformationItem icon={PiBoundingBox} title="Detection Verification Status">
                  <ul className="space-y-1 marker:text-emerald-500">
                    <li className="ml-6 list-disc pl-2">
                      Shows the verification status of individual bounding box detections across all
                      images and cases.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Detections are either <strong>verified</strong>, meaning they&apos;ve been
                      confirmed or edited and confirmed by a user, or <strong>unverified</strong>,
                      meaning they remain in their original AI-generated state.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      This directly indicates data reliability, as PMI calculations depend on
                      accurate detection counts.
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

VerificationStatusModal.displayName = "VerificationStatusModal";
