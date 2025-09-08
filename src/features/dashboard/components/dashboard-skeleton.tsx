import { Skeleton } from "@/components/ui/skeleton";

/**
 * A skeleton loader for the dashboard header.
 */
export const DashboardHeaderSkeleton = () => (
  <div className="flex flex-col items-center gap-4 pt-23 md:flex-row md:items-center md:justify-between md:pt-12 lg:pt-15" />
);

DashboardHeaderSkeleton.displayName = "DashboardHeaderSkeleton";

/**
 * A skeleton loader for the dashboard metrics grid.
 */
export const DashboardMetricsGridSkeleton = () => (
  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <Skeleton key={`metric-skeleton-${i}`} className="h-40 rounded-2xl bg-white" />
    ))}
  </div>
);

DashboardMetricsGridSkeleton.displayName = "DashboardMetricsGridSkeleton";

/**
 * A skeleton loader for the dashboard analysis section.
 */
export const DashboardAnalysisSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-2 lg:grid-cols-6 lg:grid-rows-2">
    {/* Forensic Insights Widget Skeleton */}
    <Skeleton className="col-span-1 h-64 rounded-3xl bg-white md:col-span-2 md:h-96 lg:col-span-4 lg:row-span-2 lg:h-auto" />
    {/* Verification Status Widget Skeleton */}
    <Skeleton className="col-span-1 h-64 rounded-3xl bg-white lg:col-span-2" />
    {/* Quality Metrics Widget Skeleton */}
    <Skeleton className="col-span-1 h-64 rounded-3xl bg-white lg:col-span-2" />
  </div>
);

DashboardAnalysisSkeleton.displayName = "DashboardAnalysisSkeleton";

/**
 * A skeleton loader for the dashboard table container.
 */
export const DashboardTableSkeleton = () => (
  <div>
    <Skeleton className="h-96 w-full rounded-3xl bg-white p-4 md:p-8" />
  </div>
);

DashboardTableSkeleton.displayName = "DashboardTableSkeleton";

/**
 * The main dashboard skeleton loader that combines all sub-skeletons.
 */
export const DashboardSkeleton = () => (
  <div className="flex min-w-0 flex-1 flex-col gap-4">
    {/* Dashboard header skeleton */}
    <DashboardHeaderSkeleton />
    {/* Dashboard metrics grid skeleton */}
    <DashboardMetricsGridSkeleton />
    {/* Dashboard analysis widgets skeleton */}
    <DashboardAnalysisSkeleton />
    {/* Dashboard table skeleton */}
    <DashboardTableSkeleton />
  </div>
);

DashboardSkeleton.displayName = "DashboardSkeleton";
