import * as React from "react";

import { DateRangePicker } from "@/features/dashboard/components/date-range-picker";
import { TimePeriodFilter } from "@/features/dashboard/components/time-period-filter";

/**
 * Defines the props for the dashboard header component.
 */
interface DashboardHeaderProps {
  /** The first name of the logged-in user, used to display a personalized greeting. */
  firstName: string;
}

/**
 * A presentational component that renders the main header for the dashboard.
 * @param {DashboardHeaderProps} props The props for the component.
 * @returns A React component representing the dashboard header.
 */
export function DashboardHeader({ firstName }: DashboardHeaderProps) {
  return (
    // The main container uses a responsive flexbox layout.
    <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:justify-between">
      {/* The container for the welcome message. */}
      <div className="min-w-0 flex-1">
        <h1 className="font-plus-jakarta-sans grid grid-cols-[auto_minmax(0,1fr)] justify-center gap-1 py-0.5 text-2xl leading-normal font-medium tracking-tight text-slate-800 md:justify-start md:text-3xl lg:text-4xl">
          <span>Welcome,</span>
          <span className="truncate">{firstName}!</span>
        </h1>
      </div>
      {/* The container for the time period filter and date range picker. */}
      <div className="flex w-full flex-shrink-0 items-center gap-2 md:w-auto">
        <div className="w-auto">
          <TimePeriodFilter />
        </div>
        <div className="flex-1 md:w-auto md:flex-none">
          <DateRangePicker />
        </div>
      </div>
    </div>
  );
}

DashboardHeader.displayName = "DashboardHeader";
