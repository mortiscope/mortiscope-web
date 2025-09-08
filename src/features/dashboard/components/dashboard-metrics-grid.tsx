"use client";

import { useEffect, useMemo } from "react";
import { DateRange } from "react-day-picker";
import {
  FaBrain,
  FaCamera,
  FaCheckCircle,
  FaEdit,
  FaHourglassHalf,
  FaVectorSquare,
} from "react-icons/fa";

import { Card, CardTitle } from "@/components/ui/card";
import { getDashboardMetrics } from "@/features/dashboard/actions/get-dashboard-metrics";
import { DashboardMetricsGridSkeleton } from "@/features/dashboard/components/dashboard-skeleton";
import { useMetricsPoller } from "@/features/dashboard/hooks/use-metrics-poller";
import { formatConfidence } from "@/lib/utils";

interface DashboardMetricsGridProps {
  initialData: Awaited<ReturnType<typeof getDashboardMetrics>>;
  dateRange: DateRange | undefined;
  onLoadingChange?: (isLoading: boolean) => void;
}

// Define the color themes for the cards outside the component to avoid recreation on every render.
const colorThemes = [
  {
    bg: "bg-gradient-to-br from-teal-500 to-teal-700 transition duration-300 ease-in-out hover:from-teal-400 hover:to-teal-600",
    text: "text-teal-50",
    icon: "text-teal-200",
  },
  {
    bg: "bg-gradient-to-br from-emerald-500 to-emerald-700 transition duration-300 ease-in-out hover:from-emerald-400 hover:to-emerald-600",
    text: "text-emerald-50",
    icon: "text-emerald-200",
  },
  {
    bg: "bg-gradient-to-br from-indigo-500 to-indigo-700 transition duration-300 ease-in-out hover:from-indigo-400 hover:to-indigo-600",
    text: "text-indigo-50",
    icon: "text-indigo-200",
  },
  {
    bg: "bg-gradient-to-br from-sky-500 to-sky-700 transition duration-300 ease-in-out hover:from-sky-400 hover:to-sky-600",
    text: "text-sky-50",
    icon: "text-sky-200",
  },
  {
    bg: "bg-gradient-to-br from-rose-500 to-rose-700 transition duration-300 ease-in-out hover:from-rose-400 hover:to-rose-600",
    text: "text-rose-50",
    icon: "text-rose-200",
  },
  {
    bg: "bg-gradient-to-br from-pink-500 to-pink-700 transition duration-300 ease-in-out hover:from-pink-400 hover:to-pink-600",
    text: "text-pink-50",
    icon: "text-pink-200",
  },
];

/**
 * A client component that displays key dashboard metrics.
 * It accepts initial data from the server and polls for updates.
 */
export const DashboardMetricsGrid = ({
  initialData,
  dateRange,
  onLoadingChange,
}: DashboardMetricsGridProps) => {
  const { data, isFetching } = useMetricsPoller(initialData, dateRange);

  // Notify parent component of loading state changes
  useEffect(() => {
    onLoadingChange?.(isFetching);
  }, [isFetching, onLoadingChange]);

  // Use the data from the hook (which starts with initialData and updates via polling)
  const {
    verified,
    totalCases,
    totalImages,
    verifiedImages,
    totalDetectionsCount,
    verifiedDetectionsCount,
    averagePMI,
    averageConfidence,
    correctionRate,
  } = data || initialData;

  // Check if there's no data
  const hasNoData = totalCases === 0;

  // Array of metric items to be mapped into cards.
  const metrics = useMemo(
    () => [
      {
        title: "Verified Cases",
        icon: FaCheckCircle,
        value: hasNoData ? "0 / 0" : `${verified} / ${totalCases}`,
      },
      {
        title: "Verified Images",
        icon: FaCamera,
        value: hasNoData ? "0 / 0" : `${verifiedImages} / ${totalImages}`,
      },
      {
        title: "Verified Detections",
        icon: FaVectorSquare,
        value: hasNoData ? "0 / 0" : `${verifiedDetectionsCount} / ${totalDetectionsCount}`,
      },
      {
        title: "Average PMI Estimation",
        icon: FaHourglassHalf,
        value: hasNoData ? "—" : `${averagePMI.toFixed(2)} hours`,
      },
      {
        title: "Average Confidence Score",
        icon: FaBrain,
        value: hasNoData ? "—" : formatConfidence(averageConfidence),
      },
      {
        title: "Correction Rate",
        icon: FaEdit,
        value: hasNoData ? "—" : `${correctionRate.toFixed(1)}%`,
      },
    ],
    [
      hasNoData,
      verified,
      totalCases,
      verifiedImages,
      totalImages,
      verifiedDetectionsCount,
      totalDetectionsCount,
      averagePMI,
      averageConfidence,
      correctionRate,
    ]
  );

  // Show skeleton only on initial load
  if (isFetching && !data) {
    return <DashboardMetricsGridSkeleton />;
  }

  return (
    // The main grid container.
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {metrics.map((metric, index) => {
        // Selects a color theme from the array based on the index.
        const theme = colorThemes[index % colorThemes.length];
        const Icon = metric.icon;

        return (
          // Renders a single metric card with the applied theme.
          <Card
            key={metric.title}
            className={`group relative flex h-40 cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border-none p-4 shadow-lg shadow-gray-900/10 transition-all duration-500 ease-in-out outline-none ${theme.bg}`}
          >
            {/* A large, decorative background icon for visual flair. */}
            <Icon
              className={`absolute -right-4 -bottom-4 h-20 w-20 opacity-20 transition-transform duration-500 ease-in-out group-hover:scale-110 ${theme.icon}`}
            />

            {/* The card's header section. */}
            <div className="relative flex min-w-0 items-center gap-2">
              <Icon className={`h-5 w-5 flex-shrink-0 ${theme.icon}`} />
              <CardTitle className={`font-inter truncate text-sm font-normal ${theme.text}`}>
                {metric.title}
              </CardTitle>
            </div>

            {/* The main content area displaying the metric value. */}
            <div
              className={`font-plus-jakarta-sans relative line-clamp-3 text-lg font-semibold md:text-xl ${theme.text}`}
            >
              {metric.value}
            </div>
          </Card>
        );
      })}
    </div>
  );
};

DashboardMetricsGrid.displayName = "DashboardMetricsGrid";
