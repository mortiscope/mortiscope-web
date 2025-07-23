"use client";

import { useEffect } from "react";

import { ResultsExportDropdown } from "@/features/results/components/results-export-dropdown";
import { useLayoutStore } from "@/stores/layout-store";

/**
 * A client component responsible for managing the header content for the results page.
 */
export const ResultsHeader = () => {
  const setHeaderAdditionalContent = useLayoutStore((state) => state.setHeaderAdditionalContent);
  const clearHeaderAdditionalContent = useLayoutStore(
    (state) => state.clearHeaderAdditionalContent
  );

  useEffect(() => {
    // Set the dropdown when the component mounts.
    setHeaderAdditionalContent(<ResultsExportDropdown />);

    // Cleanup function to remove the dropdown when the component unmounts.
    return () => {
      clearHeaderAdditionalContent();
    };
  }, [setHeaderAdditionalContent, clearHeaderAdditionalContent]);

  return null;
};
