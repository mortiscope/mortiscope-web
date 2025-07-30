import React, { memo } from "react";
import { FaFolder } from "react-icons/fa6";

/**
 * Renders an initial empty state when no cases exist.
 */
export const ResultsEmptyState = memo(() => {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <FaFolder className="h-16 w-16 text-slate-300" />
      <h3 className="font-inter mt-4 text-lg font-medium text-slate-800">No Results Found</h3>
      <p className="font-inter mt-1 text-sm text-slate-500">You have not created any cases yet.</p>
    </div>
  );
});

ResultsEmptyState.displayName = "ResultsEmptyState";
