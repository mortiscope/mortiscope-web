"use client";

import { memo, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type TooltipProps } from "recharts";

import { DETECTION_CLASS_COLORS } from "@/lib/constants";
import { formatLabel } from "@/lib/utils";

/**
 * Defines the shape of a single data point that this chart component expects.
 */
interface ChartDataPoint {
  name: string;
  quantity: number;
}

/**
 * Defines the props for the dashboard bar chart component.
 */
interface DashboardBarChartProps {
  /** The processed data array to be rendered by the chart. */
  data: ChartDataPoint[];
  /** An optional map to override the default colors for specific data `name` keys. */
  colorMap?: Record<string, string>;
  /** An optional map to provide custom display labels for specific data `name` keys. */
  labelMap?: Record<string, string>;
  /** An optional label to display below the X-axis. */
  xAxisLabel?: string;
  /** An optional label to display beside the Y-axis. */
  yAxisLabel?: string;
}

/**
 * Defines the props for the custom tooltip, extending the base Recharts tooltip props.
 */
interface CustomTooltipProps extends TooltipProps<number, string> {
  total: number;
  labelMap?: Record<string, string>;
}

/**
 * A custom tooltip component for the Recharts chart.
 */
const CustomTooltip = ({ active, payload, label, total, labelMap }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const value = payload[0].value as number;
    // Calculate the percentage of the current data point relative to the total.
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
    // Use the custom label map if provided, otherwise format the default label.
    const displayLabel = labelMap ? labelMap[label] || label : formatLabel(label);

    return (
      <div className="font-inter rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal shadow-lg">
        <p className="font-semibold">{displayLabel}</p>
        <p>{`Quantity: ${value}`}</p>
        <p>{`Percentage: ${percentage}%`}</p>
      </div>
    );
  }

  return null;
};

/**
 * A reusable, responsive bar chart component designed for dashboard widgets.
 */
export const DashboardBarChart = memo(
  ({
    data,
    colorMap = DETECTION_CLASS_COLORS,
    labelMap,
    xAxisLabel = "Life Stage",
    yAxisLabel = "Quantity",
  }: DashboardBarChartProps) => {
    // State to track the index of the currently hovered bar for interactive highlighting.
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    // State to manage responsive chart elements that change with viewport size.
    const [fontSize, setFontSize] = useState(14);
    const [axisHeight, setAxisHeight] = useState(50);
    const [labelOffset, setLabelOffset] = useState(-8);
    const [maxBarSize, setMaxBarSize] = useState(40);
    const [barRadius, setBarRadius] = useState<[number, number, number, number]>([8, 8, 0, 0]);

    // New state variables for Y-axis spacing
    const [yAxisWidth, setYAxisWidth] = useState(70);
    const [yAxisDx, setYAxisDx] = useState(-18);

    /**
     * A side effect that listens for window resize events to update responsive chart values.
     * This ensures the chart's typography, spacing, and bar sizes adapt to different screen sizes.
     */
    useEffect(() => {
      const updateResponsiveValues = () => {
        const isSmallScreen = window.innerWidth < 768;

        setFontSize(isSmallScreen ? 10 : 14);
        setAxisHeight(isSmallScreen ? 40 : 50);
        setLabelOffset(isSmallScreen ? -8 : -5);
        setMaxBarSize(isSmallScreen ? 24 : 48);
        setBarRadius(isSmallScreen ? [4, 4, 0, 0] : [8, 8, 0, 0]);

        // Decrease width and spacing (dx) on small screens to bring title closer to labels
        setYAxisWidth(isSmallScreen ? 50 : 70);
        setYAxisDx(isSmallScreen ? -10 : -18);
      };

      // Set initial values on component mount.
      updateResponsiveValues();
      // Add event listener for window resize.
      window.addEventListener("resize", updateResponsiveValues);
      // Remove the event listener when the component unmounts.
      return () => window.removeEventListener("resize", updateResponsiveValues);
    }, []);

    /**
     * Memoizes the calculation of the total quantity, used for percentage calculations in the tooltip.
     */
    const total = useMemo(() => {
      return data.reduce((sum, entry) => sum + entry.quantity, 0);
    }, [data]);

    /**
     * Memoizes the unique set of colors used by the bars in the chart.
     */
    const uniqueColors = useMemo(() => {
      return [
        ...new Set(data.map((entry) => colorMap[entry.name] || colorMap.default || "#64748b")),
      ];
    }, [data, colorMap]);

    return (
      <div className="h-full w-full overflow-hidden">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <BarChart
            data={data}
            margin={{
              top: 20,
              right: 0,
              bottom: 20,
              left: 0,
            }}
            // Resets the hover state when the mouse leaves the chart area.
            onMouseLeave={() => setActiveIndex(null)}
          >
            {/* SVG definitions for reusable linear gradients. */}
            <defs>
              {/* Dynamically generates a unique gradient for each unique bar color found in the data. */}
              {uniqueColors.map((color, index) => (
                <linearGradient
                  key={`gradient-${index}`}
                  id={`colorGradient-${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>

            {/* Chart components for axes, grid, and tooltips. */}
            <CartesianGrid
              strokeDasharray="4 4"
              vertical={false}
              strokeOpacity={0.5}
              className="stroke-slate-300"
            />
            <XAxis
              dataKey="name"
              tickFormatter={(value) => (labelMap ? labelMap[value] || value : formatLabel(value))}
              tickLine={false}
              axisLine={false}
              fontSize={fontSize}
              className="fill-slate-500"
              label={{
                value: xAxisLabel,
                position: "insideBottom",
                offset: labelOffset,
                fontSize: fontSize,
                className: "fill-slate-600",
              }}
              height={axisHeight}
            />
            <YAxis
              label={{
                value: yAxisLabel,
                angle: -90,
                position: "center",
                fontSize: fontSize,
                dx: yAxisDx,
                className: "fill-slate-600",
                style: { textAnchor: "middle" },
              }}
              axisLine={false}
              tickLine={false}
              fontSize={fontSize}
              className="fill-slate-500"
              domain={[0, "dataMax"]}
              padding={{ top: 10, bottom: 10 }}
              width={yAxisWidth}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "rgba(148, 163, 184, 0.1)" }}
              content={<CustomTooltip total={total} labelMap={labelMap} />}
            />

            {/* The main bar component that renders the bars. */}
            <Bar
              dataKey="quantity"
              radius={barRadius}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              maxBarSize={maxBarSize}
            >
              {/* Maps over the data to render a custom cell for each bar. */}
              {data.map((entry, index) => {
                // Determine the correct color and gradient for the current data point.
                const color = colorMap[entry.name] || colorMap.default || "#64748b";
                const gradientId = uniqueColors.findIndex((c) => c === color);

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#colorGradient-${gradientId})`}
                    // Controls the opacity of the bar based on the hover state.
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                    style={{ transition: "opacity 0.2s ease-in-out" }}
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }
);

DashboardBarChart.displayName = "DashboardBarChart";
