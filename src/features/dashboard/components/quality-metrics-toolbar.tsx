import React, { memo } from "react";
import { GoGitCompare } from "react-icons/go";
import { IoIosCellular } from "react-icons/io";
import { LuTrendingUp } from "react-icons/lu";

import { DashboardWidgetToolbar } from "@/features/dashboard/components/dashboard-widget-toolbar";

/**
 * A configuration array that defines the available views for the Quality Metrics widget.
 */
const viewOptions = [
  { value: "performance", icon: LuTrendingUp, label: "Model Performance by Stage" },
  { value: "correction", icon: GoGitCompare, label: "User Correction Ratio" },
  { value: "confidence", icon: IoIosCellular, label: "Confidence Score Distribution" },
] as const;

/**
 * Exports a TypeScript type representing the valid view options, derived from the configuration array.
 */
export type QualityView = (typeof viewOptions)[number]["value"];

/**
 * Defines the props for the quality metrics toolbar component.
 */
interface QualityMetricsToolbarProps {
  /** The currently selected view. */
  selectedView: QualityView;
  /** A callback function to handle the selection of a new view. */
  onViewSelect: (view: QualityView) => void;
  /** A callback function to handle the information button click. */
  onInfoClick: () => void;
}

/**
 * A memoized component that renders the toolbar for the quality metrics widget.
 */
export const QualityMetricsToolbar = memo(
  ({ selectedView, onViewSelect, onInfoClick }: QualityMetricsToolbarProps) => {
    return (
      <DashboardWidgetToolbar
        viewOptions={viewOptions}
        selectedView={selectedView}
        onViewSelect={onViewSelect}
        onInfoClick={onInfoClick}
        defaultIcon={LuTrendingUp}
      />
    );
  }
);

QualityMetricsToolbar.displayName = "QualityMetricsToolbar";
