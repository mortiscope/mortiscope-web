"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ResultsExportDropdown } from "@/features/results/components/results-export-dropdown";
import { ResultsRecalculateButton } from "@/features/results/components/results-recalculate-button";
import { useLayoutStore } from "@/stores/layout-store";

/**
 * A client component responsible for managing the header content for the results page.
 */
export const ResultsHeader = () => {
  const params = useParams();
  const caseId = typeof params.resultsId === "string" ? params.resultsId : null;

  const [isRecalculateNeeded] = useState(false);

  const setHeaderAdditionalContent = useLayoutStore((state) => state.setHeaderAdditionalContent);
  const clearHeaderAdditionalContent = useLayoutStore(
    (state) => state.clearHeaderAdditionalContent
  );

  useEffect(() => {
    if (caseId) {
      setHeaderAdditionalContent(
        <div className="flex items-center gap-1 sm:gap-2">
          <ResultsRecalculateButton caseId={caseId} isDisabled={!isRecalculateNeeded} />
          <ResultsExportDropdown caseId={caseId} />
        </div>
      );
    }

    // Cleanup function to remove the content when the component unmounts.
    return () => {
      clearHeaderAdditionalContent();
    };
  }, [caseId, isRecalculateNeeded, setHeaderAdditionalContent, clearHeaderAdditionalContent]);

  return null;
};
