"use client";

import { memo, useMemo } from "react";
import { GoUnverified, GoVerified } from "react-icons/go";
import { PiScan } from "react-icons/pi";
import BeatLoader from "react-spinners/BeatLoader";

import { PanelListItem } from "@/features/annotation/components/panel-list-item";
import { PanelSectionHeader } from "@/features/annotation/components/panel-section-header";
import { useEditorImage } from "@/features/annotation/hooks/use-editor-image";
import { useAnnotationStore } from "@/features/annotation/store/annotation-store";

/**
 * A presentational component that displays the annotation details for the currently active
 * image within the editor's side panel. It shows a breakdown of detected objects by life stage.
 */
export const DetailsAnnotationPanel = memo(() => {
  // A custom hook to get the specific image data for the current editor view.
  const { isLoading } = useEditorImage();

  // Get the live detections from the store (includes user edits)
  const detections = useAnnotationStore((state) => state.detections);

  /**
   * Memoizes the calculation of detection counts for each life stage,
   * separated by verification status.
   */
  const { totalCounts, unverifiedCounts, verifiedCounts } = useMemo(() => {
    // Initialize count objects
    const total: Record<string, number> = {
      instar_1: 0,
      instar_2: 0,
      instar_3: 0,
      pupa: 0,
      adult: 0,
    };

    const unverified: Record<string, number> = {
      instar_1: 0,
      instar_2: 0,
      instar_3: 0,
      pupa: 0,
      adult: 0,
    };

    const verified: Record<string, number> = {
      instar_1: 0,
      instar_2: 0,
      instar_3: 0,
      pupa: 0,
      adult: 0,
    };

    // Iterate over detections and count by label and status
    detections.forEach((detection) => {
      if (total[detection.label] !== undefined) {
        // Increment total count
        total[detection.label]++;

        // Increment verified or unverified count based on status
        if (detection.status === "user_confirmed" || detection.status === "user_edited_confirmed") {
          verified[detection.label]++;
        } else {
          unverified[detection.label]++;
        }
      }
    });

    return {
      totalCounts: total,
      unverifiedCounts: unverified,
      verifiedCounts: verified,
    };
  }, [detections]);

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
        <PanelSectionHeader icon={PiScan} title="Detections" colorVariant="emerald" delay={0} />
        <div className="space-y-2">
          <PanelListItem
            label="First Instar"
            value={totalCounts.instar_1}
            colorVariant="emerald"
            delay={0.05}
          />
          <PanelListItem
            label="Second Instar"
            value={totalCounts.instar_2}
            colorVariant="emerald"
            delay={0.1}
          />
          <PanelListItem
            label="Third Instar"
            value={totalCounts.instar_3}
            colorVariant="emerald"
            delay={0.15}
          />
          <PanelListItem label="Pupa" value={totalCounts.pupa} colorVariant="emerald" delay={0.2} />
          <PanelListItem
            label="Adult Flies"
            value={totalCounts.adult}
            colorVariant="emerald"
            delay={0.25}
          />
        </div>
      </div>

      {/* Unverified Section */}
      <div className="space-y-3">
        <PanelSectionHeader
          icon={GoUnverified}
          title="Unverified"
          colorVariant="amber"
          delay={0.3}
        />
        <div className="space-y-2">
          <PanelListItem
            label="First Instar"
            value={unverifiedCounts.instar_1}
            colorVariant="amber"
            delay={0.35}
          />
          <PanelListItem
            label="Second Instar"
            value={unverifiedCounts.instar_2}
            colorVariant="amber"
            delay={0.4}
          />
          <PanelListItem
            label="Third Instar"
            value={unverifiedCounts.instar_3}
            colorVariant="amber"
            delay={0.45}
          />
          <PanelListItem
            label="Pupa"
            value={unverifiedCounts.pupa}
            colorVariant="amber"
            delay={0.5}
          />
          <PanelListItem
            label="Adult Flies"
            value={unverifiedCounts.adult}
            colorVariant="amber"
            delay={0.55}
          />
        </div>
      </div>

      {/* Verified Section */}
      <div className="space-y-3">
        <PanelSectionHeader icon={GoVerified} title="Verified" colorVariant="teal" delay={0.6} />
        <div className="space-y-2">
          <PanelListItem
            label="First Instar"
            value={verifiedCounts.instar_1}
            colorVariant="teal"
            delay={0.65}
          />
          <PanelListItem
            label="Second Instar"
            value={verifiedCounts.instar_2}
            colorVariant="teal"
            delay={0.7}
          />
          <PanelListItem
            label="Third Instar"
            value={verifiedCounts.instar_3}
            colorVariant="teal"
            delay={0.75}
          />
          <PanelListItem label="Pupa" value={verifiedCounts.pupa} colorVariant="teal" delay={0.8} />
          <PanelListItem
            label="Adult Flies"
            value={verifiedCounts.adult}
            colorVariant="teal"
            delay={0.85}
          />
        </div>
      </div>
    </div>
  );
});

DetailsAnnotationPanel.displayName = "DetailsAnnotationPanel";
