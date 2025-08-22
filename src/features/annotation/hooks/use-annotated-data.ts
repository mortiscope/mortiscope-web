"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { getCaseById } from "@/features/results/actions/get-case-by-id";

/**
 * A custom hook that fetches the full data for a specific case, then maps and sorts its
 * associated images based on the user's preference from a global store. This hook is
 * designed to provide the necessary data specifically for the annotation editor interface.
 *
 * @param caseId The unique identifier of the case to fetch data for.
 * @returns An object containing the case name, the sorted list of images, the total image count, and the loading state.
 */
export const useAnnotatedData = (caseId: string) => {
  // Retrieves the current user-selected sort option from the global Zustand store.
  const sortOption = useAnalyzeStore((state) => state.sortOption);

  // Initializes Tanstack Query to fetch the full case data, including all uploads.
  const { data: caseData, isLoading } = useQuery({
    // The query key includes the `caseId` to ensure data is cached uniquely for each case.
    queryKey: ["case", caseId],
    // The query function calls the `getCaseById` server action.
    queryFn: () => getCaseById(caseId),
    // The query is only enabled when a valid `caseId` is provided to prevent unnecessary or failing API calls.
    enabled: !!caseId,
  });

  // Maps the raw `uploads` data from the server into a simplified format
  const images = useMemo(() => {
    if (!caseData) return [];
    return caseData.uploads.map((upload) => ({
      id: upload.id,
      name: upload.name.replace(/\.[^/.]+$/, ""),
      size: upload.size,
      createdAt: upload.createdAt,
    }));
  }, [caseData]);

  // Creates a shallow copy of the mapped images then sorts it based on the sort option from the global store.
  const sortedImages = useMemo(() => {
    const sorted = [...images];
    switch (sortOption) {
      case "name-asc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case "size-asc":
        sorted.sort((a, b) => a.size - b.size);
        break;
      case "size-desc":
        sorted.sort((a, b) => b.size - a.size);
        break;
      case "date-modified-desc":
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
      case "date-modified-asc":
        sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case "date-uploaded-asc":
        sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        break;
      case "date-uploaded-desc":
      default:
        // The default sort order is by most recently created.
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
    }
    return sorted;
  }, [images, sortOption]);

  // Handles the loading or error state by returning a default, empty data structure.
  if (!caseData) {
    return {
      caseName: "",
      images: [],
      totalImages: 0,
      isLoading,
    };
  }

  // Exposes the final, processed data for the consuming interface component.
  return {
    caseName: caseData.caseName,
    images: sortedImages,
    totalImages: sortedImages.length,
    isLoading,
  };
};
