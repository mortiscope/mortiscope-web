"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { getUpload } from "@/features/analyze/actions/get-upload";
import { AnalyzeProgress } from "@/features/analyze/components/analyze-progress";
import { AnalyzeWizard } from "@/features/analyze/components/analyze-wizard";
import { type PersistedFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";

/**
 * The main client-side component for the multi-step analysis workflow.
 * This component handles all state, effects, and rendering for the wizard.
 */
export const AnalyzeDynamicMetatitle = () => {
  // Subscribes to the global store to get the current step number.
  const step = useAnalyzeStore((state) => state.step);
  const isHydrated = useAnalyzeStore((state) => state.isHydrated);
  const hydrateFiles = useAnalyzeStore((state) => state.hydrateFiles);

  // TanStack Query to fetch the user's existing uploads from the database.
  const { data, isSuccess } = useQuery<PersistedFile[] | null, Error>({
    queryKey: ["user-uploads"],
    queryFn: async () => {
      const result = await getUpload();
      // On failure, throw an error to be handled by TanStack Query's error state.
      if (!result.success || !result.data) {
        toast.error(result.error || "Failed to fetch existing uploads.");
        throw new Error(result.error || "Failed to fetch existing uploads.");
      }
      return result.data;
    },
    // This is the key optimization: only run the query if the store has not yet been hydrated.
    enabled: !isHydrated,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // Effect to hydrate the store with persisted data once a successful fetch completes.
  useEffect(() => {
    // Only hydrate if the query was successful.
    if (isSuccess && data && !isHydrated) {
      hydrateFiles(data);
    }
  }, [isSuccess, data, isHydrated, hydrateFiles]);

  // Effect to dynamically update the page's metatitle based on the current step.
  useEffect(() => {
    // An array of titles corresponding to each step of the analysis process.
    const stepTitles = ["Provide an Image", "Analysis Details", "Review and Submit"];

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
      <Card className="w-full rounded-2xl shadow-none md:rounded-3xl">
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
