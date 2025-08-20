"use client";

import { memo } from "react";

import { cn } from "@/lib/utils";

/**
 * Props for the recovery code grid component.
 */
interface RecoveryCodeGridProps {
  /** Array of recovery codes to display */
  displayCodes: (string | null)[];
  /** Whether the grid is in loading state */
  isLoading: boolean;
}

/**
 * A component that renders the grid of recovery codes with proper styling for different states.
 */
export const RecoveryCodeGrid = memo(({ displayCodes, isLoading }: RecoveryCodeGridProps) => {
  if (isLoading) {
    // Renders a skeleton grid while fetching or regenerating codes.
    return (
      <div className="mx-auto grid max-w-sm grid-cols-2 gap-3 sm:max-w-none sm:grid-cols-4">
        {Array.from({ length: 16 }).map((_, index) => (
          <div
            key={index}
            className="flex h-10 w-full animate-pulse items-center justify-center rounded-md border-2 border-slate-200 bg-slate-100 px-2 py-1 font-mono text-xs sm:h-12 sm:px-3 sm:py-2 sm:text-sm"
          />
        ))}
      </div>
    );
  }

  // Renders the grid of recovery codes.
  return (
    <div className="mx-auto grid max-w-sm grid-cols-2 gap-3 sm:max-w-none sm:grid-cols-4">
      {displayCodes.map((code, index) => (
        <div
          key={index}
          className={cn(
            "flex h-10 w-full items-center justify-center rounded-md border-2 px-2 py-1 font-mono text-xs sm:h-12 sm:px-3 sm:py-2 sm:text-sm",
            // Applies different styles for used, unused, and empty slots.
            code
              ? code.includes("••••")
                ? "border-slate-200 bg-slate-50 text-slate-500"
                : "border-slate-200 bg-slate-50 text-slate-700"
              : "border-slate-100 bg-slate-50 text-transparent"
          )}
        >
          {code || ""}
        </div>
      ))}
    </div>
  );
});

RecoveryCodeGrid.displayName = "RecoveryCodeGrid";
