import { motion } from "framer-motion";
import React, { forwardRef, memo } from "react";

import { CaseItemActions } from "@/features/results/components/case-item-actions";
import { CaseItemContent } from "@/features/results/components/case-item-content";
import { CaseItemDropdown } from "@/features/results/components/case-item-dropdown";
import { type Case } from "@/features/results/components/results-preview";
import { VerificationIndicator } from "@/features/results/components/verification-indicator";
import { type ViewMode } from "@/features/results/store/results-store";
import { cn } from "@/lib/utils";

/**
 * Defines the props required by the case item component.
 */
interface CaseItemProps {
  /** The case object containing the data to display. */
  caseItem: Case;
  /** The current view mode ('list' or 'grid'), which determines the layout. */
  viewMode: ViewMode;
  /** The ID of the case currently being renamed, or null if none. */
  renamingCaseId: string | null;
  /** A boolean indicating if a rename mutation is in progress. */
  isRenaming: boolean;
  /** The temporary value of the case name during editing. */
  tempCaseName: string;
  /** A callback to update the temporary case name. */
  onTempCaseNameChange: (value: string) => void;
  /** A callback to initiate the renaming process. */
  onStartRename: (e: React.MouseEvent | Event, caseId: string, currentName: string) => void;
  /** A callback to confirm and submit the rename action. */
  onConfirmRename: () => void;
  /** A callback to handle keyboard events for the rename input. */
  onRenameKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** A callback to handle viewing the case details. */
  onView: (caseId: string) => void;
  /** A callback to initiate the deletion of the case. */
  onDelete: (caseId: string, caseName: string) => void;
}

/**
 * A memoized component that renders a single case item. It acts as an orchestrator,
 * composing child components for its content and actions, and adapting its layout
 * for different view modes ('list' or 'grid') and states (viewing or renaming).
 * It forwards a ref to the internal input element to allow for programmatic focus.
 */
export const CaseItem = memo(
  forwardRef<HTMLInputElement, CaseItemProps>((props, ref) => {
    const { caseItem, viewMode, renamingCaseId, onView } = props;
    // A derived boolean to determine if this specific item is the one currently in the active renaming state.
    const isRenameActive = renamingCaseId === caseItem.id;

    return (
      // The main animated container for the item.
      <motion.div
        key={caseItem.id}
        layout
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{
          layout: { type: "tween", duration: 0.6, ease: "easeInOut" },
          opacity: { duration: 0.4 },
          scale: { duration: 0.4 },
        }}
        className="font-inter group relative"
      >
        {/* The main clickable/focusable wrapper for the entire item. */}
        <div
          onDoubleClick={() => {
            // Provides a quick way to open the case, but only if not already renaming.
            if (!isRenameActive) onView(caseItem.id);
          }}
          role="button"
          tabIndex={0}
          aria-label={`${caseItem.caseName}. Double-click to open, or use the menu for more actions.`}
          className={cn(
            "flex h-full w-full cursor-pointer items-center border-2 border-slate-200 bg-slate-50 transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2",
            caseItem.verificationStatus === "verified"
              ? "hover:bg-emerald-50"
              : caseItem.verificationStatus === "in_progress"
                ? "hover:bg-blue-50"
                : caseItem.verificationStatus === "unverified"
                  ? "hover:bg-amber-50"
                  : "hover:bg-rose-50",
            {
              // Applies styles for the 'list' view mode.
              "justify-between rounded-2xl p-2.5 lg:p-3": viewMode === "list",
              // Applies styles for the 'grid' view mode.
              "aspect-square flex-col justify-center gap-2 rounded-3xl px-3 py-2 text-center sm:gap-4 sm:p-4":
                viewMode === "grid",
            }
          )}
        >
          {/* Conditionally renders the layout based on the current view mode. */}
          {viewMode === "list" ? (
            <>
              <CaseItemContent {...props} ref={ref} isRenameActive={isRenameActive} />
              {/* Renders the full row of actions only on large screens (`lg` and up). */}
              <CaseItemActions {...props} />
              {/* Renders the dropdown menu only on smaller screens (hidden on `lg` and up). */}
              <div className="flex items-center gap-1 lg:hidden">
                <VerificationIndicator
                  verificationStatus={caseItem.verificationStatus}
                  totalDetections={caseItem.totalDetections}
                  verifiedDetections={caseItem.verifiedDetections}
                  showBadge={false}
                />
                <CaseItemDropdown {...props} isRenameActive={isRenameActive} />
              </div>
            </>
          ) : (
            <>
              {/* In grid view, the dropdown is positioned absolutely by its own styles. */}
              <CaseItemDropdown {...props} isRenameActive={isRenameActive} />
              <CaseItemContent {...props} ref={ref} isRenameActive={isRenameActive} />
            </>
          )}
        </div>
      </motion.div>
    );
  })
);

CaseItem.displayName = "CaseItem";
