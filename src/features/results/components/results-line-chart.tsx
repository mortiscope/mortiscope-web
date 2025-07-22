"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
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

interface ResultsLineChartProps {
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
 * A reusable line chart component for displaying data distribution.
 */
export const ResultsLineChart = ({ data }: ResultsLineChartProps) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 20,
          bottom: 5,
          left: 0,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="name"
          tickFormatter={(value) => formatLabel(value)}
          tickLine={false}
          axisLine={false}
          fontSize={12}
        />
        <YAxis
          label={{ value: "Quantity", angle: -90, position: "insideLeft", offset: 10 }}
          axisLine={false}
          tickLine={false}
          fontSize={12}
        />
        <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.1)" }} content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="quantity"
          stroke="#10b981"
          strokeWidth={2.5}
          activeDot={{ r: 8 }}
          dot={{ r: 4, fill: "#10b981" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
