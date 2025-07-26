"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import { AiOutlineRadarChart } from "react-icons/ai";
import { BsPieChart } from "react-icons/bs";
import { FaGlasses, FaHourglassHalf } from "react-icons/fa";
import { FaRegHourglass } from "react-icons/fa6";
import {
  IoBarChartOutline,
  IoGridOutline,
  IoImagesOutline,
  IoInformation,
  IoPodiumOutline,
} from "react-icons/io5";
import { LuCalendarRange, LuChartLine, LuClock } from "react-icons/lu";
import { TbChartAreaLine } from "react-icons/tb";

import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type analysisResults, type detections, type uploads } from "@/db/schema";
import { CaseSummaryInformationModal } from "@/features/results/components/case-summary-information-modal";
import { PmiExplanationModal } from "@/features/results/components/pmi-explanation-modal";
import { ResultsBarChart } from "@/features/results/components/results-bar-chart";
import { ResultsComposedChart } from "@/features/results/components/results-composed-chart";
import { ResultsLineChart } from "@/features/results/components/results-line-chart";
import { ResultsPieChart } from "@/features/results/components/results-pie-chart";
import { ResultsRadarChart } from "@/features/results/components/results-radar-chart";
import { ResultsAnalysisSkeleton } from "@/features/results/components/results-skeleton";
import { DETECTION_CLASS_ORDER } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Defines the available time units for PMI estimation.
 */
type TimeUnit = "Minutes" | "Hours" | "Days";

/**
 * Defines the available chart types for the case summary.
 */
type ChartType = "Bar Chart" | "Line Chart" | "Composed Chart" | "Pie Chart" | "Radar Chart";

// Define a more specific type for uploads with their detections.
type UploadWithDetections = typeof uploads.$inferSelect & {
  detections: (typeof detections.$inferSelect)[];
};

interface ResultsAnalysisProps {
  /**
   * The analysis result data for the current case.
   */
  analysisResult?: typeof analysisResults.$inferSelect | null;
  /**
   * The list of uploaded images and their associated detections for the current case.
   */
  uploads?: UploadWithDetections[];
  /**
   * If true, the component will render its skeleton state.
   */
  isLoading?: boolean;
}

/**
 * A component that lays out the analysis section for the results page.
 */
export const ResultsAnalysis = ({
  analysisResult,
  uploads = [],
  isLoading,
}: ResultsAnalysisProps) => {
  // All Hooks are called unconditionally at the top of the component.
  const [selectedUnit, setSelectedUnit] = useState<TimeUnit>("Hours");
  // State to manage the currently selected chart type.
  const [selectedChart, setSelectedChart] = useState<ChartType>("Bar Chart");
  // State to manage the visibility of the PMI explanation modal.
  const [isPmiModalOpen, setIsPmiModalOpen] = useState(false);
  // State to manage the visibility of the summary information modal.
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  // State to manage the selected data source for the chart.
  const [selectedDataSource, setSelectedDataSource] = useState<string>("overall");

  const chartData = useMemo(() => {
    let counts: Record<string, number> = {};

    if (selectedDataSource === "overall") {
      // Calculate overall counts directly from the 'uploads' prop.
      uploads.forEach((upload) => {
        upload.detections.forEach((detection) => {
          counts[detection.label] = (counts[detection.label] || 0) + 1;
        });
      });
    } else if (selectedDataSource === "maximum-stages") {
      const maxCounts: Record<string, number> = {};
      uploads.forEach((upload) => {
        const countsInImage: Record<string, number> = {};
        upload.detections.forEach((det) => {
          countsInImage[det.label] = (countsInImage[det.label] || 0) + 1;
        });
        Object.keys(countsInImage).forEach((label) => {
          if (!maxCounts[label] || countsInImage[label] > maxCounts[label]) {
            maxCounts[label] = countsInImage[label];
          }
        });
      });
      counts = maxCounts;
    } else {
      const selectedUpload = uploads.find((upload) => upload.id === selectedDataSource);
      if (selectedUpload) {
        const countsInImage: Record<string, number> = {};
        selectedUpload.detections.forEach((det) => {
          countsInImage[det.label] = (countsInImage[det.label] || 0) + 1;
        });
        counts = countsInImage;
      }
    }

    return DETECTION_CLASS_ORDER.map((className) => ({
      name: className,
      quantity: counts[className] || 0,
    }));
  }, [selectedDataSource, uploads]);

  // The conditional return now happens *after* all hooks have been called.
  if (isLoading || !analysisResult) {
    return <ResultsAnalysisSkeleton />;
  }

  // Defines the options for the time unit dropdown menu for clean mapping.
  const timeUnitOptions = [
    { value: "Minutes", icon: LuClock, label: "Minutes" },
    { value: "Hours", icon: FaRegHourglass, label: "Hours" },
    { value: "Days", icon: LuCalendarRange, label: "Days" },
  ] as const;

  // Defines the options for the chart selection dropdown menu.
  const chartOptions = [
    { value: "Bar Chart", icon: IoBarChartOutline, label: "Bar Chart" },
    { value: "Line Chart", icon: LuChartLine, label: "Line Chart" },
    { value: "Composed Chart", icon: TbChartAreaLine, label: "Composed Chart" },
    { value: "Pie Chart", icon: BsPieChart, label: "Pie Chart" },
    { value: "Radar Chart", icon: AiOutlineRadarChart, label: "Radar Chart" },
  ] as const;

  // Dynamically gets the icon component for the currently selected chart.
  const SelectedChartIcon =
    chartOptions.find((option) => option.value === selectedChart)?.icon ?? IoBarChartOutline;

  // Dynamically gets the icon component for the currently selected time unit.
  const SelectedTimeUnitIcon =
    timeUnitOptions.find((option) => option.value === selectedUnit)?.icon ?? FaRegHourglass;

  // A map to easily access the correct PMI value based on the selected unit.
  const pmiValueMap = {
    Minutes: analysisResult?.pmiMinutes,
    Hours: analysisResult?.pmiHours,
    Days: analysisResult?.pmiDays,
  };

  const displayedPmiValue = pmiValueMap[selectedUnit];

  // A clear flag to check if a valid PMI estimation exists.
  const hasEstimation = typeof displayedPmiValue === "number";

  // A clear flag to check if the data source dropdown should be enabled.
  const isDataSourceDisabled = !uploads || uploads.length === 0;

  // A consistent style for all dropdown menu items.
  const dropdownItemStyle =
    "font-inter cursor-pointer border-2 border-transparent text-sm text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 [&_svg]:text-slate-800 hover:[&_svg]:!text-emerald-600";

  return (
    <>
      <TooltipProvider>
        <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2 lg:grid-cols-6 lg:grid-rows-2">
          {/* Case Summary Card */}
          <Card className="font-inter col-span-1 flex h-96 flex-col rounded-3xl border-none bg-white p-4 shadow-none md:col-span-2 md:p-8 lg:col-span-4 lg:row-span-2 lg:h-auto">
            {/* Card Header */}
            <div className="flex items-center justify-between">
              <h1 className="font-plus-jakarta-sans text-xl font-semibold text-slate-700 md:text-3xl">
                Case Summary
              </h1>
              <div className="flex items-center">
                <Tooltip>
                  <DropdownMenu>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          aria-label="Select chart type"
                          onClick={(e) => e.stopPropagation()}
                          className="relative size-8 cursor-pointer rounded-none rounded-l-md border-2 border-slate-200 bg-slate-100 text-slate-500 transition-all duration-300 ease-in-out hover:z-10 hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500 focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9"
                        >
                          <SelectedChartIcon className="size-4 md:size-5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-inter">Select chart</p>
                    </TooltipContent>
                    <DropdownMenuContent align="end" className="w-48">
                      {chartOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onSelect={() => setSelectedChart(option.value)}
                          className={cn(
                            dropdownItemStyle,
                            selectedChart === option.value && "bg-slate-200"
                          )}
                        >
                          <option.icon className="mr-2 h-4 w-4" />
                          <span>{option.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      aria-label="Information"
                      onClick={() => setIsSummaryModalOpen(true)}
                      className="relative -ml-[2px] size-8 cursor-pointer rounded-none border-2 border-slate-200 bg-slate-100 text-slate-500 transition-all duration-300 ease-in-out hover:z-10 hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500 focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9"
                    >
                      <IoInformation className="size-4 md:size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-inter">Information</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <DropdownMenu>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          aria-label="Select Data Source"
                          onClick={(e) => e.stopPropagation()}
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
                    <DropdownMenuContent align="end" className="w-64">
                      <DropdownMenuItem
                        onSelect={() => setSelectedDataSource("overall")}
                        className={cn(
                          dropdownItemStyle,
                          selectedDataSource === "overall" && "bg-slate-200"
                        )}
                      >
                        <IoGridOutline className="mr-2 h-4 w-4" />
                        Overall
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setSelectedDataSource("maximum-stages")}
                        className={cn(
                          dropdownItemStyle,
                          selectedDataSource === "maximum-stages" && "bg-slate-200"
                        )}
                      >
                        <IoPodiumOutline className="mr-2 h-4 w-4" />
                        Maximum Stages
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {uploads.map((upload) => (
                        <DropdownMenuItem
                          key={upload.id}
                          onSelect={() => setSelectedDataSource(upload.id)}
                          className={cn(
                            dropdownItemStyle,
                            selectedDataSource === upload.id && "bg-slate-200"
                          )}
                        >
                          <IoImagesOutline className="mr-2 h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{upload.name}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Tooltip>
              </div>
            </div>
            {/* Chart Rendering Section */}
            <div className="mt-4 flex-grow">
              {selectedChart === "Bar Chart" && <ResultsBarChart data={chartData} />}
              {selectedChart === "Line Chart" && <ResultsLineChart data={chartData} />}
              {selectedChart === "Composed Chart" && <ResultsComposedChart data={chartData} />}
              {selectedChart === "Pie Chart" && <ResultsPieChart data={chartData} />}
              {selectedChart === "Radar Chart" && <ResultsRadarChart data={chartData} />}
            </div>
          </Card>

          {/* PMI Estimation Card */}
          <Card className="relative col-span-1 flex h-52 flex-col justify-between overflow-hidden rounded-3xl border-none bg-white p-6 shadow-none transition-all duration-300 md:p-8 lg:col-span-2">
            <FaHourglassHalf className="absolute -right-4 -bottom-4 h-20 w-20 text-slate-400 opacity-20" />
            <div className="flex items-center justify-between">
              <div className="relative flex items-center gap-2">
                <FaHourglassHalf className="h-4 w-4 flex-shrink-0 text-slate-600" />
                <CardTitle className="font-inter text-sm font-normal text-slate-900">
                  PMI Estimation
                </CardTitle>
              </div>

              <div className="flex items-center">
                <Tooltip>
                  <DropdownMenu>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          aria-label="Adjust time unit"
                          onClick={(e) => e.stopPropagation()}
                          disabled={!hasEstimation}
                          className={cn(
                            "relative size-8 rounded-none rounded-l-md border-2 border-slate-200 bg-slate-100 text-slate-500 transition-all duration-300 ease-in-out focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9",
                            hasEstimation &&
                              "cursor-pointer hover:z-10 hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500",
                            !hasEstimation && "cursor-not-allowed opacity-50"
                          )}
                        >
                          <SelectedTimeUnitIcon className="size-4 md:size-5" />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-inter">Adjust time unit</p>
                    </TooltipContent>
                    <DropdownMenuContent
                      align="end"
                      onCloseAutoFocus={(e) => e.preventDefault()}
                      className="w-40"
                    >
                      {timeUnitOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onSelect={() => setSelectedUnit(option.value)}
                          className={cn(
                            dropdownItemStyle,
                            selectedUnit === option.value && "bg-slate-200"
                          )}
                        >
                          <option.icon className="mr-2 h-4 w-4" />
                          <span>{option.label}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      aria-label="Information"
                      onClick={() => setIsPmiModalOpen(true)}
                      disabled={!hasEstimation}
                      className={cn(
                        "relative -ml-[2px] size-8 rounded-none rounded-r-md border-2 border-slate-200 bg-slate-100 text-slate-500 transition-all duration-300 ease-in-out focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9",
                        hasEstimation &&
                          "cursor-pointer hover:z-10 hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500",
                        !hasEstimation && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <IoInformation className="size-4 md:size-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-inter">Information</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
            <div className="font-plus-jakarta-sans relative h-20 overflow-hidden">
              <AnimatePresence mode="wait">
                {hasEstimation ? (
                  <motion.div
                    key={selectedUnit}
                    className="absolute bottom-0 flex w-full flex-wrap items-baseline gap-x-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <span className="text-5xl font-medium text-slate-800">
                      {displayedPmiValue.toFixed(2)}
                    </span>
                    <span className="text-4xl text-slate-500">{selectedUnit}</span>
                  </motion.div>
                ) : (
                  <motion.p
                    key="no-estimation"
                    className="absolute bottom-0 w-full text-3xl text-slate-500 lg:text-4xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    No estimation.
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </Card>

          {/* Reviewed Images Card */}
          <Card className="relative col-span-1 flex h-52 flex-col justify-between overflow-hidden rounded-3xl border-none bg-white p-6 shadow-none transition-all duration-300 md:p-8 lg:col-span-2">
            <FaGlasses className="absolute -right-4 -bottom-4 h-20 w-20 text-slate-400 opacity-20" />
            <div className="flex items-center justify-between">
              <div className="relative flex items-center gap-2">
                <FaGlasses className="h-4 w-4 flex-shrink-0 text-slate-600" />
                <CardTitle className="font-inter text-sm font-normal text-slate-900">
                  Reviewed Images
                </CardTitle>
              </div>
            </div>
            <div className="font-plus-jakarta-sans relative">
              {hasEstimation ? (
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-5xl font-medium text-slate-800">0</span>
                  <span className="text-4xl text-slate-500">Images</span>
                </div>
              ) : (
                <p className="text-3xl text-slate-500 lg:text-4xl">No valid images.</p>
              )}
            </div>
          </Card>
        </div>
      </TooltipProvider>

      {/* Render the modal, controlled by its state */}
      <PmiExplanationModal
        isOpen={isPmiModalOpen}
        onOpenChange={setIsPmiModalOpen}
        analysisResult={analysisResult}
      />

      {/* Render the case summary information modal */}
      <CaseSummaryInformationModal
        isOpen={isSummaryModalOpen}
        onOpenChange={setIsSummaryModalOpen}
      />
    </>
  );
};
