"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

import type { analysisResults, cases, detections, uploads } from "@/db/schema";
import { ResultsImages } from "@/features/images/components/results-images";
import { ResultsAnalysis } from "@/features/results/components/results-analysis";
import { ResultsDetails } from "@/features/results/components/results-details";
import { ResultsHeader } from "@/features/results/components/results-header";
import { ResultsHeaderSkeleton } from "@/features/results/components/results-header-skeleton";
import { ResultsDetailsSkeleton } from "@/features/results/components/results-skeleton";
import { useCaseData } from "@/features/results/hooks/use-case-data";
import { useResultsStore } from "@/features/results/store/results-store";

/**
 * A comprehensive TypeScript type that represents a single case and all its relations
 * (uploads with their nested detections, and the analysis result). This type is inferred
 * from the database schema and is used throughout the results feature.
 */
export type CaseWithRelations = typeof cases.$inferSelect & {
  uploads: (typeof uploads.$inferSelect & {
    detections: (typeof detections.$inferSelect)[];
  })[];
  analysisResult: typeof analysisResults.$inferSelect | null;
};

/**
 * Defines the props for the results view component, which receives its initial data from a server component.
 */
interface ResultsViewProps {
  /** The case data used for the initial render and to hydrate the client-side data fetching hook. */
  initialCaseData: CaseWithRelations;
}

// Dynamically import the results edit case sheet.
const DynamicEditCaseSheet = dynamic(() =>
  import("@/features/cases/components/edit-case-sheet").then(
    (module) => module.ResultsEditCaseSheet
  )
);

/**
 * A smart client component responsible for orchestrating the entire results page.
 */
export function ResultsView({ initialCaseData }: ResultsViewProps) {
  /** Local state to manage the visibility of the side sheet for editing case details. */
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  /** A new state to control whether the sheet is mounted in the DOM. */
  const [isSheetMounted, setIsSheetMounted] = useState(false);

  /**
   * Initializes the `useCaseData` hook to fetch and manage live data for the current case.
   */
  const { data: caseData, isLoading } = useCaseData(initialCaseData.id, initialCaseData);
  const pendingRecalculations = useResultsStore((state) => state.pendingRecalculations);

  // Effect to handle mounting and unmounting for animations.
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isEditSheetOpen) {
      // If the sheet should be open, ensure it's mounted immediately.
      setIsSheetMounted(true);
    } else if (!isEditSheetOpen && isSheetMounted) {
      // If the sheet is closing, wait for the animation (500ms) to finish before unmounting.
      timeoutId = setTimeout(() => {
        setIsSheetMounted(false);
      }, 500);
    }

    // Cleanup function to clear the timeout if the component unmounts or state changes again.
    return () => {
      clearTimeout(timeoutId);
    };
  }, [isEditSheetOpen, isSheetMounted]);

  /**
   * While the initial data is being fetched by `useCaseData` for the first time on the client,
   * render a skeleton UI. This provides an immediate loading state to the user.
   */
  if (isLoading) {
    return (
      <>
        <ResultsHeaderSkeleton />
        <div className="flex flex-1 flex-col gap-4 pt-2">
          <ResultsDetailsSkeleton />
        </div>
      </>
    );
  }

  // A derived state that is true if the database flag is set or if there's a pending client-side change.
  const needsRecalculation = caseData.recalculationNeeded || pendingRecalculations.has(caseData.id);

  // Extracts the uploads with their nested detections for easier prop passing to child components.
  const uploadsWithDetections = caseData.uploads;

  return (
    <>
      {/* Renders the main header, passing down the case data and a callback to open the edit sheet. */}
      <ResultsHeader caseData={caseData} onEditClick={() => setIsEditSheetOpen(true)} />
      <div className="flex flex-1 flex-col gap-4 pt-2">
        {/* Renders the details section with the case data. */}
        <ResultsDetails caseData={caseData} />
        {/* Renders the analysis widgets, passing the relevant data. */}
        <ResultsAnalysis
          caseData={caseData}
          analysisResult={caseData.analysisResult}
          uploads={uploadsWithDetections}
          isRecalculationNeeded={needsRecalculation}
        />
        {/* Renders the image gallery, passing the initial set of images. */}
        <ResultsImages initialImages={uploadsWithDetections} />
      </div>

      {/* The component is rendered based on `isSheetMounted`. */}
      {isSheetMounted && (
        <DynamicEditCaseSheet
          isOpen={isEditSheetOpen}
          onOpenChange={setIsEditSheetOpen}
          caseData={caseData}
        />
      )}
    </>
  );
}
