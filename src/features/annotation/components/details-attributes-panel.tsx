"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BsAspectRatio } from "react-icons/bs";
import { GoHome } from "react-icons/go";
import { HiOutlineBuildingOffice } from "react-icons/hi2";
import {
  IoCalendarClearOutline,
  IoCalendarOutline,
  IoFolderOpenOutline,
  IoImageOutline,
  IoThermometerOutline,
} from "react-icons/io5";
import { PiCity, PiMapTrifold } from "react-icons/pi";
import BeatLoader from "react-spinners/BeatLoader";

import { useEditorImage } from "@/features/annotation/hooks/use-editor-image";
import { getCaseById } from "@/features/results/actions/get-case-by-id";
import { formatDate } from "@/lib/utils";

/**
 * A presentational component that displays the key attributes of the case and the currently selected 
 * image within the editor's side panel. It fetches its own data and presents it in a read-only.
 */
export const DetailsAttributesPanel = () => {
  const params = useParams();
  const resultsId = params?.resultsId as string | undefined;

  // Fetches the full case data using Tanstack Query.
  const { data: caseData, isLoading: isCaseLoading } = useQuery({
    queryKey: ["case", resultsId],
    queryFn: () => getCaseById(resultsId || ""),
    enabled: !!resultsId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // A custom hook to get the specific image data for the current editor view.
  const { image, isLoading: isImageLoading } = useEditorImage();

  /** A local state to store the natural resolution of the image once it has been loaded. */
  const [resolution, setResolution] = useState<string>("Loading...");

  /**
   * An asynchronous effect to load the image in the background and determine its natural dimensions.
   * This is necessary because the image's resolution is not known until the image file itself is loaded.
   */
  useEffect(() => {
    if (image?.url) {
      const img = new Image();
      img.onload = () => {
        setResolution(`${img.naturalWidth} × ${img.naturalHeight}`);
      };
      img.onerror = () => {
        setResolution("N/A");
      };
      img.src = image.url;
    }
  }, [image?.url]);

  /** Memoizes the formatted case date to avoid recalculating it on every render. */
  const formattedCaseDate = useMemo(() => {
    if (!caseData) return "";
    return caseData.caseDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, [caseData]);

  /** Memoizes the image name with its file extension removed for cleaner display. */
  const imageName = useMemo(() => {
    return image?.name ? image.name.replace(/\.[^/.]+$/, "") : "N/A";
  }, [image?.name]);

  /** Memoizes the formatted upload date of the image. */
  const formattedUploadDate = useMemo(() => {
    return image?.dateUploaded ? formatDate(new Date(image.dateUploaded)) : "N/A";
  }, [image?.dateUploaded]);

  // A derived boolean for the overall loading state of the component.
  const isLoading = isCaseLoading || isImageLoading;

  // If either the case data or the image data is still loading, show a centered spinner.
  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center md:min-h-[calc(100vh-13rem)]">
        <BeatLoader color="#ffffff" loading={isLoading} size={10} aria-label="Loading..." />
      </div>
    );
  }

  // If the case data failed to load or doesn't exist, render nothing.
  if (!caseData) {
    return null;
  }

  return (
    // The main container that orchestrates the staggered animation of its children.
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delayChildren: 0.1, staggerChildren: 0.1 }}
      className="space-y-4"
    >

      {/* Case Name */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 150 }}
        className="flex items-center gap-3"
      >
        <IoFolderOpenOutline className="h-6 w-6 flex-shrink-0 text-white" />
        <div className="min-w-0 flex-1">
          <p className="font-inter text-xs tracking-wide text-emerald-200">Case Name</p>
          <p className="font-inter truncate text-sm text-white">{caseData.caseName || "N/A"}</p>
        </div>
      </motion.div>

      {/* Image Name */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.1 }}
        className="flex items-center gap-3"
      >
        <IoImageOutline className="h-6 w-6 flex-shrink-0 text-white" />
        <div className="min-w-0 flex-1">
          <p className="font-inter text-xs tracking-wide text-emerald-200">Image Name</p>
          <p className="font-inter truncate text-sm text-white">{imageName}</p>
        </div>
      </motion.div>

      {/* Resolution */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.2 }}
        className="flex items-center gap-3"
      >
        <BsAspectRatio className="h-6 w-6 flex-shrink-0 text-white" />
        <div className="min-w-0 flex-1">
          <p className="font-inter text-xs tracking-wide text-emerald-200">Resolution</p>
          <p className="font-inter truncate text-sm text-white">{resolution}</p>
        </div>
      </motion.div>

      {/* Case Date */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.3 }}
        className="flex items-center gap-3"
      >
        <IoCalendarClearOutline className="h-6 w-6 flex-shrink-0 text-white" />
        <div className="min-w-0 flex-1">
          <p className="font-inter text-xs tracking-wide text-emerald-200">Case Date</p>
          <p className="font-inter truncate text-sm text-white">{formattedCaseDate}</p>
        </div>
      </motion.div>

      {/*Upload Date */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.4 }}
        className="flex items-center gap-3"
      >
        <IoCalendarOutline className="h-6 w-6 flex-shrink-0 text-white" />
        <div className="min-w-0 flex-1">
          <p className="font-inter text-xs tracking-wide text-emerald-200">Upload Date</p>
          <p className="font-inter truncate text-sm text-white">{formattedUploadDate}</p>
        </div>
      </motion.div>

      {/* Temperature */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.5 }}
        className="flex items-center gap-3"
      >
        <IoThermometerOutline className="h-6 w-6 flex-shrink-0 text-white" />
        <div className="min-w-0 flex-1">
          <p className="font-inter text-xs tracking-wide text-emerald-200">Temperature</p>
          <p className="font-inter truncate text-sm text-white">{caseData.temperatureCelsius}°C</p>
        </div>
      </motion.div>

      {/* Region */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.6 }}
        className="flex items-center gap-3"
      >
        <PiMapTrifold className="h-6 w-6 flex-shrink-0 text-white" />
        <div className="min-w-0 flex-1">
          <p className="font-inter text-xs tracking-wide text-emerald-200">Region</p>
          <p className="font-inter truncate text-sm text-white">{caseData.locationRegion}</p>
        </div>
      </motion.div>

      {/* Province */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.7 }}
        className="flex items-center gap-3"
      >
        <HiOutlineBuildingOffice className="h-6 w-6 flex-shrink-0 text-white" />
        <div className="min-w-0 flex-1">
          <p className="font-inter text-xs tracking-wide text-emerald-200">Province</p>
          <p className="font-inter truncate text-sm text-white">{caseData.locationProvince}</p>
        </div>
      </motion.div>

      {/* City/Municipality */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.8 }}
        className="flex items-center gap-3"
      >
        <PiCity className="h-6 w-6 flex-shrink-0 text-white" />
        <div className="min-w-0 flex-1">
          <p className="font-inter text-xs tracking-wide text-emerald-200">City/Municipality</p>
          <p className="font-inter truncate text-sm text-white">{caseData.locationCity}</p>
        </div>
      </motion.div>

      {/* Barangay */}
      <motion.div
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 20, stiffness: 150, delay: 0.9 }}
        className="flex items-center gap-3"
      >
        <GoHome className="h-6 w-6 flex-shrink-0 text-white" />
        <div className="min-w-0 flex-1">
          <p className="font-inter text-xs tracking-wide text-emerald-200">Barangay</p>
          <p className="font-inter truncate text-sm text-white">{caseData.locationBarangay}</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

DetailsAttributesPanel.displayName = "DetailsAttributesPanel";
