"use client";

import { useEffect } from "react";

import { AnalyzeDetails } from "@/features/analyze/components/analyze-details";
import { AnalyzeReview } from "@/features/analyze/components/analyze-review";
import { AnalyzeUpload } from "@/features/analyze/components/analyze-upload";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";

export const AnalyzeWizard = () => {
  // Select only the `step` value.
  const step = useAnalyzeStore((state) => state.step);
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
      {step === 1 && <AnalyzeDetails />}
      {step === 2 && <AnalyzeUpload />}
      {step === 3 && <AnalyzeReview />}
    </div>
  );
};
