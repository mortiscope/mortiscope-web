"use client";

import { useState } from "react";
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
 * Defines the props for the ResultsBarChart component.
 */
interface ResultsBarChartProps {
  /** The processed data array to be rendered by the chart. */
  data: ChartDataPoint[];
}

/**
 * A custom tooltip component to have full control over styling.
 */
const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="font-inter rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal shadow-lg">
        <p className="font-semibold">{formatLabel(label)}</p>
        <p>{`Quantity: ${payload[0].value}`}</p>
      </div>
    );
  }

  return null;
};

/**
 * A reusable bar chart component for displaying data distribution.
 */
export const ResultsBarChart = ({ data }: ResultsBarChartProps) => {
  // State to track the index of the currently hovered bar, used for interactive highlighting.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Generates a unique set of colors from the data, which is then used to define the necessary SVG gradients.
  const uniqueColors = [
    ...new Set(
      data.map((entry) => DETECTION_CLASS_COLORS[entry.name] || DETECTION_CLASS_COLORS.default)
    ),
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{
          top: 10,
          right: 30,
          bottom: 5,
          left: 10,
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
        />
        <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.1)" }} content={<CustomTooltip />} />

        {/* The main bar component that renders the bars. */}
        <Bar
          dataKey="quantity"
          radius={[8, 8, 0, 0]}
          onMouseEnter={(_, index) => setActiveIndex(index)}
          maxBarSize={40}
        >
          {data.map((entry, index) => {
            // Determine the correct color and gradient for the current data point.
            const color = DETECTION_CLASS_COLORS[entry.name] || DETECTION_CLASS_COLORS.default;
            const gradientId = uniqueColors.findIndex((c) => c === color);

            return (
              <Cell
                key={`cell-${index}`}
                fill={`url(#colorGradient-${gradientId})`}
                opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                style={{ transition: "opacity 0.2s ease-in-out" }}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};
