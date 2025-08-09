"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { TooltipProvider } from "@/components/ui/tooltip";
import { type getCases } from "@/features/results/actions/get-cases";
import { renameCase } from "@/features/results/actions/rename-case";
import { CaseList } from "@/features/results/components/case-list";
import { DeleteCaseModal } from "@/features/results/components/delete-case-modal";
import { ResultsEmptyState } from "@/features/results/components/results-empty-state";
import { ResultsNoSearchResults } from "@/features/results/components/results-no-search-results";
import { ResultsToolbar } from "@/features/results/components/results-toolbar";
import { useCases } from "@/features/results/hooks/use-cases";
import { useResultsStore } from "@/features/results/store/results-store";
import { type SortOptionValue } from "@/lib/constants";

/**
 * Defines the TypeScript type for a single case, inferred from the `getCases` server action's return type.
 * This ensures the client-side type is always in sync with the server-side data structure.
 */
export type Case = Awaited<ReturnType<typeof getCases>>[number];

/**
 * A smart container component that renders an interactive preview of all analysis cases.
 * It orchestrates data fetching, client-side filtering/sorting, inline renaming, deletion,
 * and view mode switching by composing smaller, specialized components and hooks.
 */
export const ResultsPreview = () => {
  const { data: cases = [] } = useCases();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Retrieves interface state and state setters from the global `useResultsStore`.
  const {
    viewMode,
    sortOption,
    searchTerm,
    renamingCaseId,
    setViewMode,
    setSortOption,
    setSearchTerm,
    setRenamingCaseId,
  } = useResultsStore();

  // A ref to the input element used for renaming, allowing for programmatic focus.
  const inputRef = useRef<HTMLInputElement>(null);

  // Local state for the temporary new name during the inline editing process.
  const [tempCaseName, setTempCaseName] = useState("");
  // Local state to control the visibility and data of the delete confirmation modal.
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    caseId: null as string | null,
    caseName: null as string | null,
  });

  /**
   * Initializes a mutation with Tanstack Query for handling server-side case renaming.
   * It uses optimistic updates to provide a responsive UI.
   */
  const { mutate: executeRename, isPending: isRenaming } = useMutation({
    mutationFn: renameCase,
    /**
     * Called before the mutation function. This is where optimistic updates happen.
     */
    onMutate: async ({ caseId, newName }) => {
      // Cancel any outgoing refetches to prevent them from overwriting the optimistic update.
      await queryClient.cancelQueries({ queryKey: ["cases"] });
      // Exit the renaming UI state immediately for a snappy user experience.
      setRenamingCaseId(null);

      // Snapshot the previous state of the cache.
      const previousCases = queryClient.getQueryData<Case[]>(["cases"]);
      // Optimistically update the cache to the new value.
      queryClient.setQueryData<Case[]>(["cases"], (oldCases = []) =>
        oldCases.map((c) => (c.id === caseId ? { ...c, caseName: newName } : c))
      );
      // Return the snapshot to be used for rollback on error.
      return { previousCases };
    },
    /**
     * If the mutation fails, this function is called to roll back the optimistic update.
     */
    onError: (_err, _variables, context) => {
      if (context?.previousCases) queryClient.setQueryData(["cases"], context.previousCases);
      toast.error("Failed to rename. Please try again.");
    },
    /**
     * Called after the mutation is either successful or fails.
     */
    onSettled: (data, error) => {
      if (data?.error && !error) toast.error(data.error);
      else if (data?.success) toast.success(data.success);
      // Always invalidate the query to refetch the latest data from the server.
      queryClient.invalidateQueries({ queryKey: ["cases"] });
    },
  });

  /**
   * Automatically focuses and selects the text in the rename input field
   * whenever a user initiates the rename action.
   */
  useEffect(() => {
    if (renamingCaseId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingCaseId]);

  /**
   * Initiates the inline renaming process for a specific case item.
   */
  const handleStartRename = (e: React.MouseEvent | Event, caseId: string, currentName: string) => {
    e.stopPropagation();
    setRenamingCaseId(caseId);
    setTempCaseName(currentName);
  };

  /**
   * Confirms a rename action, typically triggered on blur or Enter key press.
   * It performs validation before executing the server-side mutation.
   */
  const handleConfirmRename = () => {
    if (isRenaming || !renamingCaseId) return;
    const originalCase = cases.find((c) => c.id === renamingCaseId);
    // If the name is empty or unchanged, simply exit the renaming state without a server call.
    if (!tempCaseName.trim() || !originalCase || tempCaseName === originalCase.caseName) {
      setRenamingCaseId(null);
      return;
    }
    executeRename({ caseId: renamingCaseId, newName: tempCaseName.trim() });
  };

  /**
   * Handles keyboard events for the rename input.
   */
  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirmRename();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setRenamingCaseId(null);
    }
  };

  /**
   * Memoizes the list of cases filtered by the current search term.
   */
  const filteredCases = useMemo(() => {
    if (!searchTerm) return cases;
    return cases.filter((c) => c.caseName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [cases, searchTerm]);

  /**
   * Memoizes the final sorted list of cases to be rendered.
   */
  const sortedCases = useMemo(() => {
    const sorted = [...filteredCases];
    switch (sortOption) {
      case "name-asc":
        return sorted.sort((a, b) => a.caseName.localeCompare(b.caseName));
      case "name-desc":
        return sorted.sort((a, b) => b.caseName.localeCompare(a.caseName));
      case "date-uploaded-desc":
        return sorted.sort((a, b) => b.caseDate.getTime() - a.caseDate.getTime());
      case "date-uploaded-asc":
        return sorted.sort((a, b) => a.caseDate.getTime() - b.caseDate.getTime());
      case "date-modified-asc":
        return sorted.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      case "date-modified-desc":
      default:
        return sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
  }, [filteredCases, sortOption]);

  /**
   * Opens the delete confirmation modal with the context of the selected case.
   */
  const openDeleteModal = (caseId: string, caseName: string) => {
    setDeleteModal({ isOpen: true, caseId, caseName });
  };

  // Renders an empty state component if there are no cases at all.
  if (cases.length === 0 && !searchTerm) {
    return <ResultsEmptyState />;
  }

  return (
    <TooltipProvider>
      <DeleteCaseModal
        isOpen={deleteModal.isOpen}
        onOpenChange={(isOpen) => setDeleteModal({ ...deleteModal, isOpen })}
        caseId={deleteModal.caseId}
        caseName={deleteModal.caseName}
      />
      <div className="flex w-full flex-1 flex-col">
        <ResultsToolbar
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          sortOption={sortOption}
          onSortOptionChange={(value) => setSortOption(value as SortOptionValue)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
        <div className="flex flex-1 flex-col">
          {sortedCases.length > 0 ? (
            // Renders the list of cases.
            <CaseList
              cases={sortedCases}
              viewMode={viewMode}
              inputRef={inputRef}
              renamingCaseId={renamingCaseId}
              isRenaming={isRenaming}
              tempCaseName={tempCaseName}
              onTempCaseNameChange={setTempCaseName}
              onStartRename={handleStartRename}
              onConfirmRename={handleConfirmRename}
              onRenameKeyDown={handleRenameKeyDown}
              onView={(caseId) => router.push(`/results/${caseId}`)}
              onDelete={openDeleteModal}
            />
          ) : (
            // Renders a "no results" message if filtering/searching yields no cases.
            <ResultsNoSearchResults
              title="No Cases Found"
              description="Your search term did not match any cases."
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

ResultsPreview.displayName = "ResultsPreview";
