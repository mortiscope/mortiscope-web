import { Skeleton } from "@/components/ui/skeleton";
import { LG_GRID_LIMIT, MD_GRID_LIMIT, SM_GRID_LIMIT } from "@/lib/constants";

/**
 * A skeleton loader that mimics the layout of the results details component.
 */
export const ResultsDetailsSkeleton = () => (
  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <Skeleton key={`detail-skeleton-${i}`} className="h-40 rounded-2xl bg-white" />
    ))}
  </div>
);

/**
 * A skeleton loader that mimics the layout of the results analysis component.
 */
export const ResultsAnalysisSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6 lg:grid-rows-2">
    {/* Main Case Summary Card Skeleton */}
    <div className="col-span-1 flex h-96 flex-col gap-4 rounded-3xl bg-white p-4 shadow-none md:col-span-2 md:p-8 lg:col-span-4 lg:row-span-2 lg:h-auto">
      <div className="flex items-start justify-between">
        <Skeleton className="h-8 w-1/2 rounded-md bg-slate-200 md:w-1/3" />
        <Skeleton className="h-9 w-28 rounded-md bg-slate-100" />
      </div>
      <Skeleton className="h-full w-full flex-grow rounded-2xl bg-slate-100" />
    </div>
    {/* PMI & Reviewed Images Card Skeletons */}
    <Skeleton className="h-52 rounded-3xl bg-white lg:col-span-2" />
    <Skeleton className="h-52 rounded-3xl bg-white lg:col-span-2" />
  </div>
);

/**
 * A skeleton loader that accurately mimics the multi-part, responsive layout of the results images component.
 */
export const ResultsImagesSkeleton = () => (
  <div className="flex w-full flex-1 flex-col">
    {/* Skeleton for Controls */}
    <div className="mb-4 flex items-center justify-between gap-2">
      <Skeleton className="h-10 w-full max-w-sm bg-white" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-10 w-11 shrink-0 bg-white sm:w-[190px]" />
      </div>
    </div>

    {/* Skeletons for the responsive image grid, mirroring the actual component's logic */}
    <div>
      {/* Large Screen Skeleton Layout */}
      <div className="hidden grid-cols-5 gap-3 lg:grid">
        {Array.from({ length: LG_GRID_LIMIT }).map((_, i) => (
          <Skeleton
            key={`lg-image-skeleton-${i}`}
            className="aspect-square rounded-xl bg-white md:rounded-2xl lg:rounded-3xl"
          />
        ))}
      </div>

      {/* Medium Screen Skeleton Layout */}
      <div className="hidden grid-cols-4 gap-3 md:grid lg:hidden">
        {Array.from({ length: MD_GRID_LIMIT }).map((_, i) => (
          <Skeleton
            key={`md-image-skeleton-${i}`}
            className="aspect-square rounded-xl bg-white md:rounded-2xl"
          />
        ))}
      </div>

      {/* Small Screen Skeleton Layout */}
      <div className="grid grid-cols-2 gap-3 md:hidden">
        {Array.from({ length: SM_GRID_LIMIT }).map((_, i) => (
          <Skeleton key={`sm-image-skeleton-${i}`} className="aspect-square rounded-xl bg-white" />
        ))}
      </div>
    </div>
  </div>
);
