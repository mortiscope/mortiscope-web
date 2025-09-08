import React, { memo } from "react";
import { IoHourglassOutline } from "react-icons/io5";
import { PiCirclesThree, PiRecycle } from "react-icons/pi";

import { DashboardWidgetToolbar } from "@/features/dashboard/components/dashboard-widget-toolbar";

/**
 * A configuration array that defines the available views for the forensic insights widget.
 */
const viewOptions = [
  { value: "life-stage", icon: PiRecycle, label: "Life Stage Distribution" },
  { value: "pmi", icon: IoHourglassOutline, label: "PMI Distribution" },
  { value: "sampling", icon: PiCirclesThree, label: "Sampling Density" },
] as const;

/**
 * Exports a TypeScript type representing the valid view options, derived from the configuration array.
 */
export type ForensicView = (typeof viewOptions)[number]["value"];

/**
 * Defines the props for the forensic insights toolbar component.
 */
interface ForensicInsightsToolbarProps {
  /** The currently selected view. */
  selectedView: ForensicView;
  /** A callback function to handle the selection of a new view. */
  onViewSelect: (view: ForensicView) => void;
  /** A callback function to handle the information button click. */
  onInfoClick: () => void;
}

/**
 * A memoized component that renders the toolbar for the forensic insights widget.
 */
export const ForensicInsightsToolbar = memo(
  ({ selectedView, onViewSelect, onInfoClick }: ForensicInsightsToolbarProps) => {
    return (
      <DashboardWidgetToolbar
        viewOptions={viewOptions}
        selectedView={selectedView}
        onViewSelect={onViewSelect}
        onInfoClick={onInfoClick}
        defaultIcon={PiRecycle}
      />
    );
  }
);

ForensicInsightsToolbar.displayName = "ForensicInsightsToolbar";
