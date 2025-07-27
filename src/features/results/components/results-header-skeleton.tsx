"use client";

import { useEffect } from "react";

import { ResultsHeaderSkeletonWrapper } from "@/features/results/components/results-skeleton";
import { useLayoutStore } from "@/stores/layout-store";

/**
 * A client component that sets skeleton content in the header during loading.
 */
export const ResultsHeaderSkeleton = () => {
  const setHeaderAdditionalContent = useLayoutStore((state) => state.setHeaderAdditionalContent);
  const clearHeaderAdditionalContent = useLayoutStore(
    (state) => state.clearHeaderAdditionalContent
  );

  useEffect(() => {
    // Set the skeleton content in the header
    setHeaderAdditionalContent(<ResultsHeaderSkeletonWrapper />);

    // Cleanup function to remove the content when the component unmounts
    return () => {
      clearHeaderAdditionalContent();
    };
  }, [setHeaderAdditionalContent, clearHeaderAdditionalContent]);

  // This component doesn't render anything visible itself
  return null;
};
