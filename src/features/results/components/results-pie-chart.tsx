"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import { type TooltipProps } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";
import { DETECTION_CLASS_COLORS } from "@/lib/constants";
import { cn, formatLabel } from "@/lib/utils";

/**
 * Defines the shape of a single data point that this chart component expects.
 */
interface ChartDataPoint {
  name: string;
  quantity: number;
}

/**
 * Defines the props for the ResultsPieChart component.
 */
interface ResultsPieChartProps {
  /** The processed data array to be rendered by the chart. */
  data: ChartDataPoint[];
}

/**
 * Defines the props for the custom `ActiveShape` component, which are passed by Recharts.
 */
interface ActiveShapeComponentProps {
  cx: number;
  cy: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  endAngle: number;
  fill: string;
}

/**

 * Defines the shape of a single item in the legend's payload array.
 */
interface LegendPayloadItem {
  value: string;
  color: string;
}

/**
 * Defines the props for the custom `CustomLegend` component.
 */
interface CustomLegendProps {
  payload: LegendPayloadItem[];
  isMobile: boolean;
}

/**
 * Defines the props for the custom label rendering function, passed by Recharts.
 */
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
 * A custom tooltip component for the Recharts chart, providing full control over styling.
 */
const CustomTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    return (
      <div className="font-inter rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal shadow-lg">
        <p className="font-semibold">{formatLabel(name || "")}</p>
        <p>{`Quantity: ${value}`}</p>
      </div>
    );
  }
  return null;
};

/**
 * A custom label rendering function for the pie chart segments. It calculates the position
 * for the percentage label and hides it for very small segments to avoid clutter.
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
  // Do not render labels for segments smaller than 5%.
  if (percent < 0.05) return null;
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
      className={cn(
        "font-inter pointer-events-none font-semibold drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.5)] select-none",
        isMobile ? "text-[10px]" : "text-sm"
      )}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

/**
 * A custom component to render the active (hovered) segment of the pie chart.
 */
const ActiveShape = (props: ActiveShapeComponentProps) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      {/* The base sector. */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        cornerRadius={5}
      />
      {/* The animated overlay for the hover effect. */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ease: "easeInOut", duration: 0.3 }}
      >
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill="rgba(255, 255, 255, 0.2)"
          cornerRadius={5}
        />
      </motion.g>
    </g>
  );
};

// A custom legend component for responsive styling and spacing.
const CustomLegend = ({ payload, isMobile }: CustomLegendProps) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-4">
      {payload.map((entry, index) => (
        <div key={`item-${index}`} className="flex items-center">
          <div
            className="mr-2 h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className={cn("text-slate-600", isMobile ? "text-xs" : "text-sm")}>
            {formatLabel(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * A reusable pie chart component for displaying data distribution.
 */
export const ResultsPieChart = ({ data }: ResultsPieChartProps) => {
  const isMobile = useIsMobile();
  // State to track the index of the currently hovered pie segment.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Filters out data points with zero quantity to prevent them from being rendered.
  const filteredData = data.filter((item) => item.quantity > 0);

  /** Memoizes the calculation of the total quantity for display in the center of the chart. */
  const totalQuantity = useMemo(
    () => filteredData.reduce((sum, item) => sum + item.quantity, 0),
    [filteredData]
  );

  /** Memoizes the unique set of colors used by the chart segments for generating SVG gradients. */
  const uniqueColors = [
    ...new Set(
      filteredData.map(
        (entry) => DETECTION_CLASS_COLORS[entry.name] || DETECTION_CLASS_COLORS.default
      )
    ),
  ];

  /** Creates the payload required by the custom legend component. */
  const legendPayload = filteredData.map((entry) => ({
    value: entry.name,
    color: DETECTION_CLASS_COLORS[entry.name] || DETECTION_CLASS_COLORS.default,
  }));

  return (
    <div className="flex h-full w-full flex-col">
      <div className="relative flex-grow cursor-pointer">
        {/* The central display area that shows either the total or the hovered segment's data. */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 transform flex-col items-center justify-center">
          <div className="relative h-12 w-28 text-center">
            {/* The display for the hovered segment's data. */}
            <div
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500",
                activeIndex !== null ? "opacity-100" : "opacity-0"
              )}
            >
              {activeIndex !== null && filteredData[activeIndex] && (
                <>
                  <p className="text-2xl font-bold text-slate-800">
                    {filteredData[activeIndex].quantity}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatLabel(filteredData[activeIndex].name)}
                  </p>
                </>
              )}
            </div>
            {/* The default display showing the total quantity. */}
            <div
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500",
                activeIndex === null ? "opacity-100" : "opacity-0"
              )}
            >
              <p className="text-2xl font-bold text-slate-800">{totalQuantity}</p>
              <p className="text-sm text-slate-500">Total</p>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            {/* SVG definitions for reusable radial gradients for each unique color. */}
            <defs>
              {uniqueColors.map((color, index) => (
                <radialGradient key={`gradient-${index}`} id={`radialGradient-${index}`}>
                  <stop offset="10%" stopColor={color} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={color} stopOpacity={1} />
                </radialGradient>
              ))}
            </defs>
            <Tooltip
              content={<CustomTooltip />}
              wrapperStyle={{ zIndex: 50 }}
              isAnimationActive={false}
            />
            <Pie
              data={filteredData}
              cx="50%"
              cy="50%"
              innerRadius={isMobile ? "55%" : "60%"}
              outerRadius={isMobile ? "80%" : "85%"}
              paddingAngle={2}
              cornerRadius={5}
              dataKey="quantity"
              nameKey="name"
              labelLine={false}
              label={(props) => renderCustomizedLabel({ ...props, isMobile })}
              activeIndex={activeIndex ?? undefined}
              activeShape={(props: unknown) => (
                <ActiveShape {...(props as ActiveShapeComponentProps)} />
              )}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {filteredData.map((entry, index) => {
                const color = DETECTION_CLASS_COLORS[entry.name] || DETECTION_CLASS_COLORS.default;
                const gradientId = uniqueColors.findIndex((c) => c === color);
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#radialGradient-${gradientId})`}
                    stroke="none"
                  />
                );
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <CustomLegend payload={legendPayload} isMobile={isMobile} />
    </div>
  );
};
