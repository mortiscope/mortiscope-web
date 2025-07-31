"use client";

import dynamic from "next/dynamic";
import React, { memo } from "react";
import { BeatLoader } from "react-spinners";

import { Card } from "@/components/ui/card";
import { type UploadWithDetections } from "@/features/results/components/results-analysis";
import {
  type ChartType,
  SummaryChartToolbar,
} from "@/features/results/components/summary-chart-toolbar";

/**
 * A reusable loading component displayed while a dynamic chart component is being fetched.
 * This ensures a consistent loading state across all chart types.
 */
const ChartLoader = () => (
  <div className="flex h-full w-full items-center justify-center">
    <BeatLoader color="#16a34a" size={12} />
  </div>
);

/**
 * A map of dynamically imported chart components.
 */
const ChartComponents = {
  "Bar Chart": dynamic(
    () =>
      import("@/features/results/components/results-bar-chart").then(
        (module) => module.ResultsBarChart
      ),
    { loading: () => <ChartLoader />, ssr: false }
  ),
  "Line Chart": dynamic(
    () =>
      import("@/features/results/components/results-line-chart").then(
        (module) => module.ResultsLineChart
      ),
    { loading: () => <ChartLoader />, ssr: false }
  ),
  "Composed Chart": dynamic(
    () =>
      import("@/features/results/components/results-composed-chart").then(
        (module) => module.ResultsComposedChart
      ),
    { loading: () => <ChartLoader />, ssr: false }
  ),
  "Pie Chart": dynamic(
    () =>
      import("@/features/results/components/results-pie-chart").then(
        (module) => module.ResultsPieChart
      ),
    { loading: () => <ChartLoader />, ssr: false }
  ),
  "Radar Chart": dynamic(
    () =>
      import("@/features/results/components/results-radar-chart").then(
        (module) => module.ResultsRadarChart
      ),
    { loading: () => <ChartLoader />, ssr: false }
  ),
};

/**
 * Defines the structure for a single data point used by the chart components.
 */
interface ChartData {
  name: string;
  quantity: number;
}

/**
 * Defines the props for the SummaryChartWidget component.
 */
interface SummaryChartWidgetProps {
  /** The currently selected chart type, used to pick the component from the dynamic map. */
  selectedChart: ChartType;
  /** A callback function to handle the selection of a new chart type. */
  onChartSelect: (chart: ChartType) => void;
  /** A callback function to open the information panel. */
  onInfoClick: () => void;
  /** The currently selected data source for the chart. */
  selectedDataSource: string;
  /** A callback function to handle the selection of a new data source. */
  onDataSourceSelect: (source: string) => void;
  /** An array of upload objects, passed to the toolbar for dynamic data source options. */
  uploads: UploadWithDetections[];
  /** A boolean to disable the data source selection dropdown. */
  isDataSourceDisabled: boolean;
  /** The formatted data array to be rendered by the selected chart. */
  chartData: ChartData[];
}

/**
 * A memoized 'smart' widget that renders the case summary chart. It orchestrates
 * the `SummaryChartToolbar` and dynamically renders the appropriate chart component
 * based on user selection, with built-in lazy loading and a loading state.
 */
export const SummaryChartWidget = memo(
  ({ selectedChart, chartData, uploads, ...toolbarProps }: SummaryChartWidgetProps) => {
    // Dynamically selects the correct, lazily-loaded chart component from the map.
    const SelectedChartComponent = ChartComponents[selectedChart];

    return (
      <Card className="font-inter col-span-1 flex h-96 flex-col rounded-3xl border-none bg-white p-4 shadow-none md:col-span-2 md:p-8 lg:col-span-4 lg:row-span-2 lg:h-auto">
        {/* Header section containing the widget title and the interactive toolbar. */}
        <div className="flex items-center justify-between">
          <h1 className="font-plus-jakarta-sans text-xl font-semibold text-slate-700 md:text-3xl">
            Case Summary
          </h1>
          {/* Renders the toolbar, passing down the necessary props. */}
          <SummaryChartToolbar selectedChart={selectedChart} uploads={uploads} {...toolbarProps} />
        </div>
        {/* The main content area where the selected chart will be rendered. */}
        <div className="mt-4 flex-grow">
          <SelectedChartComponent data={chartData} />
        </div>
      </Card>
    );
  }
);

SummaryChartWidget.displayName = "SummaryChartWidget";
