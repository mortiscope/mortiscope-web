import React, { forwardRef, memo } from "react";
import { FaFolder } from "react-icons/fa6";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { type Case } from "@/features/results/components/results-preview";
import { type ViewMode } from "@/features/results/store/results-store";
import { cn, formatDate } from "@/lib/utils";

/**
 * Defines the props required by the case item content component.
 */
interface CaseItemContentProps {
  /** The case object containing the data to display. */
  caseItem: Case;
  /** The current view mode ('list' or 'grid'), which determines the layout. */
  viewMode: ViewMode;
  /** A boolean to determine if this specific item is in the active renaming state. */
  isRenameActive: boolean;
  /** A boolean to indicate if a rename mutation is currently in progress. */
  isRenaming: boolean;
  /** The temporary value of the case name during editing. */
  tempCaseName: string;
  /** A callback to update the temporary case name as the user types. */
  onTempCaseNameChange: (value: string) => void;
  /** A callback to confirm and submit the rename action, typically on blur. */
  onConfirmRename: () => void;
  /** A callback to handle keyboard events for the rename input (e.g., Enter, Escape). */
  onRenameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * A memoized component that renders the core content of a case item.
 */
export const CaseItemContent = memo(
  forwardRef<HTMLInputElement, CaseItemContentProps>(
    (
      {
        caseItem,
        viewMode,
        isRenameActive,
        isRenaming,
        tempCaseName,
        onTempCaseNameChange,
        onConfirmRename,
        onRenameKeyDown,
      },
      ref
    ) => {
      // List View Layout
      if (viewMode === "list") {
        return (
          // The main container for the list item content.
          <div className="flex min-w-0 flex-grow items-center gap-3">
            {/* The folder icon. */}
            <div
              className={cn(
                "flex flex-shrink-0 items-center justify-center rounded-full transition-all duration-300",
                "h-9 w-9 lg:h-12 lg:w-12",
                caseItem.verificationStatus === "verified"
                  ? "bg-emerald-100"
                  : caseItem.verificationStatus === "in_progress"
                    ? "bg-sky-100"
                    : caseItem.verificationStatus === "unverified"
                      ? "bg-amber-100"
                      : "bg-rose-100"
              )}
            >
              <FaFolder
                className={cn(
                  "transition-colors duration-300",
                  "h-4 w-4 lg:h-6 lg:w-6",
                  caseItem.verificationStatus === "verified"
                    ? "text-emerald-600"
                    : caseItem.verificationStatus === "in_progress"
                      ? "text-sky-600"
                      : caseItem.verificationStatus === "unverified"
                        ? "text-amber-500"
                        : "text-rose-500"
                )}
              />
            </div>
            {/* Container for the case name and date. */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {isRenameActive ? (
                  // Renders an editable input when in renaming mode.
                  <Input
                    ref={ref}
                    value={tempCaseName}
                    onChange={(e) => onTempCaseNameChange(e.target.value)}
                    onBlur={onConfirmRename}
                    onKeyDown={onRenameKeyDown}
                    disabled={isRenaming}
                    maxLength={256}
                    className="font-plus-jakarta-sans h-auto truncate border-none bg-transparent p-0 pb-0.5 text-sm font-medium text-slate-800 shadow-none ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 lg:text-base"
                  />
                ) : (
                  // Renders a static paragraph when not renaming.
                  <p className="font-plus-jakarta-sans truncate pb-0.5 text-sm font-medium text-slate-800 lg:text-base">
                    {caseItem.caseName}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="truncate text-xs text-slate-500 lg:text-sm">
                  {formatDate(caseItem.caseDate)}
                </p>
              </div>
            </div>
          </div>
        );
      }

      // Grid View Layout
      return (
        <>
          {/* Container for Icon and Badge */}
          <div className="relative mb-3">
            {/* The folder icon, with responsive sizing. */}
            <div
              className={cn(
                "flex items-center justify-center rounded-full transition-all duration-300",
                "h-12 w-12 sm:h-16 sm:w-16 md:h-16 md:w-16 lg:h-20 lg:w-20",
                caseItem.verificationStatus === "verified"
                  ? "bg-emerald-100"
                  : caseItem.verificationStatus === "in_progress"
                    ? "bg-sky-100"
                    : caseItem.verificationStatus === "unverified"
                      ? "bg-amber-100"
                      : "bg-rose-100"
              )}
            >
              <FaFolder
                className={cn(
                  "transition-colors duration-300",
                  "h-6 w-6 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-10 lg:w-10",
                  caseItem.verificationStatus === "verified"
                    ? "text-emerald-600"
                    : caseItem.verificationStatus === "in_progress"
                      ? "text-sky-600"
                      : caseItem.verificationStatus === "unverified"
                        ? "text-amber-500"
                        : "text-rose-500"
                )}
              />
            </div>

            {/* Badge positioned absolutely over the bottom of the icon */}
            <Badge
              variant="secondary"
              className={cn(
                "absolute -bottom-4 left-1/2 z-10 h-5 -translate-x-1/2 rounded-sm px-1.5 text-xs font-normal whitespace-nowrap",
                caseItem.verificationStatus === "verified"
                  ? "bg-emerald-200 text-emerald-700 hover:bg-emerald-200"
                  : caseItem.verificationStatus === "in_progress"
                    ? "bg-sky-200 text-sky-700 hover:bg-sky-200"
                    : caseItem.verificationStatus === "unverified"
                      ? "bg-amber-200 text-amber-700 hover:bg-amber-200"
                      : "bg-rose-200 text-rose-700 hover:bg-rose-200"
              )}
            >
              {caseItem.verificationStatus === "verified"
                ? "Verified"
                : caseItem.verificationStatus === "in_progress"
                  ? "In Progress"
                  : caseItem.verificationStatus === "unverified"
                    ? "Unverified"
                    : "No Detections"}
            </Badge>
          </div>

          {/* The centered container for the case name and date. */}
          <div className="flex w-full flex-col items-center justify-end gap-1">
            {isRenameActive ? (
              <Input
                ref={ref}
                value={tempCaseName}
                onChange={(e) => onTempCaseNameChange(e.target.value)}
                onBlur={onConfirmRename}
                onKeyDown={onRenameKeyDown}
                disabled={isRenaming}
                maxLength={256}
                className="font-plus-jakarta-sans h-auto w-full truncate border-none bg-transparent p-0 px-2 text-center text-sm font-medium text-slate-800 shadow-none ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 lg:text-base"
              />
            ) : (
              <p className="font-plus-jakarta-sans w-full truncate px-2 text-sm font-medium text-slate-800 lg:text-base lg:font-semibold">
                {caseItem.caseName}
              </p>
            )}
            <p className="truncate text-xs text-slate-500 lg:text-sm">
              {formatDate(caseItem.caseDate)}
            </p>
          </div>
        </>
      );
    }
  )
);

CaseItemContent.displayName = "CaseItemContent";
