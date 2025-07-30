import { AnimatePresence, motion } from "framer-motion";
import React, { memo } from "react";

import { CaseItem } from "@/features/results/components/case-item";
import { type Case } from "@/features/results/components/results-preview";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the case list component.
 */
interface CaseListProps extends Omit<React.ComponentProps<typeof CaseItem>, "caseItem" | "ref"> {
  /** The array of case objects to be rendered. */
  cases: Case[];
  /** A ref object passed from the parent, which will be forwarded to the actively renaming case item. */
  inputRef: React.RefObject<HTMLInputElement | null>;
}

/**
 * A memoized component that renders an animated grid or list of case items.
 * It orchestrates the layout and animations of its `CaseItem` children and
 * manages the forwarding of a ref to the actively edited item.
 */
export const CaseList = memo(({ cases, viewMode, inputRef, ...caseItemProps }: CaseListProps) => {
  return (
    // The main animated container for the list.
    <motion.div
      key={viewMode}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      // Dynamically applies the correct CSS grid classes based on the current view mode.
      className={cn(
        "grid gap-3 sm:gap-4",
        viewMode === "list"
          ? "grid-cols-1 md:grid-cols-2"
          : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-5"
      )}
    >
      <AnimatePresence>
        {cases.map((caseItem) => (
          <CaseItem
            key={caseItem.id}
            ref={caseItem.id === caseItemProps.renamingCaseId ? inputRef : null}
            caseItem={caseItem}
            viewMode={viewMode}
            {...caseItemProps}
          />
        ))}
      </AnimatePresence>
    </motion.div>
  );
});

CaseList.displayName = "CaseList";
