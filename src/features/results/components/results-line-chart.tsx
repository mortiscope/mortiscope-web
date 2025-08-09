"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type TooltipProps } from "recharts";

import { formatLabel } from "@/lib/utils";

// Define the shape of the data that this chart expects.
interface ChartDataPoint {
  name: string;
  quantity: number;
}

// Defines the props for the ResultsLineChart component.
interface ResultsLineChartProps {
  /** The processed data array to be rendered by the chart. */
  data: ChartDataPoint[];
  /** The optional primary color for the chart's line, gradient, and shadow. */
  strokeColor?: string;
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
 * A reusable line chart component for displaying data distribution.
 */
export const ResultsLineChart = ({ data, strokeColor = "#10b981" }: ResultsLineChartProps) => {
  return (
    <div className="h-full w-full overflow-hidden">
      <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
        <ComposedChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
          {/* SVG definitions for reusable gradients and filters. */}
          <defs>
            {/* A gradient for the filled area under the line chart. */}
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={0.6} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity={0.1} />
            </linearGradient>
            {/* A filter to apply a subtle drop shadow to the line. */}
            <filter id="lineShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx="0"
                dy="2"
                stdDeviation="3"
                floodColor={strokeColor}
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
            cursor={{ stroke: strokeColor, strokeWidth: 1.5, strokeDasharray: "4 4" }}
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

          <Line
            type="natural"
            dataKey="quantity"
            stroke={strokeColor}
            strokeWidth={3}
            filter="url(#lineShadow)"
            clipPath="url(#chartClip)"
            dot={false}
            activeDot={{ r: 6, style: { stroke: strokeColor, fill: "white", strokeWidth: 2 } }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

ResultsLineChart.displayName = "ResultsLineChart";
