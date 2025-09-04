"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { IoFolderOpenOutline, IoImagesOutline } from "react-icons/io5";
import { PiBoundingBox } from "react-icons/pi";
import { BeatLoader } from "react-spinners";

import { Card, CardTitle } from "@/components/ui/card";
import { getVerificationStatus } from "@/features/dashboard/actions/get-verification-status";
import {
  VerificationStatusToolbar,
  type VerificationView,
} from "@/features/dashboard/components/verification-status-toolbar";

/**
 * A reusable loading component displayed while the chart's data is loading.
 */
const ChartLoader = () => (
  <div className="flex h-full w-full items-center justify-center">
    <BeatLoader color="#16a34a" size={12} />
  </div>
);

const DashboardPieChart = dynamic(
  () =>
    import("@/features/dashboard/components/dashboard-pie-chart").then(
      (module) => module.DashboardPieChart
    ),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

/**
 * A configuration array that defines the available views for the widget.
 */
const viewOptions = [
  { value: "case", icon: IoFolderOpenOutline, label: "Case Verification Status" },
  { value: "image", icon: IoImagesOutline, label: "Image Verification Status" },
  { value: "detection", icon: PiBoundingBox, label: "Detection Verification Status" },
] as const;

/**
 * Defines the shape of the verification metrics data fetched from the server.
 */
interface VerificationMetrics {
  caseVerification: { verified: number; unverified: number; inProgress: number };
  imageVerification: { verified: number; unverified: number; inProgress: number };
  detectionVerification: { verified: number; unverified: number };
}

/**
 * A smart widget component that displays various verification status metrics.
 */
export const VerificationStatusWidget = () => {
  /** Local state to manage the currently selected view. */
  const [selectedView, setSelectedView] = useState<VerificationView>("case");
  /** Local state to store the comprehensive verification metrics fetched from the server. */
  const [metrics, setMetrics] = useState<VerificationMetrics | null>(null);

  /** Finds the configuration object for the currently selected view. */
  const currentOption = viewOptions.find((o) => o.value === selectedView);
  /** Dynamically selects the icon for the currently selected view's title. */
  const CurrentIcon = currentOption?.icon ?? IoFolderOpenOutline;

  /**
   * A side effect that fetches the verification metrics from the server when the component first mounts.
   */
  useEffect(() => {
    const fetchMetrics = async () => {
      const data = await getVerificationStatus();
      setMetrics(data);
    };
    void fetchMetrics();
  }, []);

  /**
   * Memoizes the transformation of the raw metrics into the specific format required by the pie chart.
   */
  const chartData = useMemo(() => {
    if (!metrics) return [];

    switch (selectedView) {
      case "case":
        return [
          { name: "verified", quantity: metrics.caseVerification.verified },
          { name: "in_progress", quantity: metrics.caseVerification.inProgress },
          { name: "unverified", quantity: metrics.caseVerification.unverified },
        ];
      case "image":
        return [
          { name: "verified", quantity: metrics.imageVerification.verified },
          { name: "in_progress", quantity: metrics.imageVerification.inProgress },
          { name: "unverified", quantity: metrics.imageVerification.unverified },
        ];
      case "detection":
        return [
          { name: "verified", quantity: metrics.detectionVerification.verified },
          { name: "unverified", quantity: metrics.detectionVerification.unverified },
        ];
      default:
        return [];
    }
  }, [metrics, selectedView]);

  return (
    <Card className="font-inter relative col-span-1 flex h-64 flex-col gap-0 overflow-hidden rounded-3xl border-none bg-white px-6 py-4 shadow-none transition-all duration-300 lg:col-span-2">
      {/* Header section containing the widget title and toolbar. */}
      <div className="flex flex-shrink-0 items-center justify-between">
        <div>
          {/* Manages the animated transition of the title text when the view changes. */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedView}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex items-center gap-2"
            >
              <CurrentIcon className="h-5 w-5 flex-shrink-0 text-slate-600" />
              <CardTitle className="font-inter text-sm font-normal text-slate-900">
                {currentOption?.label}
              </CardTitle>
            </motion.div>
          </AnimatePresence>
        </div>
        <VerificationStatusToolbar selectedView={selectedView} onViewSelect={setSelectedView} />
      </div>
      {/* The main content area where the chart is rendered. */}
      <div className="min-h-0 flex-1">
        {/* Shows a loader if the chart data has not yet been fetched and processed. */}
        {chartData.length === 0 ? <ChartLoader /> : <DashboardPieChart data={chartData} />}
      </div>
    </Card>
  );
};

VerificationStatusWidget.displayName = "VerificationStatusWidget";
