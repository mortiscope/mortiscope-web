import { getDashboardMetrics } from "@/features/dashboard/actions/get-dashboard-metrics";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import type { CaseData } from "@/features/dashboard/schemas/dashboard";

/**
 * Defines the props for the dashboard container component.
 */
interface DashboardContainerProps {
  /** The first name of the user, used for a personalized greeting. */
  firstName: string;
  /** The list of cases to display. */
  caseData: CaseData[];
}

/**
 * A server component that serves as the main container for the dashboard.
 * @param {DashboardContainerProps} props The props for the component.
 * @returns A JSX element representing the dashboard layout.
 */
export const DashboardContainer = async ({ firstName, caseData }: DashboardContainerProps) => {
  // Fetches the dashboard metrics directly on the server before the component is rendered.
  const initialData = await getDashboardMetrics();

  // Calculate the oldest case date from the case data for the "all-time" filter option.
  const oldestCaseDate =
    caseData.length > 0
      ? caseData.reduce((oldest, current) => {
          const currentDate = new Date(current.caseDate);
          return currentDate < new Date(oldest) ? current.caseDate : oldest;
        }, caseData[0].caseDate)
      : undefined;

  return (
    <DashboardView
      firstName={firstName}
      oldestCaseDate={oldestCaseDate}
      caseData={caseData}
      initialData={initialData}
    />
  );
};

DashboardContainer.displayName = "DashboardContainer";
