import React, { memo, useEffect, useState } from "react";
import { AiOutlineRadarChart } from "react-icons/ai";
import { BsPieChart } from "react-icons/bs";
import {
  IoBarChartOutline,
  IoGridOutline,
  IoImagesOutline,
  IoInformation,
  IoPodiumOutline,
} from "react-icons/io5";
import { LuChartLine } from "react-icons/lu";
import { TbChartAreaLine } from "react-icons/tb";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type UploadWithDetections } from "@/features/results/components/results-analysis";
import { cn } from "@/lib/utils";

/**
 * A shared class string for consistent styling of the dropdown menu items.
 */
const dropdownItemStyle =
  "font-inter cursor-pointer border-2 border-transparent text-sm text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 [&_svg]:text-slate-800 hover:[&_svg]:!text-emerald-600";

/**
 * A configuration array that defines the available chart types.
 * This approach centralizes the options, making them easy to manage and map over in the UI.
 */
const chartOptions = [
  { value: "Bar Chart", icon: IoBarChartOutline, label: "Bar Chart" },
  { value: "Line Chart", icon: LuChartLine, label: "Line Chart" },
  { value: "Composed Chart", icon: TbChartAreaLine, label: "Composed Chart" },
  { value: "Pie Chart", icon: BsPieChart, label: "Pie Chart" },
  { value: "Radar Chart", icon: AiOutlineRadarChart, label: "Radar Chart" },
] as const;

/**
 * Exports a TypeScript type representing the valid chart type values, derived from the configuration array.
 */
export type ChartType = (typeof chartOptions)[number]["value"];

/**
 * Defines the props for the SummaryChartToolbar component.
 */
interface SummaryChartToolbarProps {
  /** The currently selected chart type. */
  selectedChart: ChartType;
  /** A callback function to handle the selection of a new chart type. */
  onChartSelect: (chart: ChartType) => void;
  /** A callback function to open the information panel. */
  onInfoClick: () => void;
  /** The currently selected data source (e.g., 'overall' or a specific upload ID). */
  selectedDataSource: string;
  /** A callback function to handle the selection of a new data source. */
  onDataSourceSelect: (source: string) => void;
  /** An array of upload objects, used to dynamically generate data source options. */
  uploads: UploadWithDetections[];
  /** A boolean to disable the data source selection dropdown. */
  isDataSourceDisabled: boolean;
}

/**
 * A memoized component that renders the toolbar for the summary chart. It provides controls
 * for changing the chart type, viewing information, and selecting the data source for the chart.
 */
export const SummaryChartToolbar = memo(
  ({
    selectedChart,
    onChartSelect,
    onInfoClick,
    selectedDataSource,
    onDataSourceSelect,
    uploads,
    isDataSourceDisabled,
  }: SummaryChartToolbarProps) => {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    // Dynamically selects the appropriate icon for the chart type dropdown trigger.
    const SelectedChartIcon =
      chartOptions.find((o) => o.value === selectedChart)?.icon ?? IoBarChartOutline;

    if (!isMounted) {
      return (
        <div className="flex items-center">
          <div className="size-8 rounded-none rounded-l-md border-2 border-slate-200 bg-slate-100 md:size-9" />
          <div className="-ml-[2px] size-8 rounded-none border-2 border-slate-200 bg-slate-100 md:size-9" />
          <div className="-ml-[2px] size-8 rounded-none rounded-r-md border-2 border-slate-200 bg-slate-100 md:size-9" />
        </div>
      );
    }

    return (
      <div className="flex items-center">
        {/* The chart type selection dropdown menu. */}
        <Tooltip key="chart-type-tooltip">
          <DropdownMenu key="chart-type-dropdown">
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label="Select chart type"
                  className="relative size-8 cursor-pointer rounded-none rounded-l-md border-2 border-slate-200 bg-slate-100 text-slate-500 transition-all duration-300 ease-in-out hover:z-10 hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500 focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9"
                >
                  <SelectedChartIcon className="size-4 md:size-5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-inter">Select chart</p>
            </TooltipContent>
            <DropdownMenuContent align="end" className="w-48 border-2 border-slate-200">
              {/* Maps over the configuration array to render the chart options. */}
              {chartOptions.map((option, index) => {
                const isActive = selectedChart === option.value;
                const prevOption = chartOptions[index - 1];
                const isPrevActive = prevOption?.value === selectedChart;

                return (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => onChartSelect(option.value)}
                    className={cn(
                      dropdownItemStyle,
                      index > 0 && "mt-0.5",
                      isActive &&
                        "border-emerald-200 bg-emerald-50 text-emerald-700 [&_svg]:text-emerald-600",
                      isActive && index > 0 && !isPrevActive && "mt-1",
                      !isActive && isPrevActive && "mt-1"
                    )}
                  >
                    <option.icon className="mr-2 h-4 w-4" />
                    <span>{option.label}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </Tooltip>
        {/* The information button. */}
        <Tooltip key="info-tooltip">
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              aria-label="Information"
              onClick={onInfoClick}
              className="relative -ml-[2px] size-8 cursor-pointer rounded-none border-2 border-slate-200 bg-slate-100 text-slate-500 transition-all duration-300 ease-in-out hover:z-10 hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500 focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9"
            >
              <IoInformation className="size-4 md:size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-inter">Information</p>
          </TooltipContent>
        </Tooltip>
        {/* The data source selection dropdown menu. */}
        <Tooltip key="data-source-tooltip">
          <DropdownMenu key="data-source-dropdown">
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  aria-label="Select Data Source"
                  disabled={isDataSourceDisabled}
                  className={cn(
                    "relative -ml-[2px] size-8 rounded-none rounded-r-md border-2 border-slate-200 bg-slate-100 text-slate-500 transition-all duration-300 ease-in-out focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9",
                    !isDataSourceDisabled &&
                      "cursor-pointer hover:z-10 hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500",
                    isDataSourceDisabled && "cursor-not-allowed opacity-50"
                  )}
                >
                  <IoImagesOutline className="size-4 md:size-5" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p className="font-inter">Select data source</p>
            </TooltipContent>
            <DropdownMenuContent align="end" className="w-64 border-2 border-slate-200">
              {/* Static options for aggregated data sources. */}
              <DropdownMenuItem
                onSelect={() => onDataSourceSelect("overall")}
                className={cn(
                  dropdownItemStyle,
                  selectedDataSource === "overall" &&
                    "border-emerald-200 bg-emerald-50 text-emerald-700 [&_svg]:text-emerald-600"
                )}
              >
                <IoGridOutline className="mr-2 h-4 w-4" /> Overall
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onDataSourceSelect("maximum-stages")}
                className={cn(
                  dropdownItemStyle,
                  "mt-0.5",
                  selectedDataSource === "maximum-stages" &&
                    "border-emerald-200 bg-emerald-50 text-emerald-700 [&_svg]:text-emerald-600",
                  selectedDataSource === "maximum-stages" &&
                    selectedDataSource === "maximum-stages" &&
                    "mt-1",
                  selectedDataSource !== "maximum-stages" &&
                    selectedDataSource === "overall" &&
                    "mt-1"
                )}
              >
                <IoPodiumOutline className="mr-2 h-4 w-4" /> Maximum Stages
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* Dynamically generated options for each individual uploaded image. */}
              {uploads.map((upload, index) => {
                const isActive = selectedDataSource === upload.id;
                const prevUpload = uploads[index - 1];
                const isPrevActive = prevUpload
                  ? selectedDataSource === prevUpload.id
                  : selectedDataSource === "maximum-stages";

                return (
                  <DropdownMenuItem
                    key={upload.id}
                    onSelect={() => onDataSourceSelect(upload.id)}
                    className={cn(
                      dropdownItemStyle,
                      "mt-0.5",
                      isActive &&
                        "border-emerald-200 bg-emerald-50 text-emerald-700 [&_svg]:text-emerald-600",
                      isActive && !isPrevActive && "mt-1",
                      !isActive && isPrevActive && "mt-1"
                    )}
                  >
                    <IoImagesOutline className="mr-2 h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{upload.name}</span>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </Tooltip>
      </div>
    );
  }
);

SummaryChartToolbar.displayName = "SummaryChartToolbar";
