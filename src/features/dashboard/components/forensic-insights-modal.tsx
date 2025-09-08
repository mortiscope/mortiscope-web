"use client";

import { motion, type Variants } from "framer-motion";
import { useMemo } from "react";
import { IoHourglassOutline } from "react-icons/io5";
import { PiCirclesThree, PiRecycle } from "react-icons/pi";

import { Dialog, DialogContent } from "@/components/ui/dialog";
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

/**
 * A reusable component for list items in the information modal.
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
      {/* Bullet list for sentences or JSX content */}
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

interface ForensicInsightsModalProps {
  /** Controls whether the modal is currently open. */
  isOpen: boolean;
  /** A callback function to handle changes to the open state. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal dialog that provides information on the forensic insights charts and their interpretations.
 */
export function ForensicInsightsModal({ isOpen, onOpenChange }: ForensicInsightsModalProps) {
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
          title="Forensic Insights Information"
          description="A guide to understanding forensic analysis visualizations and metrics."
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
                <InformationItem icon={PiRecycle} title="Life Stage Distribution">
                  <ul className="space-y-1 marker:text-emerald-500">
                    <li className="ml-6 list-disc pl-2">
                      Displays the total count of detected insects across all{" "}
                      <strong>five developmental stages</strong>.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Each life stage is represented by a distinct color.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      The most abundant immature stage indicates the{" "}
                      <strong>developmental peak</strong> of the insect population, which is
                      important for accurate PMI estimation.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      A high concentration in <strong>older stages</strong> excluding adult stage
                      potentially suggests an average of longer{" "}
                      <strong>Post-Mortem Interval (PMI)</strong>.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Examining the distribution can reveal patterns such as mass emergence events
                      or environmental factors affecting development rates.
                    </li>
                  </ul>
                </InformationItem>
                <InformationItem icon={IoHourglassOutline} title="PMI Distribution">
                  <ul className="space-y-1 marker:text-emerald-500">
                    <li className="ml-6 list-disc pl-2">
                      Shows how cases are distributed across different time intervals based on their
                      calculated Post-Mortem Interval.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Cases are grouped into <strong>seven time ranges</strong>.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      This distribution helps identify patterns in <strong>case timelines</strong>{" "}
                      and provides an overview of typical PMI ranges of the caseload.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Clustering in specific intervals may indicate common scenarios, environmental
                      conditions, or seasonal variations that affect insect development and
                      colonization patterns.
                    </li>
                  </ul>
                </InformationItem>
                <InformationItem icon={PiCirclesThree} title="Sampling Density">
                  <ul className="space-y-1 marker:text-emerald-500">
                    <li className="ml-6 list-disc pl-2">
                      Categorizes cases based on the number of images collected per case.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Cases are grouped into <strong>five ranges</strong>.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Higher image counts generally provide more evidence and potentially better{" "}
                      <strong>PMI accuracy</strong> which could help to better assess the quality of
                      evidence collection across cases.
                    </li>
                    <li className="ml-6 list-disc pl-2">
                      Cases with fewer images may require additional sampling for reliable
                      conclusions.
                    </li>
                  </ul>
                </InformationItem>
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

ForensicInsightsModal.displayName = "ForensicInsightsModal";
