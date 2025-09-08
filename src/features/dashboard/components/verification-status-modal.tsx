"use client";

import { motion, type Variants } from "framer-motion";
import { useMemo } from "react";
import { IoFolderOpenOutline, IoImagesOutline } from "react-icons/io5";
import { PiBoundingBox } from "react-icons/pi";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { DashboardInformationItem } from "@/features/dashboard/components/dashboard-information-item";
import { DashboardModalFooter } from "@/features/dashboard/components/dashboard-modal-footer";
import { DashboardModalHeader } from "@/features/dashboard/components/dashboard-modal-header";

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
        <DashboardModalHeader
          title="Verification Status Information"
          description="A guide to understanding the verification workflow and progress tracking."
          variants={itemVariants}
        />

        {/* Main content area */}
        <motion.div
          variants={itemVariants}
          className="flex-1 overflow-y-auto border-y border-slate-200 p-6"
        >
          <div className="space-y-4">
            <div>
              <ul className="space-y-4">
                <DashboardInformationItem
                  icon={IoFolderOpenOutline}
                  title="Case Verification Status"
                >
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
                </DashboardInformationItem>
                <DashboardInformationItem icon={IoImagesOutline} title="Image Verification Status">
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
                </DashboardInformationItem>
                <DashboardInformationItem
                  icon={PiBoundingBox}
                  title="Detection Verification Status"
                >
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
                </DashboardInformationItem>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Dialog footer */}
        <DashboardModalFooter onClose={() => onOpenChange(false)} variants={itemVariants} />
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
