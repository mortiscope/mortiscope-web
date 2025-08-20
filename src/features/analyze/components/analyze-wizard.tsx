"use client";

import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { BeatLoader } from "react-spinners";
import { toast } from "sonner";

import { getCaseUploads } from "@/features/analyze/actions/get-case-uploads";
import { getDraftCase } from "@/features/analyze/actions/get-draft-case";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { type CaseDetailsFormData } from "@/features/cases/schemas/case-details";

// Dynamic imports for wizard steps
const AnalyzeDetails = dynamic(
  () =>
    import("@/features/analyze/components/analyze-details").then((module) => ({
      default: module.AnalyzeDetails,
    })),
  { ssr: false }
);
const AnalyzeUpload = dynamic(
  () =>
    import("@/features/analyze/components/analyze-upload").then((module) => ({
      default: module.AnalyzeUpload,
    })),
  { ssr: false }
);
const AnalyzeReview = dynamic(
  () =>
    import("@/features/analyze/components/analyze-review").then((module) => ({
      default: module.AnalyzeReview,
    })),
  { ssr: false }
);

/**
 * A client component that orchestrates the multi-step analysis process.
 */
export const AnalyzeWizard = () => {
  // Retrieves state and actions from the store for analysis.
  const {
    status,
    reset: resetAnalyzeStore,
    caseId,
    hydrateFiles,
    isHydrated: isStoreHydrated,
    setCaseId,
    updateDetailsData,
  } = useAnalyzeStore();

  // Local state to track the completion of the initial data synchronization.
  const [isInitializationComplete, setIsInitializationComplete] = useState(false);

  /**
   * Hook to fetch an existing draft case from the server.
   * This query is enabled only after the client-side store has been hydrated from persistent storage.
   */
  const { data: draftCaseData, isFetching: isFetchingDraft } = useQuery({
    queryKey: ["draftCase"],
    queryFn: getDraftCase,
    enabled: isStoreHydrated,
    refetchOnWindowFocus: false,
    refetchOnMount: "always",
  });

  /**
   * A `useEffect` hook that handles the initial data synchronization.
   */
  useEffect(() => {
    // Wait until the store is hydrated and the draft query has finished.
    if (isFetchingDraft || !isStoreHydrated) {
      return;
    }

    // Prevent this effect from re-running after the initial setup is complete.
    if (isInitializationComplete) {
      return;
    }

    if (draftCaseData) {
      // A draft was found. Sync the store with its data.
      setCaseId(draftCaseData.id);
      const details: CaseDetailsFormData = {
        caseName: draftCaseData.caseName,
        caseDate: draftCaseData.caseDate,
        temperature: {
          value: draftCaseData.temperatureCelsius,
          unit: "C",
        },
        location: {
          region: { name: draftCaseData.locationRegion, code: "" },
          province: { name: draftCaseData.locationProvince, code: "" },
          city: { name: draftCaseData.locationCity, code: "" },
          barangay: { name: draftCaseData.locationBarangay, code: "" },
        },
        notes: draftCaseData.notes ?? "",
      };
      updateDetailsData(details);
    } else {
      // No draft case was found on the server.
      if (caseId) {
        resetAnalyzeStore();
      }
    }

    // Mark that the initial synchronization or reset is complete. This will stop the loader.
    setIsInitializationComplete(true);
  }, [
    isFetchingDraft,
    draftCaseData,
    setCaseId,
    updateDetailsData,
    isStoreHydrated,
    resetAnalyzeStore,
    caseId,
    isInitializationComplete,
  ]);

  /**
   * Hook to fetch existing image uploads for the current case.
   * This query is enabled only after a `caseId` is available and the initial draft synchronization is complete.
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
    enabled: !!caseId && isInitializationComplete,
    refetchOnWindowFocus: false,
  });

  /**
   * An effect to hydrate the store with the fetched upload data.
   */
  useEffect(() => {
    // Hydrate with `uploadsData` even if it's an empty array.
    if (uploadsData) {
      hydrateFiles(uploadsData);
    }
  }, [uploadsData, hydrateFiles]);

  // Renders a loading indicator while the initial data synchronization is in progress.
  if (!isInitializationComplete) {
    return (
      <div className="flex min-h-[450px] flex-col items-center justify-center space-y-2">
        <BeatLoader color="#16a34a" size={12} />
        <p className="font-plus-jakarta-sans p-2 text-center text-lg font-medium text-slate-700 md:text-xl">
          Loading form data...
        </p>
      </div>
    );
  }

  // Renders the appropriate component for the current step of the wizard.
  return (
    <div>
      {status === "details" && <AnalyzeDetails />}
      {status === "upload" && <AnalyzeUpload />}
      {(status === "review" || status === "processing") && <AnalyzeReview />}
    </div>
  );
};

AnalyzeWizard.displayName = "AnalyzeWizard";
