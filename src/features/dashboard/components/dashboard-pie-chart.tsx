"use client";

import { motion } from "framer-motion";
import { memo, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from "recharts";
import { type TooltipProps } from "recharts";

import { useIsMobile } from "@/hooks/use-mobile";
import { STATUS_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Defines the shape of a single data point that this chart component expects.
 */
interface ChartDataPoint {
  name: string;
  quantity: number;
}

/**
 * Defines the props for the dashboard pie chart component.
 */
interface DashboardPieChartProps {
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
 * Defines the props for the custom custom legend component.
 */
interface CustomLegendProps {
  payload: LegendPayloadItem[];
  isMobile: boolean;
}

/**
 * Defines the props for the custom custom tooltip.
 */
interface CustomTooltipProps extends TooltipProps<number, string> {
  totalQuantity: number;
}

/**
 * A custom tooltip component for the Recharts chart, providing full control over styling
 * and content, including percentage calculation.
 */
const CustomTooltip = ({ active, payload, totalQuantity }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0];
    const statusKey = name as keyof typeof STATUS_CONFIG;
    // Look up the human-readable label from a constants file.
    const label = STATUS_CONFIG[statusKey]?.label || name;
    // Calculate the percentage of the current slice.
    const percentage = totalQuantity > 0 ? ((Number(value) / totalQuantity) * 100).toFixed(0) : 0;

    return (
      <div className="font-inter rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal shadow-lg">
        <p className="font-semibold">{label}</p>
        <p>{`Count: ${value}`}</p>
        <p>{`Percentage: ${percentage}%`}</p>
      </div>
    );
  }
  return null;
};

/**
 * A custom component to render the active segment of the pie chart.
 * It uses Framer Motion to apply a subtle animated overlay effect.
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

/**
 * A custom legend component that renders a responsive, flexible list of chart labels and their colors.
 */
const CustomLegend = ({ payload, isMobile }: CustomLegendProps) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      {payload.map((entry, index) => {
        const statusKey = entry.value as keyof typeof STATUS_CONFIG;
        const label = STATUS_CONFIG[statusKey]?.label || entry.value;
        return (
          <div key={`item-${index}`} className="flex items-center">
            <div
              className="mr-2 h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className={cn("text-slate-600", isMobile ? "text-xs" : "text-sm")}>{label}</span>
          </div>
        );
      })}
    </div>
  );
};

/**
 * A reusable, interactive pie chart component for displaying data distribution.
 */
export const DashboardPieChart = memo(function DashboardPieChart({ data }: DashboardPieChartProps) {
  const isMobile = useIsMobile();
  // State to track the index of the currently hovered pie segment.
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Memoizes the data, filtering out items with zero quantity to prevent them from being rendered.
  const filteredData = useMemo(() => data.filter((item) => item.quantity > 0), [data]);

  /** Memoizes the calculation of the total quantity for display in the center of the chart. */
  const totalQuantity = useMemo(
    () => filteredData.reduce((sum, item) => sum + item.quantity, 0),
    [filteredData]
  );

  /** Memoizes the unique set of colors used by the chart segments for generating SVG gradients. */
  const uniqueColors = useMemo(() => {
    return [
      ...new Set(
        filteredData.map((entry) => {
          const statusKey = entry.name as keyof typeof STATUS_CONFIG;
          return STATUS_CONFIG[statusKey]?.hex || "#64748b";
        })
      ),
    ];
  }, [filteredData]);

  /** Memoizes the payload required by the custom legend component. */
  const legendPayload = useMemo(() => {
    return filteredData.map((entry) => {
      const statusKey = entry.name as keyof typeof STATUS_CONFIG;
      return {
        value: entry.name,
        color: STATUS_CONFIG[statusKey]?.hex || "#64748b",
      };
    });
  }, [filteredData]);

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
                <p className="font-inter text-2xl font-bold text-slate-800">
                  {filteredData[activeIndex].quantity}
                </p>
              )}
            </div>
            {/* The default display showing the total quantity. */}
            <div
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-500",
                activeIndex === null ? "opacity-100" : "opacity-0"
              )}
            >
              <p className="font-inter text-2xl font-bold text-slate-800">{totalQuantity}</p>
            </div>
          </div>
        </div>

        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <PieChart>
            {/* SVG definitions for reusable radial gradients for each unique color. */}
            <defs>
              {uniqueColors.map((color, index) => (
                <radialGradient
                  key={`gradient-${index}`}
                  id={`radialGradient-${color.replace("#", "")}`}
                >
                  <stop offset="10%" stopColor={color} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={color} stopOpacity={1} />
                </radialGradient>
              ))}
            </defs>
            <Tooltip
              content={<CustomTooltip totalQuantity={totalQuantity} />}
              wrapperStyle={{ zIndex: 50 }}
              isAnimationActive={false}
            />
            <Pie
              data={filteredData}
              cx="50%"
              cy="50%"
              innerRadius={isMobile ? "55%" : "60%"}
              outerRadius={isMobile ? "85%" : "90%"}
              paddingAngle={2}
              cornerRadius={5}
              dataKey="quantity"
              nameKey="name"
              labelLine={false}
              activeIndex={activeIndex ?? undefined}
              activeShape={(props: unknown) => (
                <ActiveShape {...(props as ActiveShapeComponentProps)} />
              )}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {filteredData.map((entry, index) => {
                const statusKey = entry.name as keyof typeof STATUS_CONFIG;
                const color = STATUS_CONFIG[statusKey]?.hex || "#64748b";
                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#radialGradient-${color.replace("#", "")})`}
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
});

DashboardPieChart.displayName = "DashboardPieChart";
