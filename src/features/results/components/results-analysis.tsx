"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { type analysisResults, type cases, type detections, type uploads } from "@/db/schema";
import { PmiWidget } from "@/features/results/components/pmi-widget";
import { type TimeUnit } from "@/features/results/components/pmi-widget-toolbar";
import { ResultsAnalysisSkeleton } from "@/features/results/components/results-skeleton";
import { ReviewedImagesWidget } from "@/features/results/components/reviewed-images-widget";
import { type ChartType } from "@/features/results/components/summary-chart-toolbar";
import { SummaryChartWidget } from "@/features/results/components/summary-chart-widget";
import { DETECTION_CLASS_ORDER } from "@/lib/constants";

// Lazily load modal components to improve initial page load performance.
const PmiExplanationModal = dynamic(
  () =>
    import("@/features/results/components/pmi-explanation-modal").then(
      (module) => module.PmiExplanationModal
    ),
  {
    loading: () => null,
    ssr: false,
  }
);
const CaseSummaryInformationModal = dynamic(
  () =>
    import("@/features/results/components/case-summary-information-modal").then(
      (module) => module.CaseSummaryInformationModal
    ),
  {
    loading: () => null,
    ssr: false,
  }
);

/**
 * Extends the base `uploads` type to include its associated `detections`,
 * creating a comprehensive type for a single uploaded image with its analysis results.
 */
export type UploadWithDetections = typeof uploads.$inferSelect & {
  detections: (typeof detections.$inferSelect)[];
};

/**
 * Defines the props for the results analysis component, which receives data fetched on the server.
 */
interface ResultsAnalysisProps {
  /** The full case data, including flags like `recalculationNeeded`. */
  caseData?: typeof cases.$inferSelect;
  /** The main analysis result data for the current case. */
  analysisResult?: typeof analysisResults.$inferSelect | null;
  /** The list of uploaded images and their associated detections for the current case. */
  uploads?: UploadWithDetections[];
  /** If true, the component will render its skeleton loading state. */
  isLoading?: boolean;
  /** A derived boolean from the parent to signal if a recalculation is needed. */
  isRecalculationNeeded?: boolean;
}

/**
 * A smart container component that lays out the entire analysis section for the results page.
 * It manages the state for interactive widgets and orchestrates the display of data.
 */
export const ResultsAnalysis = ({
  caseData,
  analysisResult,
  uploads = [],
  isLoading,
  isRecalculationNeeded,
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

  /**
   * Memoizes the formatted data for the summary chart.
   */
  const chartData = useMemo(() => {
    let counts: Record<string, number> = {};

    if (selectedDataSource === "overall") {
      // Aggregate counts from all detections across all uploads.
      uploads.forEach((upload) =>
        upload.detections.forEach((d) => {
          counts[d.label] = (counts[d.label] || 0) + 1;
        })
      );
    } else if (selectedDataSource === "maximum-stages") {
      // Find the maximum count for each detection label across all individual images.
      const maxCounts: Record<string, number> = {};
      uploads.forEach((upload) => {
        const countsInImage: Record<string, number> = {};
        upload.detections.forEach((d) => {
          countsInImage[d.label] = (countsInImage[d.label] || 0) + 1;
        });
        Object.keys(countsInImage).forEach((label) => {
          if (!maxCounts[label] || countsInImage[label] > maxCounts[label])
            maxCounts[label] = countsInImage[label];
        });
      });
      counts = maxCounts;
    } else {
      // Aggregate counts from a single, specific upload.
      const selectedUpload = uploads.find((u) => u.id === selectedDataSource);
      if (selectedUpload) {
        selectedUpload.detections.forEach((d) => {
          counts[d.label] = (counts[d.label] || 0) + 1;
        });
      }
    }
    // Map the aggregated counts to the predefined class order for consistent chart display.
    return DETECTION_CLASS_ORDER.map((name) => ({ name, quantity: counts[name] || 0 }));
  }, [selectedDataSource, uploads]);

  // A map to easily retrieve the correct PMI value based on the selected time unit.
  const pmiValueMap = {
    Minutes: analysisResult?.pmiMinutes,
    Hours: analysisResult?.pmiHours,
    Days: analysisResult?.pmiDays,
  };

  const displayedPmiValue = pmiValueMap[selectedUnit];

  // A clear flag to check if a valid PMI estimation exists.
  const hasEstimation = typeof displayedPmiValue === "number";

  // The conditional return now happens *after* all hooks have been called.
  if (isLoading || !analysisResult || !caseData) {
    return <ResultsAnalysisSkeleton />;
  }

  /**
   * A flag for the specific scenario where no estimation exists, but an adult was detected.
   * This is determined by the backend setting `oldestStageDetected` to 'adult'.
   */
  const isAdultOnlyNoEstimation = !hasEstimation && analysisResult?.oldestStageDetected === "adult";

  /**
   * A flag for the scenario where no insects were detected at all.
   * The backend provides a specific explanation for this case.
   */
  const isNoInsectsFound = !hasEstimation && !analysisResult?.oldestStageDetected;

  /**
   * The information button is enabled if there is a valid estimation, if it's the
   * special adult-only case, or if no insects were found, as all these scenarios
   * have a corresponding explanation to display.
   */
  const isInfoButtonEnabled = hasEstimation || isAdultOnlyNoEstimation || isNoInsectsFound;

  // A clear flag to check if the data source dropdown should be enabled.
  const isDataSourceDisabled = !uploads || uploads.length === 0;

  return (
    <>
      <TooltipProvider delayDuration={300} skipDelayDuration={100}>
        <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2 lg:grid-cols-6 lg:grid-rows-2">
          <SummaryChartWidget
            selectedChart={selectedChart}
            chartData={chartData}
            uploads={uploads}
            selectedDataSource={selectedDataSource}
            isDataSourceDisabled={isDataSourceDisabled}
            onChartSelect={setSelectedChart}
            onInfoClick={() => setIsSummaryModalOpen(true)}
            onDataSourceSelect={setSelectedDataSource}
          />
          <PmiWidget
            pmiValue={displayedPmiValue}
            selectedUnit={selectedUnit}
            hasEstimation={hasEstimation}
            isInfoButtonEnabled={isInfoButtonEnabled}
            isRecalculationNeeded={isRecalculationNeeded ?? false}
            onUnitSelect={setSelectedUnit}
            onInfoClick={() => setIsPmiModalOpen(true)}
          />
          <ReviewedImagesWidget hasEstimation={hasEstimation} />
        </div>
      </TooltipProvider>

      {/* Conditionally render the lazily-loaded modal, controlled by its state. */}
      {isPmiModalOpen && (
        <PmiExplanationModal
          isOpen={isPmiModalOpen}
          onOpenChange={setIsPmiModalOpen}
          analysisResult={analysisResult}
          hasEstimation={hasEstimation}
        />
      )}

      {/* Conditionally render the lazily-loaded case summary information modal. */}
      {isSummaryModalOpen && (
        <CaseSummaryInformationModal
          isOpen={isSummaryModalOpen}
          onOpenChange={setIsSummaryModalOpen}
        />
      )}
    </>
  );
};
