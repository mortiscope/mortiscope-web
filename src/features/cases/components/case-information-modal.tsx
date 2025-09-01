"use client";

import { motion, type Variants } from "framer-motion";
import { useMemo } from "react";
import { GoHome } from "react-icons/go";
import { HiOutlineBuildingOffice } from "react-icons/hi2";
import {
  IoCalendarClearOutline,
  IoCalendarOutline,
  IoImageOutline,
  IoThermometerOutline,
  IoTimeOutline,
} from "react-icons/io5";
import { PiBoundingBoxLight, PiCity, PiMapTrifold } from "react-icons/pi";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type Case } from "@/features/results/components/results-preview";
import { STATUS_CONFIG } from "@/lib/constants";

/**
 * Framer Motion variants for the main modal content container.
 */
const modalContentVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.05 } },
};

/**
 * Framer Motion variants for individual animated items in the modal.
 */
const itemVariants: Variants = {
  hidden: { y: 10, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring" as const, damping: 20, stiffness: 150 } },
};

/**
 * Defines the props for the case information modal component.
 */
interface CaseInformationModalProps {
  /** A boolean to control the visibility of the modal. */
  isOpen: boolean;
  /** A callback function to handle changes to the modal's open state. */
  onOpenChange: (isOpen: boolean) => void;
  /** The case information object to be displayed in the modal. Can be null if no case is selected. */
  caseItem: Case | null;
}

/**
 * A reusable information row component for displaying case details in one line.
 */
const InformationRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) => {
  return (
    <motion.div variants={itemVariants} className="flex items-center gap-3">
      <Icon className="h-5 w-5 flex-shrink-0 text-emerald-600" />
      <div className="flex-1">
        <span className="font-inter text-sm text-slate-600">
          <span className="font-medium text-slate-700">{label}:</span> {value}
        </span>
      </div>
    </motion.div>
  );
};

/**
 * A modal component for viewing detailed information about a specific case.
 */
export const CaseInformationModal = ({
  isOpen,
  onOpenChange,
  caseItem,
}: CaseInformationModalProps) => {
  // Memoize formatted dates
  const formattedCaseDate = useMemo(() => {
    if (!caseItem?.caseDate) return "N/A";
    return caseItem.caseDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [caseItem?.caseDate]);

  const formattedUploadDate = useMemo(() => {
    if (!caseItem?.createdAt) return "N/A";
    return caseItem.createdAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [caseItem?.createdAt]);

  // Memoize status configuration
  const statusConfig = useMemo(() => {
    if (!caseItem?.verificationStatus) return null;
    return STATUS_CONFIG[caseItem.verificationStatus];
  }, [caseItem?.verificationStatus]);

  // Memoize reviewed images text
  const reviewedImagesText = useMemo(() => {
    if (!caseItem?.uploads) return "N/A";
    // Only count images that have at least one detection
    const imagesWithDetections = caseItem.uploads.filter(
      (u) => u.detections && u.detections.length > 0
    );
    const totalImages = imagesWithDetections.length;
    // Count images where all detections are verified
    const verifiedImages = imagesWithDetections.filter((u) => {
      // Check if all detections are verified
      return u.detections.every((d) => d.status !== "model_generated");
    }).length;
    return `${verifiedImages} / ${totalImages}`;
  }, [caseItem?.uploads]);

  // Memoize verified detections text
  const verifiedDetectionsText = useMemo(() => {
    if (!caseItem) return "N/A";
    return `${caseItem.verifiedDetections || 0} / ${caseItem.totalDetections || 0}`;
  }, [caseItem?.verifiedDetections, caseItem?.totalDetections]);

  // Memoize PMI estimation text
  const pmiEstimationText = useMemo(() => {
    const analysisResult = caseItem?.analysisResult;

    // If no analysis result or analysis not completed yet
    if (
      !analysisResult ||
      analysisResult.status === "pending" ||
      analysisResult.status === "processing"
    ) {
      return "Pending Analysis";
    }

    // If analysis completed but no PMI hours (no detections found)
    if (analysisResult.status === "completed" && !analysisResult.pmiHours) {
      return "No PMI Estimation";
    }

    // If analysis failed
    if (analysisResult.status === "failed") {
      return "Analysis Failed";
    }

    // If PMI hours exist, display them
    if (analysisResult.pmiHours) {
      const hours = analysisResult.pmiHours;
      const hoursText = `${hours.toFixed(2)} hours`;
      return caseItem.recalculationNeeded ? `${hoursText} (Recalculation Needed)` : hoursText;
    }

    return "Pending Analysis";
  }, [caseItem?.analysisResult, caseItem?.recalculationNeeded]);

  // Memoize status text with percentage for in progress
  const statusText = useMemo(() => {
    if (!statusConfig) return "N/A";
    if (
      caseItem?.verificationStatus === "in_progress" &&
      caseItem.totalDetections &&
      caseItem.totalDetections > 0
    ) {
      const percentage = ((caseItem.verifiedDetections / caseItem.totalDetections) * 100).toFixed(
        1
      );
      return `${percentage}% ${statusConfig.label}`;
    }
    return statusConfig.label;
  }, [
    statusConfig,
    caseItem?.verificationStatus,
    caseItem?.totalDetections,
    caseItem?.verifiedDetections,
  ]);

  // If no case data is provided, the modal renders nothing.
  if (!caseItem) return null;

  const StatusIcon = statusConfig?.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:rounded-3xl">
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          {/* Header Section */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-6">
            <DialogHeader className="text-center">
              <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-emerald-600 md:text-2xl">
                {caseItem.caseName}
              </DialogTitle>
              <DialogDescription className="font-inter pt-2 text-center text-sm text-slate-600">
                View detailed information about {caseItem.caseName}.
              </DialogDescription>
            </DialogHeader>
          </motion.div>

          {/* Case Information List */}
          <motion.div
            variants={itemVariants}
            className="flex-1 space-y-4 overflow-y-auto border-y border-slate-200 px-6 py-4"
          >
            <InformationRow
              icon={IoCalendarClearOutline}
              label="Case Date"
              value={formattedCaseDate}
            />

            <InformationRow
              icon={IoCalendarOutline}
              label="Upload Date"
              value={formattedUploadDate}
            />

            <InformationRow
              icon={IoThermometerOutline}
              label="Temperature"
              value={`${caseItem.temperatureCelsius}°C`}
            />

            <InformationRow icon={IoTimeOutline} label="PMI Estimation" value={pmiEstimationText} />

            {StatusIcon && <InformationRow icon={StatusIcon} label="Status" value={statusText} />}

            <InformationRow
              icon={IoImageOutline}
              label="Reviewed Images"
              value={reviewedImagesText}
            />

            <InformationRow
              icon={PiBoundingBoxLight}
              label="Verified Detections"
              value={verifiedDetectionsText}
            />

            <InformationRow icon={PiMapTrifold} label="Region" value={caseItem.locationRegion} />

            <InformationRow
              icon={HiOutlineBuildingOffice}
              label="Province"
              value={caseItem.locationProvince}
            />

            <InformationRow icon={PiCity} label="City/Municipality" value={caseItem.locationCity} />

            <InformationRow icon={GoHome} label="Barangay" value={caseItem.locationBarangay} />
          </motion.div>

          {/* Footer Section */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4 pb-6">
            <DialogFooter className="flex w-full flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="font-inter h-10 flex-1 cursor-pointer uppercase transition-all duration-300 ease-in-out hover:bg-slate-100"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  window.location.href = `/results/${caseItem.id}`;
                }}
                className="font-inter h-10 flex-1 cursor-pointer bg-emerald-600 uppercase transition-all duration-300 ease-in-out hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20"
              >
                Open
              </Button>
            </DialogFooter>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

CaseInformationModal.displayName = "CaseInformationModal";
