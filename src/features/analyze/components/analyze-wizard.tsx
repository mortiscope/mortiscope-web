"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BeatLoader } from "react-spinners";
import { toast } from "sonner";

import { getCaseUploads } from "@/features/analyze/actions/get-case-uploads";
import { getDraftCase } from "@/features/analyze/actions/get-draft-case";
import { AnalyzeDetails } from "@/features/analyze/components/analyze-details";
import { AnalyzeReview } from "@/features/analyze/components/analyze-review";
import { AnalyzeUpload } from "@/features/analyze/components/analyze-upload";
import { type DetailsFormData } from "@/features/analyze/schemas/details";
import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";

export const AnalyzeWizard = () => {
  const {
    status,
    reset: resetAnalyzeStore,
    caseId,
    hydrateFiles,
    isHydrated: isStoreHydrated,
    setCaseId,
    updateDetailsData,
  } = useAnalyzeStore();

  const [isDraftCheckComplete, setIsDraftCheckComplete] = useState(false);

  const { data: draftCaseData, isFetching: isFetchingDraft } = useQuery({
    queryKey: ["draftCase"],
    queryFn: getDraftCase,
    enabled: isStoreHydrated,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    // Wait until the initial query has finished.
    if (isFetchingDraft) {
      return;
    }

    if (draftCaseData) {
      // A draft was found in the database. Sync the store's state with it.
      setCaseId(draftCaseData.id);
      const details: DetailsFormData = {
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
      };
      updateDetailsData(details);
    } else {
      // No draft was found. If the store has a stale caseId from local storage, clear it.
      if (useAnalyzeStore.getState().caseId) {
        setCaseId(null);
        updateDetailsData({});
      }
    }

    // Mark that the initial synchronization is complete.
    setIsDraftCheckComplete(true);
  }, [isFetchingDraft, draftCaseData, setCaseId, updateDetailsData]);

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
    enabled: !!caseId,
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

  if (!isDraftCheckComplete) {
    return (
      <div className="flex min-h-[450px] flex-col items-center justify-center space-y-2">
        <BeatLoader color="#16a34a" size={12} />
        <p className="font-plus-jakarta-sans p-2 text-center text-lg font-medium text-slate-700 md:text-xl">
          Loading form data...
        </p>
      </div>
    );
  }

  return (
    <div>
      {status === "details" && <AnalyzeDetails />}
      {status === "upload" && <AnalyzeUpload />}
      {(status === "review" || status === "processing") && <AnalyzeReview />}
    </div>
  );
};
