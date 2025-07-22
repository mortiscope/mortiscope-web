"use client";

import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
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
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
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
        <Bar dataKey="quantity" barSize={30} radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={DETECTION_CLASS_COLORS[entry.name] || DETECTION_CLASS_COLORS.default}
            />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
};
