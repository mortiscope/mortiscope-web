"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { DateRange } from "react-day-picker";
import { GoGitCompare } from "react-icons/go";
import { IoIosCellular } from "react-icons/io";
import { LuTrendingUp } from "react-icons/lu";
import { BeatLoader } from "react-spinners";

import { Card, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  QualityMetricsToolbar,
  type QualityView,
} from "@/features/dashboard/components/quality-metrics-toolbar";
import { useQualityMetricsPoller } from "@/features/dashboard/hooks/use-quality-metrics-poller";

/**
 * A reusable loading component displayed while a dynamic chart component is being fetched or its data is loading.
 */
const ChartLoader = () => (
  <div className="flex h-full w-full items-center justify-center">
    <BeatLoader color="#16a34a" size={12} />
  </div>
);

const DashboardLineChart = dynamic(
  () =>
    import("@/features/dashboard/components/dashboard-line-chart").then(
      (module) => module.DashboardLineChart
    ),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
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

const DashboardDistributionChart = dynamic(
  () =>
    import("@/features/dashboard/components/dashboard-distribution-chart").then(
      (module) => module.DashboardDistributionChart
    ),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

/**
 * Dynamically loads the quality metrics modal component on the client-side.
 */
const QualityMetricsModal = dynamic(
  () =>
    import("@/features/dashboard/components/quality-metrics-modal").then(
      (module) => module.QualityMetricsModal
    ),
  {
    ssr: false,
  }
);

/**
 * A configuration array that defines the available views for the widget.
 */
const viewOptions = [
  { value: "performance", icon: LuTrendingUp, label: "Model Performance by Stage" },
  { value: "correction", icon: GoGitCompare, label: "User Correction Ratio" },
  { value: "confidence", icon: IoIosCellular, label: "Confidence Score Distribution" },
] as const;

interface QualityMetricsWidgetProps {
  dateRange: DateRange | undefined;
}

/**
 * A smart widget component that displays various data quality metrics.
 */
export const QualityMetricsWidget = ({ dateRange }: QualityMetricsWidgetProps) => {
  /** Local state to manage the currently selected view. */
  const [selectedView, setSelectedView] = useState<QualityView>("performance");
  /** Local state to manage the modal open/close state. */
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * Forces the widget out of the skeleton state after 15 seconds.
   */
  const [skeletonTimedOut, setSkeletonTimedOut] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSkeletonTimedOut(true), 15000);
    return () => clearTimeout(timer);
  }, []);

  /**
   * Smart polling hook that fetches and polls quality metrics data
   */
  const { modelPerformanceData, correctionData, confidenceData, isFetching } =
    useQualityMetricsPoller({ dateRange });

  /**
   * Memoized callback for view selection to prevent unnecessary toolbar re-renders.
   */
  const handleViewSelect = useCallback((view: QualityView) => {
    setSelectedView(view);
  }, []);

  /** Finds the configuration object for the currently selected view. */
  const currentOption = viewOptions.find((o) => o.value === selectedView);
  /** Dynamically selects the icon for the currently selected view's title. */
  const CurrentIcon = currentOption?.icon ?? LuTrendingUp;

  /**
   * Memoized callback to handle opening the information modal.
   */
  const handleInfoClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  // Show skeleton during initial data loading, but force exit after 15 seconds.
  const isInitialLoading =
    !modelPerformanceData && !correctionData && !confidenceData && isFetching && !skeletonTimedOut;
  if (isInitialLoading) {
    return <Skeleton className="col-span-1 h-64 rounded-3xl bg-white lg:col-span-2" />;
  }

  return (
    <Card
      data-testid="quality-metrics-card"
      className="font-inter relative col-span-1 flex h-64 flex-col gap-0 overflow-hidden rounded-3xl border-none bg-white px-6 py-4 shadow-none transition-all duration-300 lg:col-span-2"
    >
      {/* Header section containing the widget title and toolbar. */}
      <div className="flex items-center justify-between">
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
        <QualityMetricsToolbar
          selectedView={selectedView}
          onViewSelect={handleViewSelect}
          onInfoClick={handleInfoClick}
        />
      </div>
      {/* Conditionally renders the appropriate chart based on the selected view state. */}
      {selectedView === "performance" && (
        <div className="min-h-0 flex-1">
          {/* Shows a loader if there's no data. */}
          {!modelPerformanceData || modelPerformanceData.length === 0 ? (
            <ChartLoader />
          ) : (
            <DashboardLineChart data={modelPerformanceData} />
          )}
        </div>
      )}
      {selectedView === "correction" && (
        <div className="min-h-0 flex-1">
          {!correctionData || correctionData.length === 0 ? (
            <ChartLoader />
          ) : (
            <DashboardPieChart data={correctionData} />
          )}
        </div>
      )}
      {selectedView === "confidence" && (
        <div className="min-h-0 flex-1 [&_.recharts-y-axis]:hidden">
          {!confidenceData || confidenceData.length === 0 ? (
            <ChartLoader />
          ) : (
            <DashboardDistributionChart data={confidenceData} />
          )}
        </div>
      )}
      {/* Lazy-loaded modal for quality metrics information */}
      <QualityMetricsModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
    </Card>
  );
};

QualityMetricsWidget.displayName = "QualityMetricsWidget";
