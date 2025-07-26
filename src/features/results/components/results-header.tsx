"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

import type { cases } from "@/db/schema";
import { ResultsExportDropdown } from "@/features/results/components/results-export-dropdown";
import { ResultsRecalculateButton } from "@/features/results/components/results-recalculate-button";
import { useLayoutStore } from "@/stores/layout-store";

/**
 * Defines the props for the ResultsHeader component.
 */
interface ResultsHeaderProps {
  /**
   * The full case data object, including the recalculation status.
   */
  caseData: typeof cases.$inferSelect;
}

/**
 * A client component responsible for managing the header content for the results page.
 */
export const ResultsHeader = ({ caseData }: ResultsHeaderProps) => {
  const params = useParams();
  const caseId = typeof params.resultsId === "string" ? params.resultsId : null;

  const setHeaderAdditionalContent = useLayoutStore((state) => state.setHeaderAdditionalContent);
  const clearHeaderAdditionalContent = useLayoutStore(
    (state) => state.clearHeaderAdditionalContent
  );

  useEffect(() => {
    if (caseId) {
      setHeaderAdditionalContent(
        <div className="flex items-center gap-1 sm:gap-2">
          <ResultsRecalculateButton caseId={caseId} isDisabled={!caseData.recalculationNeeded} />
          <ResultsExportDropdown caseId={caseId} />
        </div>
      );
    }

    // Cleanup function to remove the content when the component unmounts.
    return () => {
      clearHeaderAdditionalContent();
    };
  }, [caseId, caseData, setHeaderAdditionalContent, clearHeaderAdditionalContent]);

  return null;
};
