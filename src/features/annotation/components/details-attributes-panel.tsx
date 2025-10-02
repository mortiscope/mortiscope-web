"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useParams } from "next/navigation";
import { memo, useEffect, useMemo, useState } from "react";
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

import { PanelInformationRow } from "@/features/annotation/components/panel-information-row";
import { useEditorImage } from "@/features/annotation/hooks/use-editor-image";
import { getCaseById } from "@/features/results/actions/get-case-by-id";
import { formatDate } from "@/lib/utils";

/**
 * A presentational component that displays the key attributes of the case and the currently selected
 * image within the editor's side panel. It fetches its own data and presents it in a read-only.
 */
export const DetailsAttributesPanel = memo(() => {
  const params = useParams();
  const resultsId = params?.resultsId as string | undefined;

  // Fetches the full case data using Tanstack Query.
  const { data: caseData, isLoading: isCaseLoading } = useQuery({
    queryKey: ["case", resultsId],
    queryFn: () => getCaseById(resultsId!),
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
      <PanelInformationRow
        icon={IoFolderOpenOutline}
        label="Case Name"
        value={caseData.caseName || "N/A"}
        delay={0}
      />

      {/* Image Name */}
      <PanelInformationRow icon={IoImageOutline} label="Image Name" value={imageName} delay={0.1} />

      {/* Resolution */}
      <PanelInformationRow icon={BsAspectRatio} label="Resolution" value={resolution} delay={0.2} />

      {/* Case Date */}
      <PanelInformationRow
        icon={IoCalendarClearOutline}
        label="Case Date"
        value={formattedCaseDate}
        delay={0.3}
      />

      {/* Upload Date */}
      <PanelInformationRow
        icon={IoCalendarOutline}
        label="Upload Date"
        value={formattedUploadDate}
        delay={0.4}
      />

      {/* Temperature */}
      <PanelInformationRow
        icon={IoThermometerOutline}
        label="Temperature"
        value={`${caseData.temperatureCelsius}°C`}
        delay={0.5}
      />

      {/* Region */}
      <PanelInformationRow
        icon={PiMapTrifold}
        label="Region"
        value={caseData.locationRegion}
        delay={0.6}
      />

      {/* Province */}
      <PanelInformationRow
        icon={HiOutlineBuildingOffice}
        label="Province"
        value={caseData.locationProvince}
        delay={0.7}
      />

      {/* City/Municipality */}
      <PanelInformationRow
        icon={PiCity}
        label="City/Municipality"
        value={caseData.locationCity}
        delay={0.8}
      />

      {/* Barangay */}
      <PanelInformationRow
        icon={GoHome}
        label="Barangay"
        value={caseData.locationBarangay}
        delay={0.9}
      />
    </motion.div>
  );
});

DetailsAttributesPanel.displayName = "DetailsAttributesPanel";
