"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import { GoUnverified, GoVerified } from "react-icons/go";
import { PiScan } from "react-icons/pi";
import BeatLoader from "react-spinners/BeatLoader";

import { useEditorImage } from "@/features/annotation/hooks/use-editor-image";

/**
 * A presentational component that displays the annotation details for the currently active
 * image within the editor's side panel. It shows a breakdown of detected objects by life stage.
 */
export const DetailsAnnotationPanel = () => {
  // A custom hook to get the specific image data for the current editor view, including its detections.
  const { image, isLoading } = useEditorImage();

  /**
   * Memoizes the calculation of detection counts for each life stage.
   */
  const detectionCounts = useMemo(() => {
    // If there are no detections, return a default object with all counts as zero.
    if (!image?.detections) {
      return {
        instar_1: 0,
        instar_2: 0,
        instar_3: 0,
        pupa: 0,
        adult: 0,
      };
    }

    // Initialize a record to store the counts.
    const counts: Record<string, number> = {
      instar_1: 0,
      instar_2: 0,
      instar_3: 0,
      pupa: 0,
      adult: 0,
    };

    // Iterate over the detections and increment the count for each label.
    image.detections.forEach((detection) => {
      if (counts[detection.label] !== undefined) {
        counts[detection.label]++;
      }
    });

    return counts;
  }, [image?.detections]);

  // If the image data is still loading, show a centered spinner.
  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center md:min-h-[calc(100vh-13rem)]">
        <BeatLoader color="#ffffff" loading={isLoading} size={10} aria-label="Loading..." />
      </div>
    );
  }

  return (
    // The main container for the panel's content sections
    <div className="space-y-6">
      {/* Detections Section */}
      <div className="space-y-3">
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0 }}
          className="flex items-center gap-2 pb-2"
        >
          <PiScan className="h-6 w-6 text-emerald-300" />
          <h3 className="font-plus-jakarta-sans font-semibold tracking-wide text-emerald-200 uppercase">
            Detections
          </h3>
        </motion.div>
        <div className="space-y-2">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.05 }}
            className="flex items-center justify-between"
          >
            <p className="font-inter text-sm text-white">First Instar</p>
            <p className="font-inter text-sm text-emerald-200">{detectionCounts.instar_1}</p>
          </motion.div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.1 }}
            className="flex items-center justify-between"
          >
            <p className="font-inter text-sm text-white">Second Instar</p>
            <p className="font-inter text-sm text-emerald-200">{detectionCounts.instar_2}</p>
          </motion.div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.15 }}
            className="flex items-center justify-between"
          >
            <p className="font-inter text-sm text-white">Third Instar</p>
            <p className="font-inter text-sm text-emerald-200">{detectionCounts.instar_3}</p>
          </motion.div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.2 }}
            className="flex items-center justify-between"
          >
            <p className="font-inter text-sm text-white">Pupa</p>
            <p className="font-inter text-sm text-emerald-200">{detectionCounts.pupa}</p>
          </motion.div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.25 }}
            className="flex items-center justify-between"
          >
            <p className="font-inter text-sm text-white">Adult Flies</p>
            <p className="font-inter text-sm text-emerald-200">{detectionCounts.adult}</p>
          </motion.div>
        </div>
      </div>

      {/* Unverified Section */}
      <div className="space-y-3">
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.3 }}
          className="flex items-center gap-2 pb-2"
        >
          <GoUnverified className="h-6 w-6 text-amber-300" />
          <h3 className="font-plus-jakarta-sans font-semibold tracking-wide text-amber-200 uppercase">
            Unverified
          </h3>
        </motion.div>
        <div className="space-y-2">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.35 }}
            className="flex items-center justify-between"
          >
            <p className="font-inter text-sm text-white">First Instar</p>
            <p className="font-inter text-sm text-amber-200">0</p>
          </motion.div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.4 }}
            className="flex items-center justify-between"
          >
            <p className="font-inter text-sm text-white">Second Instar</p>
            <p className="font-inter text-sm text-amber-200">0</p>
          </motion.div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.45 }}
            className="flex items-center justify-between"
          >
            <p className="font-inter text-sm text-white">Third Instar</p>
            <p className="font-inter text-sm text-amber-200">0</p>
          </motion.div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.5 }}
            className="flex items-center justify-between"
          >
            <p className="font-inter text-sm text-white">Pupa</p>
            <p className="font-inter text-sm text-amber-200">0</p>
          </motion.div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.55 }}
            className="flex items-center justify-between"
          >
            <p className="font-inter text-sm text-white">Adult Flies</p>
            <p className="font-inter text-sm text-amber-200">0</p>
          </motion.div>
        </div>
      </div>

      {/* Verified Section */}
      <div className="space-y-3">
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.6 }}
          className="flex items-center gap-2 pb-2"
        >
          <GoVerified className="h-6 w-6 text-teal-300" />
          <h3 className="font-plus-jakarta-sans font-semibold tracking-wide text-teal-200 uppercase">
            Verified
          </h3>
        </motion.div>
        <div className="space-y-2">
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.65 }}
            className="flex items-center justify-between"
          >
            <p className="font-inter text-sm text-white">First Instar</p>
            <p className="font-inter text-sm text-teal-200">0</p>
          </motion.div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.7 }}
            className="flex items-center justify-between"
          >
            <p className="font-inter text-sm text-white">Second Instar</p>
            <p className="font-inter text-sm text-teal-200">0</p>
          </motion.div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.75 }}
            className="flex items-center justify-between"
          >
            <p className="font-inter text-sm text-white">Third Instar</p>
            <p className="font-inter text-sm text-teal-200">0</p>
          </motion.div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.8 }}
            className="flex items-center justify-between"
          >
            <p className="font-inter text-sm text-white">Pupa</p>
            <p className="font-inter text-sm text-teal-200">0</p>
          </motion.div>
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.85 }}
            className="flex items-center justify-between"
          >
            <p className="font-inter text-sm text-white">Adult Flies</p>
            <p className="font-inter text-sm text-teal-200">0</p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
