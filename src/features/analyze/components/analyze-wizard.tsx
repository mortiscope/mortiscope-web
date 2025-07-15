"use client";

import { useEffect } from "react";

import { AnalyzeDetails } from "@/features/analyze/components/analyze-details";
import { AnalyzeReview } from "@/features/analyze/components/analyze-review";
import { AnalyzeUpload } from "@/features/analyze/components/analyze-upload";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";

export const AnalyzeWizard = () => {
  // Select the new 'status' value from the store.
  const status = useAnalyzeStore((state) => state.status);
  // Select only the `reset` action.
  const resetAnalyzeStore = useAnalyzeStore((state) => state.reset);

  /**
   * Resets the analysis store when the wizard is unmounted.
   */
  useEffect(() => {
    return () => {
      resetAnalyzeStore();
    };
  }, [resetAnalyzeStore]);

  return (
    <div>
      {status === "details" && <AnalyzeDetails />}
      {status === "upload" && <AnalyzeUpload />}
      {(status === "review" || status === "processing") && <AnalyzeReview />}
    </div>
  );
};
