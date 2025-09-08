import React, { memo } from "react";
import { IoFolderOpenOutline, IoImagesOutline } from "react-icons/io5";
import { PiBoundingBox } from "react-icons/pi";

import { DashboardWidgetToolbar } from "@/features/dashboard/components/dashboard-widget-toolbar";

/**
 * A configuration array that defines the available views for the verification status widget.
 */
const viewOptions = [
  { value: "case", icon: IoFolderOpenOutline, label: "Case Verification Status" },
  { value: "image", icon: IoImagesOutline, label: "Image Verification Status" },
  { value: "detection", icon: PiBoundingBox, label: "Detection Verification Status" },
] as const;

/**
 * Exports a TypeScript type representing the valid view options, derived from the configuration array.
 */
export type VerificationView = (typeof viewOptions)[number]["value"];

/**
 * Defines the props for the verification status toolbar component.
 */
interface VerificationStatusToolbarProps {
  /** The currently selected view. */
  selectedView: VerificationView;
  /** A callback function to handle the selection of a new view. */
  onViewSelect: (view: VerificationView) => void;
  /** A callback function to handle the information button click. */
  onInfoClick: () => void;
}

/**
 * A memoized component that renders the toolbar for the verification status widget.
 */
export const VerificationStatusToolbar = memo(
  ({ selectedView, onViewSelect, onInfoClick }: VerificationStatusToolbarProps) => {
    return (
      <DashboardWidgetToolbar
        viewOptions={viewOptions}
        selectedView={selectedView}
        onViewSelect={onViewSelect}
        onInfoClick={onInfoClick}
        defaultIcon={IoFolderOpenOutline}
      />
    );
  }
);

VerificationStatusToolbar.displayName = "VerificationStatusToolbar";
