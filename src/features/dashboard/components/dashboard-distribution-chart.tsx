"use client";

import { memo, useEffect, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  type TooltipProps,
  XAxis,
  YAxis,
} from "recharts";

import { formatLabel } from "@/lib/utils";

/**
 * Defines the shape of a single data point that this chart component expects.
 */
interface ChartDataPoint {
  name: string;
  count: number;
}

/**
 * Defines the props for the dashboard distribution chart component.
 */
interface DashboardDistributionChartProps {
  /** The processed data array to be rendered by the chart. */
  data: ChartDataPoint[];
  /** The optional color for the chart's line, gradient, and shadow. */
  lineColor?: string;
}

/**
 * A custom tooltip component for the Recharts chart.
 */
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const count = payload[0].value as number;

    return (
      <div className="font-inter rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal shadow-lg">
        <p className="font-semibold">{label}</p>
        <p>{`Count: ${count}`}</p>
      </div>
    );
  }

  return null;
};

/**
 * A memoized, reusable distribution chart component for displaying frequency distributions.
 */
export const DashboardDistributionChart = memo(
  ({ data, lineColor = "#6366f1" }: DashboardDistributionChartProps) => {
    // State to manage the font size for chart text, adapting to screen size.
    const [fontSize, setFontSize] = useState(12);
    // State to manage the height of the X-axis for responsive spacing.
    const [axisHeight, setAxisHeight] = useState(25);
    // State to conditionally hide the Y-axis.
    const [showYAxis, setShowYAxis] = useState(true);

    /**
     * A side effect that listens for window resize events to update responsive chart values.
     */
    useEffect(() => {
      const updateResponsiveValues = () => {
        const isSmallScreen = window.innerWidth < 768;
        setFontSize(isSmallScreen ? 10 : 12);
        setAxisHeight(isSmallScreen ? 20 : 25);
        setShowYAxis(isSmallScreen);
      };

      // Set initial values on component mount.
      updateResponsiveValues();
      // Add event listener for window resize.
      window.addEventListener("resize", updateResponsiveValues);
      // Remove the event listener when the component unmounts.
      return () => window.removeEventListener("resize", updateResponsiveValues);
    }, []);

    return (
      <div className="h-full w-full overflow-hidden">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <ComposedChart
            data={data}
            margin={{
              top: 20,
              right: 10,
              bottom: 0,
              left: 10,
            }}
          >
            {/* SVG definitions for reusable gradients, filters, and clip paths. */}
            <defs>
              {/* A gradient for the filled area under the line. */}
              <linearGradient id="distLineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.6} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0.1} />
              </linearGradient>
              {/* A filter to apply a subtle drop shadow to the line for better visual separation. */}
              <filter id="distLineShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="3"
                  floodColor={lineColor}
                  floodOpacity="0.3"
                />
              </filter>
              {/* A clip path to prevent chart elements from overflowing their container. */}
              <clipPath id="distChartClip">
                <rect x="0" y="0" width="100%" height="100%" />
              </clipPath>
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
              tickFormatter={(value) => formatLabel(value)}
              tickLine={false}
              axisLine={false}
              fontSize={fontSize}
              className="fill-slate-500"
              height={axisHeight}
              interval="preserveStartEnd"
              padding={{ left: 10, right: 10 }}
            />
            <YAxis
              hide={!showYAxis}
              axisLine={false}
              tickLine={false}
              fontSize={fontSize}
              className="fill-slate-500"
              padding={{ top: 10, bottom: 10 }}
              width={showYAxis ? 30 : 0}
              tickMargin={5}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: lineColor, strokeWidth: 1.5, strokeDasharray: "4 4" }}
              content={<CustomTooltip />}
            />

            {/* Chart data rendering components, layered to create the final look. */}
            <Area
              type="monotone"
              dataKey="count"
              stroke="transparent"
              fill="url(#distLineGradient)"
              clipPath="url(#distChartClip)"
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke={lineColor}
              strokeWidth={3}
              filter="url(#distLineShadow)"
              clipPath="url(#distChartClip)"
              dot={{
                r: 4,
                fill: "white",
                stroke: lineColor,
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: "white",
                stroke: lineColor,
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }
);

DashboardDistributionChart.displayName = "DashboardDistributionChart";
