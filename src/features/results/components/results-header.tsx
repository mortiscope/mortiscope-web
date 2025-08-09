"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { cases } from "@/db/schema";
import { EditCaseButton } from "@/features/cases/components/edit-case-button";
import { ExportDropdown } from "@/features/export/components/export-dropdown";
import { ResultsRecalculateButton } from "@/features/results/components/results-recalculate-button";
import { ResultsRecalculateModal } from "@/features/results/components/results-recalculate-modal";
import { useRecalculationPoller } from "@/features/results/hooks/use-recalculation-poller";
import { useResultsStore } from "@/features/results/store/results-store";
import { useLayoutStore } from "@/stores/layout-store";

/**
 * Defines the props for the ResultsHeader component.
 */
interface ResultsHeaderProps {
  /**
   * The full case data object, including the recalculation status.
   */
  caseData: typeof cases.$inferSelect;
  /**
   * A callback function to trigger the opening of the edit sheet.
   */
  onEditClick?: () => void;
}

/**
 * A client component responsible for managing the header content for the results page.
 */
export const ResultsHeader = ({ caseData, onEditClick }: ResultsHeaderProps) => {
  const params = useParams();
  const router = useRouter();
  const caseId = typeof params.resultsId === "string" ? params.resultsId : null;
  const queryClient = useQueryClient();

  const [isRecalculateModalOpen, setIsRecalculateModalOpen] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const setHeaderAdditionalContent = useLayoutStore((state) => state.setHeaderAdditionalContent);
  const clearHeaderAdditionalContent = useLayoutStore(
    (state) => state.clearHeaderAdditionalContent
  );

  const { clearRecalculationFlag } = useResultsStore();
  const pendingRecalculations = useResultsStore((state) => state.pendingRecalculations);
  const hasPendingChanges = caseId ? pendingRecalculations.has(caseId) : false;

  // Determine if recalculation should be enabled
  const shouldEnableRecalculation =
    !isPolling && (caseData.recalculationNeeded || hasPendingChanges);

  useRecalculationPoller({
    caseId,
    enabled: isPolling,
    onSuccess: () => {
      setIsPolling(false);
      setIsRecalculateModalOpen(false);
      toast.success(`${caseData.caseName} recalculation completed!`);

      // Clear any pending recalculation flags in the store
      if (caseId) {
        clearRecalculationFlag(caseId);
      }

      // Intelligent query invalidation with retry logic
      const invalidateWithRetry = async (attempt = 1, maxAttempts = 3) => {
        // Invalidate queries
        await queryClient.invalidateQueries({ queryKey: ["case", caseId] });
        await queryClient.invalidateQueries({ queryKey: ["recalculationStatus", caseId] });
        await queryClient.invalidateQueries({ queryKey: ["cases"] });
        await queryClient.invalidateQueries({ queryKey: ["caseHistory", caseId] });

        // Check if the database flag has been cleared
        setTimeout(async () => {
          const freshData = queryClient.getQueryData(["case", caseId]) as typeof cases.$inferSelect;

          if (freshData?.recalculationNeeded && attempt < maxAttempts) {
            invalidateWithRetry(attempt + 1, maxAttempts);
          }
        }, 500);
      };

      // Start the intelligent invalidation after a short delay
      setTimeout(() => invalidateWithRetry(), 800);

      // Still do the delayed page refresh for complete data consistency
      setTimeout(() => {
        router.refresh();
      }, 4000);
    },
  });

  useEffect(() => {
    if (caseId) {
      setHeaderAdditionalContent(
        <div className="flex items-center gap-1 sm:gap-2">
          <EditCaseButton onClick={onEditClick} />
          <ResultsRecalculateButton
            caseId={caseId}
            isDisabled={!shouldEnableRecalculation || isPolling}
            onClick={() => setIsRecalculateModalOpen(true)}
          />
          <ExportDropdown caseId={caseId} />
        </div>
      );
    }

    // Cleanup function to remove the content when the component unmounts.
    return () => {
      clearHeaderAdditionalContent();
    };
  }, [
    caseId,
    shouldEnableRecalculation,
    isPolling,
    setHeaderAdditionalContent,
    clearHeaderAdditionalContent,
    pendingRecalculations,
    onEditClick,
  ]);

  // Return a fragment containing the modal to render the results recalculate modal.
  return (
    <>
      <ResultsRecalculateModal
        caseId={caseId}
        isOpen={isRecalculateModalOpen}
        onOpenChange={setIsRecalculateModalOpen}
        onRecalculationStart={() => {
          setIsPolling(true);
          // Clear the local pending flag immediately when recalculation starts
          if (caseId) {
            clearRecalculationFlag(caseId);
          }
        }}
        isRecalculating={isPolling}
      />
    </>
  );
};

ResultsHeader.displayName = "ResultsHeader";
