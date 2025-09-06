import { getDashboardMetrics } from "@/features/dashboard/actions/get-dashboard-metrics";
import { DashboardAnalysis } from "@/features/dashboard/components/dashboard-analysis";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { DashboardMetricsGrid } from "@/features/dashboard/components/dashboard-metrics-grid";

/**
 * Defines the props for the dashboard container component.
 */
interface DashboardContainerProps {
  /** The first name of the user, used for a personalized greeting. */
  firstName: string;
}

/**
 * A server component that serves as the main container for the dashboard.
 * @param {DashboardContainerProps} props The props for the component.
 * @returns A JSX element representing the dashboard layout.
 */
export const DashboardContainer = async ({ firstName }: DashboardContainerProps) => {
  // Fetches the dashboard metrics directly on the server before the component is rendered.
  const initialData = await getDashboardMetrics();

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      {/* Renders the static header component with a personalized greeting. */}
      <DashboardHeader firstName={firstName} />
      {/* Rents the main metrics grid, passing the server-fetched data as an initial prop. */}
      <DashboardMetricsGrid initialData={initialData} />
      {/* Renders the analytics widgets grid with charts and visualizations. */}
      <DashboardAnalysis />
    </div>
  );
};

DashboardContainer.displayName = "DashboardContainer";
