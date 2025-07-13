"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { getCases } from "@/features/results/actions/get-cases";
import { ResultsPreview } from "@/features/results/components/results-preview";
import { useResultsStore } from "@/features/results/store/results-store";
import { cn } from "@/lib/utils";

/**
 * Renders a skeleton loader that mimics the layout of the results page.
 * It adapts to the currently selected view mode (grid or list).
 */
const ResultsSkeleton = () => {
  const viewMode = useResultsStore((state) => state.viewMode);
  const skeletonCount = 20;

  return (
    <div className="mt-6 flex w-full flex-1 flex-col">
      {/* Skeleton for Controls */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-[110px] shrink-0 sm:w-[190px]" />
          <Skeleton className="h-10 w-[74px] shrink-0" />
        </div>
      </div>

      {/* Skeleton for Grid/List */}
      <div
        className={cn(
          "grid gap-3 sm:gap-4",
          viewMode === "list"
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        )}
      >
        {Array.from({ length: skeletonCount }).map((_, i) =>
          viewMode === "list" ? (
            // List View Skeleton
            <div
              key={`list-skeleton-${i}`}
              className="flex h-full items-center justify-between rounded-xl border-2 border-slate-200 bg-slate-100 p-4 md:rounded-2xl"
            >
              <div className="flex min-w-0 flex-grow items-center gap-3">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full bg-slate-200" />
                <div className="w-full min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4 bg-slate-200" />
                  <Skeleton className="h-3 w-1/2 bg-slate-200" />
                </div>
              </div>
            </div>
          ) : (
            // Grid View Skeleton
            <div
              key={`grid-skeleton-${i}`}
              className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-100 p-2 text-center sm:gap-4 sm:p-4 md:rounded-3xl"
            >
              <Skeleton className="h-12 w-12 rounded-full bg-slate-200 sm:h-16 sm:w-16 lg:h-20 lg:w-20" />
              <div className="flex w-full flex-col items-center justify-end space-y-2">
                <Skeleton className="h-4 w-5/6 bg-slate-200" />
                <Skeleton className="h-3 w-1/2 bg-slate-200" />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};

/**
 * The client-side container for the results page.
 */
export const ResultsContainer = () => {
  const {
    data: cases,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["cases"],
    queryFn: () => getCases(),
  });

  // Handle errors with a toast message.
  useEffect(() => {
    if (isError) {
      toast.error("Failed to load cases");
    }
  }, [isError]);

  return isLoading || isError ? <ResultsSkeleton /> : <ResultsPreview initialCases={cases || []} />;
};
