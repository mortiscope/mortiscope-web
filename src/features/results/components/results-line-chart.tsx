"use-client";

import {
  Area,
  AreaChart,
  CartesianGrid,
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
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{
          top: 10,
          right: 30,
          bottom: 5,
          left: 10,
        }}
      >
        {/* SVG definitions for reusable gradients and filters. */}
        <defs>
          {/* A gradient for the filled area under the line. */}
          <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={strokeColor} stopOpacity={0.4} />
            <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
          {/* A filter to apply a subtle drop shadow to the line for better visual separation. */}
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="3"
              floodColor={strokeColor}
              floodOpacity="0.3"
            />
          </filter>
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
        <Tooltip
          cursor={{ stroke: strokeColor, strokeWidth: 1.5, strokeDasharray: "4 4" }}
          content={<CustomTooltip />}
        />

        {/* The filled gradient area. */}
        <Area
          type="monotone"
          dataKey="quantity"
          stroke="transparent"
          fillOpacity={1}
          fill="url(#colorGradient)"
        />

        {/* The visible trend line with its shadow and interactive dots. */}
        <Area
          type="monotone"
          dataKey="quantity"
          stroke={strokeColor}
          strokeWidth={3}
          fill="none"
          filter="url(#shadow)"
          activeDot={{
            r: 6,
            style: {
              stroke: strokeColor,
              strokeWidth: 2,
              fill: "white",
            },
          }}
          dot={{
            r: 4,
            fill: strokeColor,
            strokeWidth: 0,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
