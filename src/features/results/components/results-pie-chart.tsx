"use client";

import { Pie, PieChart, ResponsiveContainer, Tooltip, Cell, Legend } from "recharts";
import { type TooltipProps } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";
import { DETECTION_CLASS_COLORS } from "@/lib/constants";
import { cn, formatLabel } from "@/lib/utils";

// Define the shape of the data that this chart expects.
interface ChartDataPoint {
  name: string;
  quantity: number;
}

interface ResultsPieChartProps {
  /** The processed data array to be rendered by the chart. */
  data: ChartDataPoint[];
}

/**
 * A custom tooltip component to have full control over styling.
 */
const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const name = payload[0].name;
    const value = payload[0].value;
    return (
      <div className="font-inter rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal shadow-lg">
        <p className="font-semibold">{formatLabel(name || "")}</p>
        <p>{`Quantity: ${value}`}</p>
      </div>
    );
  }
  return null;
};

// Define the type for the props passed to the custom label function.
interface CustomizedLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  isMobile: boolean;
}

/**
 * A custom label component for the pie chart slices.
 * It calculates the position for the label and only renders it if the slice is large enough.
 */
const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  isMobile,
}: CustomizedLabelProps) => {
  if (percent < 0.05) {
    return null;
  }

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * (isMobile ? 0.4 : 0.5);
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className={cn("font-inter font-semibold", isMobile ? "text-[10px]" : "text-sm")}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// A custom legend component for responsive styling and spacing.
const CustomLegend = ({ payload, isMobile }: { payload?: any[]; isMobile: boolean }) => {
  if (!payload) return null;
  return (
    <ul className="mt-4 flex flex-wrap items-center justify-center">
      {payload.map((entry, index) => (
        <li key={`item-${index}`} className="mx-2 my-1 flex items-center">
          <div
            className="mr-2 h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className={cn("text-slate-700", isMobile ? "text-xs" : "text-sm")}>
            {formatLabel(entry.value)}
          </span>
        </li>
      ))}
    </ul>
  );
};

/**
 * A reusable pie chart component for displaying data distribution.
 */
export const ResultsPieChart = ({ data }: ResultsPieChartProps) => {
  // Filter out data points with zero quantity so they don't appear in the chart.
  const filteredData = data.filter((item) => item.quantity > 0);
  const isMobile = useIsMobile();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Tooltip cursor={{ fill: "rgba(148, 163, 184, 0.1)" }} content={<CustomTooltip />} />
        <Legend content={<CustomLegend isMobile={isMobile} />} />
        <Pie
          data={filteredData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(props) => renderCustomizedLabel({ ...props, isMobile })}
          outerRadius={isMobile ? "70%" : "80%"}
          dataKey="quantity"
          nameKey="name"
        >
          {filteredData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={DETECTION_CLASS_COLORS[entry.name] || DETECTION_CLASS_COLORS.default}
              stroke={DETECTION_CLASS_COLORS[entry.name] || DETECTION_CLASS_COLORS.default}
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
};
