"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { type TooltipProps } from "recharts";

import { formatLabel } from "@/lib/utils";

// Define the shape of the data that this chart expects.
interface ChartDataPoint {
  name: string;
  quantity: number;
}

interface ResultsRadarChartProps {
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
 * A reusable radar chart component for displaying data distribution.
 */
export const ResultsRadarChart = ({ data }: ResultsRadarChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid />
        <PolarAngleAxis
          dataKey="name"
          tickFormatter={(value) => formatLabel(value)}
          fontSize={12}
        />
        <PolarRadiusAxis angle={30} domain={[0, "dataMax + 5"]} fontSize={12} />
        <Tooltip cursor={{ stroke: "#10b981", strokeWidth: 1 }} content={<CustomTooltip />} />
        <Radar
          name="Quantity"
          dataKey="quantity"
          stroke="#059669"
          fill="#10b981"
          fillOpacity={0.6}
          strokeWidth={2.5}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};
