"use client";

import { AnalyzeUpload } from "@/features/analyze/components/analyze-upload";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";

export const AnalyzeWizard = () => {
  const step = useAnalyzeStore((state) => state.step);

  return <div>{step === 1 && <AnalyzeUpload />}</div>;
};
