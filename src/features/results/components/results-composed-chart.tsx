"use client";

import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type TooltipProps } from "recharts";

import { DETECTION_CLASS_COLORS } from "@/lib/constants";
import { formatLabel } from "@/lib/utils";

// Define the shape of the data that this chart expects.
interface ChartDataPoint {
  name: string;
  quantity: number;
}

// Defines the props for the ResultsComposedChart component.
interface ResultsComposedChartProps {
  /** The processed data array to be rendered by the chart. */
  data: ChartDataPoint[];
  /** The optional color for the trend line and its area gradient. Defaults to green. */
  lineColor?: string;
}

/**
 * A custom tooltip component to have full control over styling.
 */
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const quantity = payload[0].value;
    return (
      <div className="font-inter rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal shadow-lg">
        <p className="font-semibold">{formatLabel(label)}</p>
        <p>{`Quantity: ${quantity}`}</p>
      </div>
    );
  }
  return null;
};

/**
 * A reusable composed chart for displaying data distribution with multiple layers.
 */
export const ResultsComposedChart = ({
  data,
  lineColor = "#10b981",
}: ResultsComposedChartProps) => {
  // State to track the index of the currently hovered bar, used for interactive highlighting.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  /**
   * Memoizes the unique set of colors used by the bars in the chart. This is a performance
   * optimization that prevents re-calculating the unique colors on every render and is
   * used to generate the necessary SVG gradient definitions.
   */
  const uniqueBarColors = useMemo(
    () => [
      ...new Set(
        data.map((entry) => DETECTION_CLASS_COLORS[entry.name] || DETECTION_CLASS_COLORS.default)
      ),
    ],
    [data]
  );

  return (
    <div className="h-full w-full overflow-hidden">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 30, bottom: 20, left: 20 }}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {/* SVG definitions for reusable gradients and filters. */}
          <defs>
            {/* A single fallback gradient for cases where a unique color might not be found. */}
            <linearGradient key="barGradient" id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#000" stopOpacity={1} />
              <stop offset="100%" stopColor="#000" stopOpacity={0.4} />
            </linearGradient>
            {/* Dynamically generates a unique gradient for each unique bar color. */}
            {uniqueBarColors.map((color, index) => (
              <linearGradient
                key={`barGradient-${index}`}
                id={`barGradient-${index}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={color} stopOpacity={1} />
                <stop offset="100%" stopColor={color} stopOpacity={0.4} />
              </linearGradient>
            ))}
            {/* A gradient for the filled area under the line chart. */}
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity={0.6} />
              <stop offset="100%" stopColor={lineColor} stopOpacity={0.1} />
            </linearGradient>
            {/* A filter to apply a subtle drop shadow to the line. */}
            <filter id="lineShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="3"
                floodColor={lineColor}
                floodOpacity="0.3"
              />
            </filter>
            {/* Clip path to prevent curve overflow */}
            <clipPath id="chartClip">
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
            fontSize={12}
            className="fill-slate-500"
          />
          <YAxis
            label={{
              value: "Quantity",
              angle: -90,
              position: "insideLeft",
              offset: 0,
              className: "fill-slate-600",
            }}
            axisLine={false}
            tickLine={false}
            fontSize={12}
            className="fill-slate-500"
            domain={[0, "dataMax + 0.5"]}
            padding={{ top: 10, bottom: 10 }}
            width={60}
          />
          <Tooltip
            cursor={{ stroke: lineColor, strokeWidth: 1.5, strokeDasharray: "4 4" }}
            content={<CustomTooltip />}
          />

          {/* Chart data rendering components. */}
          <Area
            type="natural"
            dataKey="quantity"
            stroke="transparent"
            fill="url(#lineGradient)"
            clipPath="url(#chartClip)"
          />

          <Bar
            dataKey="quantity"
            radius={[8, 8, 0, 0]}
            maxBarSize={40}
            onMouseEnter={(_, index) => setActiveIndex(index)}
          >
            {data.map((entry, index) => {
              const color = DETECTION_CLASS_COLORS[entry.name] || DETECTION_CLASS_COLORS.default;
              const gradientId = uniqueBarColors.findIndex((c) => c === color);
              return (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#barGradient-${gradientId})`}
                  // Controls the opacity of the bar based on the hover state.
                  opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                  style={{ transition: "opacity 0.2s ease-in-out" }}
                />
              );
            })}
          </Bar>

          <Line
            type="natural"
            dataKey="quantity"
            stroke={lineColor}
            strokeWidth={3}
            filter="url(#lineShadow)"
            clipPath="url(#chartClip)"
            dot={false}
            activeDot={{ r: 6, style: { stroke: lineColor, fill: "white", strokeWidth: 2 } }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
