"use client";

import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DateRange } from "react-day-picker";
import { IoHourglassOutline } from "react-icons/io5";
import { PiCirclesThree, PiRecycle } from "react-icons/pi";
import { BeatLoader } from "react-spinners";

import { Card } from "@/components/ui/card";
import { getLifeStageDistribution } from "@/features/dashboard/actions/get-life-stage-distribution";
import { getPmiDistribution } from "@/features/dashboard/actions/get-pmi-distribution";
import { getSamplingDensity } from "@/features/dashboard/actions/get-sampling-density";
import {
  ForensicInsightsToolbar,
  type ForensicView,
} from "@/features/dashboard/components/forensic-insights-toolbar";
import {
  DETECTION_CLASS_COLORS,
  PMI_INTERVAL_LABELS,
  SAMPLING_DENSITY_LABELS,
} from "@/lib/constants";

/**
 * A reusable loading component displayed while the dynamic chart component is being fetched.
 */
const ChartLoader = () => (
  <div className="flex h-full w-full items-center justify-center">
    <BeatLoader color="#16a34a" size={12} />
  </div>
);

/**
 * Dynamically loads the dashboard bar chart component on the client-side.
 */
const DashboardBarChart = dynamic(
  () =>
    import("@/features/dashboard/components/dashboard-bar-chart").then(
      (module) => module.DashboardBarChart
    ),
  {
    loading: () => <ChartLoader />,
    ssr: false,
  }
);

/**
 * Dynamically loads the forensic insights modal component on the client-side.
 */
const ForensicInsightsModal = dynamic(
  () =>
    import("@/features/dashboard/components/forensic-insights-modal").then(
      (module) => module.ForensicInsightsModal
    ),
  {
    ssr: false,
  }
);

/**
 * A configuration array that defines the available views for the widget.
 */
const viewOptions = [
  { value: "life-stage", icon: PiRecycle, label: "Life Stage Distribution" },
  { value: "pmi", icon: IoHourglassOutline, label: "PMI Distribution" },
  { value: "sampling", icon: PiCirclesThree, label: "Sampling Density" },
] as const;

/**
 * Defines the shape of the data points used by the charts in this widget.
 */
interface LifeStageData {
  name: string;
  quantity: number;
}

interface ForensicInsightsWidgetProps {
  dateRange: DateRange | undefined;
}

/**
 * A 'smart' widget component that displays various forensic insights using a bar chart.
 */
export const ForensicInsightsWidget = ({ dateRange }: ForensicInsightsWidgetProps) => {
  /** Local state to manage the currently selected view. */
  const [selectedView, setSelectedView] = useState<ForensicView>("life-stage");

  /**
   * Memoized callback for view selection to prevent unnecessary toolbar re-renders.
   */
  const handleViewSelect = useCallback((view: ForensicView) => {
    setSelectedView(view);
  }, []);
  /** Local state to store the fetched data for the 'life-stage' view. */
  const [lifeStageData, setLifeStageData] = useState<LifeStageData[] | null>(null);
  /** Local state to store the fetched data for the 'pmi' view. */
  const [pmiData, setPmiData] = useState<LifeStageData[] | null>(null);
  /** Local state to store the fetched data for the 'sampling' view. */
  const [samplingData, setSamplingData] = useState<LifeStageData[] | null>(null);
  /** Local state to manage the modal open/close state. */
  const [isModalOpen, setIsModalOpen] = useState(false);

  /** Finds the configuration object for the currently selected view. */
  const currentOption = viewOptions.find((o) => o.value === selectedView);
  /** Dynamically selects the icon for the currently selected view. */
  const CurrentIcon = currentOption?.icon ?? PiRecycle;

  /**
   * A side effect that fetches all necessary data for all views when the date range changes.
   */
  useEffect(() => {
    const fetchLifeStageData = async () => {
      const data = await getLifeStageDistribution(dateRange?.from, dateRange?.to);
      setLifeStageData(data);
    };
    void fetchLifeStageData();

    const fetchPmiData = async () => {
      const data = await getPmiDistribution(dateRange?.from, dateRange?.to);
      setPmiData(data);
    };
    void fetchPmiData();

    const fetchSamplingData = async () => {
      const data = await getSamplingDensity(dateRange?.from, dateRange?.to);
      setSamplingData(data);
    };
    void fetchSamplingData();
  }, [dateRange]);

  /**
   * Memoizes the selection of the correct dataset for the chart.
   */
  const chartData = useMemo(() => {
    switch (selectedView) {
      case "life-stage":
        return lifeStageData || [];
      case "pmi":
        return pmiData || [];
      case "sampling":
        return samplingData || [];
      default:
        return [];
    }
  }, [lifeStageData, pmiData, samplingData, selectedView]);

  /**
   * Memoizes the configuration object for the bar chart.
   */
  const chartConfig = useMemo(() => {
    switch (selectedView) {
      case "life-stage":
        return {
          colorMap: DETECTION_CLASS_COLORS,
          labelMap: undefined,
          xAxisLabel: "Life Stage",
          yAxisLabel: "Quantity",
        };
      case "pmi":
        return {
          colorMap: { default: "#ef4444" },
          labelMap: PMI_INTERVAL_LABELS,
          xAxisLabel: "Time Interval",
          yAxisLabel: "Number of Cases",
        };
      case "sampling":
        return {
          colorMap: { default: "#14b8a6" },
          labelMap: SAMPLING_DENSITY_LABELS,
          xAxisLabel: "Image Count",
          yAxisLabel: "Number of Cases",
        };
      default:
        return {
          colorMap: DETECTION_CLASS_COLORS,
          labelMap: undefined,
          xAxisLabel: "Life Stage",
          yAxisLabel: "Quantity",
        };
    }
  }, [selectedView]);

  /**
   * Memoized callback to handle opening the information modal.
   */
  const handleInfoClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  return (
    <Card className="font-inter col-span-1 flex h-64 flex-col gap-2 rounded-3xl border-none bg-white px-4 pt-4 pb-2 shadow-none md:col-span-2 md:h-96 md:px-8 md:pt-8 md:pb-4 lg:col-span-4 lg:row-span-2 lg:h-auto">
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
              <CurrentIcon className="h-5 w-5 flex-shrink-0 text-slate-600 md:hidden" />
              <h1 className="font-inter md:font-plus-jakarta-sans text-sm font-normal text-slate-900 md:text-xl md:font-semibold md:text-slate-700 lg:text-3xl">
                {currentOption?.label}
              </h1>
            </motion.div>
          </AnimatePresence>
        </div>
        <ForensicInsightsToolbar
          selectedView={selectedView}
          onViewSelect={handleViewSelect}
          onInfoClick={handleInfoClick}
        />
      </div>
      {/* The main content area where the chart is rendered. */}
      <div className="min-h-0 flex-1">
        {/* Shows a loader if the data for the current view has not yet been fetched. */}
        {chartData.length === 0 ? (
          <ChartLoader />
        ) : (
          <DashboardBarChart
            data={chartData}
            colorMap={chartConfig.colorMap}
            labelMap={chartConfig.labelMap}
            xAxisLabel={chartConfig.xAxisLabel}
            yAxisLabel={chartConfig.yAxisLabel}
          />
        )}
      </div>
      {/* Lazy-loaded modal for forensic insights information */}
      <ForensicInsightsModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
    </Card>
  );
};

ForensicInsightsWidget.displayName = "ForensicInsightsWidget";
