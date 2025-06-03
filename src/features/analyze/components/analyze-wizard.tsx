"use client";

import { AnalyzeDetails } from "@/features/analyze/components/analyze-details";
import { AnalyzeReview } from "@/features/analyze/components/analyze-review";
import { AnalyzeUpload } from "@/features/analyze/components/analyze-upload";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";

export const AnalyzeWizard = () => {
  const step = useAnalyzeStore((state) => state.step);

  return (
    <div>
      {step === 1 && <AnalyzeUpload />}
      {step === 2 && <AnalyzeDetails />}
      {step === 3 && <AnalyzeReview />}
    </div>
  );
};
