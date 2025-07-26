"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

import { ResultsExportDropdown } from "@/features/results/components/results-export-dropdown";
import { ResultsRecalculateButton } from "@/features/results/components/results-recalculate-button";
import { useResultsStore } from "@/features/results/store/results-store";
import { useLayoutStore } from "@/stores/layout-store";

/**
 * A client component responsible for managing the header content for the results page.
 */
export const ResultsHeader = () => {
  const params = useParams();
  const caseId = typeof params.resultsId === "string" ? params.resultsId : null;

  // Get the recalculation state from the central results store.
  const isRecalculationNeeded = useResultsStore((state) => state.isRecalculationNeeded);

  const setHeaderAdditionalContent = useLayoutStore((state) => state.setHeaderAdditionalContent);
  const clearHeaderAdditionalContent = useLayoutStore(
    (state) => state.clearHeaderAdditionalContent
  );

  useEffect(() => {
    if (caseId) {
      setHeaderAdditionalContent(
        <div className="flex items-center gap-1 sm:gap-2">
          <ResultsRecalculateButton caseId={caseId} isDisabled={!isRecalculationNeeded} />
          <ResultsExportDropdown caseId={caseId} />
        </div>
      );
    }

    // Cleanup function to remove the content when the component unmounts.
    return () => {
      clearHeaderAdditionalContent();
    };
  }, [caseId, isRecalculationNeeded, setHeaderAdditionalContent, clearHeaderAdditionalContent]);

  return null;
};
