"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";

import { ResultsExportDropdown } from "@/features/results/components/results-export-dropdown";
import { useLayoutStore } from "@/stores/layout-store";

/**
 * A client component responsible for managing the header content for the results page.
 */
export const ResultsHeader = () => {
  const params = useParams();
  const caseId = typeof params.resultsId === "string" ? params.resultsId : null;

  const setHeaderAdditionalContent = useLayoutStore((state) => state.setHeaderAdditionalContent);
  const clearHeaderAdditionalContent = useLayoutStore(
    (state) => state.clearHeaderAdditionalContent
  );

  useEffect(() => {
    if (caseId) {
      setHeaderAdditionalContent(<ResultsExportDropdown caseId={caseId} />);
    }

    // Cleanup function to remove the dropdown when the component unmounts.
    return () => {
      clearHeaderAdditionalContent();
    };
  }, [caseId, setHeaderAdditionalContent, clearHeaderAdditionalContent]);

  return null;
};
