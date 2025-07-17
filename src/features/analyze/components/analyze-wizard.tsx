"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { getCaseUploads } from "@/features/analyze/actions/get-case-uploads";
import { AnalyzeDetails } from "@/features/analyze/components/analyze-details";
import { AnalyzeReview } from "@/features/analyze/components/analyze-review";
import { AnalyzeUpload } from "@/features/analyze/components/analyze-upload";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";

export const AnalyzeWizard = () => {
  // Select state and actions from the Zustand store.
  const status = useAnalyzeStore((state) => state.status);
  const resetAnalyzeStore = useAnalyzeStore((state) => state.reset);
  const caseId = useAnalyzeStore((state) => state.caseId);
  const hydrateFiles = useAnalyzeStore((state) => state.hydrateFiles);
  const isHydrated = useAnalyzeStore((state) => state.isHydrated);

  /**
   * TanStack Query hook to fetch the uploads associated with the current caseId.
   * This query is only enabled when the store has been hydrated and a caseId exists.
   */
  const { data: uploadsData } = useQuery({
    queryKey: ["uploads", caseId],
    queryFn: async () => {
      // Don't proceed without a caseId.
      if (!caseId) return null;

      const result = await getCaseUploads(caseId);
      if (!result.success) {
        toast.error(result.error || "Failed to load existing uploads.");
        return null;
      }
      return result.data;
    },
    enabled: isHydrated && !!caseId,
    refetchOnWindowFocus: false,
  });

  /**
   * An effect to hydrate the store with the fetched upload data.
   * This runs whenever the `uploadsData` from the query changes.
   */
  useEffect(() => {
    // Hydrate with `uploadsData` even if it's an empty array.
    if (uploadsData) {
      hydrateFiles(uploadsData);
    }
  }, [uploadsData, hydrateFiles]);

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
