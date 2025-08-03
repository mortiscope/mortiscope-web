"use client";

import { useState } from "react";

import type { analysisResults, cases, detections, uploads } from "@/db/schema";
import { ResultsAnalysis } from "@/features/results/components/results-analysis";
import { ResultsDetails } from "@/features/results/components/results-details";
import { ResultsEditCaseSheet } from "@/features/results/components/results-edit-case-sheet";
import { ResultsHeader } from "@/features/results/components/results-header";
import { ResultsImages } from "@/features/results/components/results-images";

/**
 * A specific type definition for a case that includes its related data.
 * This ensures TypeScript knows about the extra data fetched from the database.
 */
type CaseWithRelations = typeof cases.$inferSelect & {
  uploads: (typeof uploads.$inferSelect & {
    detections: (typeof detections.$inferSelect)[];
  })[];
  analysisResult: typeof analysisResults.$inferSelect | null;
};

interface ResultsViewProps {
  caseData: CaseWithRelations;
}

/**
 * A client component responsible for rendering the results page interface and managing state.
 */
export function ResultsView({ caseData }: ResultsViewProps) {
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  // Define a more specific type for uploads with detections
  const uploadsWithDetections: (typeof uploads.$inferSelect & {
    detections: (typeof detections.$inferSelect)[];
  })[] = caseData.uploads;

  return (
    <>
      <ResultsHeader caseData={caseData} onEditClick={() => setIsEditSheetOpen(true)} />
      <div className="flex flex-1 flex-col gap-4 pt-2">
        <ResultsDetails caseData={caseData} />
        <ResultsAnalysis
          caseData={caseData}
          analysisResult={caseData.analysisResult}
          uploads={uploadsWithDetections}
        />
        <ResultsImages initialImages={uploadsWithDetections} />
      </div>

      <ResultsEditCaseSheet isOpen={isEditSheetOpen} onOpenChange={setIsEditSheetOpen} />
    </>
  );
}
