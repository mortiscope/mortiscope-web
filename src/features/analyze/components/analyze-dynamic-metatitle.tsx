"use client";

import { useEffect } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AnalyzeProgress } from "@/features/analyze/components/analyze-progress";
import { AnalyzeWizard } from "@/features/analyze/components/analyze-wizard";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";

/**
 * The main client-side component for the multi-step analysis workflow.
 * This component handles all state, effects, and rendering for the wizard.
 */
export const AnalyzeDynamicMetatitle = () => {
  // Subscribes to the global store to get the current step number and actions.
  const step = useAnalyzeStore((state) => state.step);
  const resetAnalyzeStore = useAnalyzeStore((state) => state.reset);

  useEffect(() => {
    resetAnalyzeStore();
  }, [resetAnalyzeStore]);

  // Effect to dynamically update the page's metatitle based on the current step.
  useEffect(() => {
    // An array of titles corresponding to each step of the analysis process.
    const stepTitles = ["Analysis Details", "Provide an Image", "Review and Submit"];

    // Get the title for the current step.
    const currentStepTitle = stepTitles[step - 1] || "Analyze";

    // Construct the full dynamic title string and set it.
    document.title = `Analyze — ${currentStepTitle} • MortiScope`;

    // Cleanup function to reset the title when the component unmounts.
    return () => {
      document.title = "MortiScope";
    };
  }, [step]);

  return (
    // Main container for the analyze page, now holding separate cards.
    <div className="flex w-full flex-col gap-y-4 md:gap-y-6">
      {/* Card for the progress bar. */}
      <Card className="w-full rounded-2xl py-4 shadow-none md:rounded-3xl md:py-6">
        <CardHeader>
          <div className="mx-auto w-full">
            <AnalyzeProgress currentStep={step} />
          </div>
        </CardHeader>
      </Card>

      {/* Card for the main wizard content. */}
      <Card className="w-full rounded-2xl shadow-none md:rounded-3xl">
        <CardContent className="min-h-[450px] overflow-hidden">
          <AnalyzeWizard />
        </CardContent>
      </Card>
    </div>
  );
};
