"use client";

import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { FaFolder } from "react-icons/fa6";
import { GoPencil } from "react-icons/go";
import { HiOutlineSearch } from "react-icons/hi";
import { IoGridOutline, IoListOutline } from "react-icons/io5";
import {
  LuArrowDownAZ,
  LuArrowUpDown,
  LuArrowUpZA,
  LuCalendarClock,
  LuCalendarDays,
  LuEllipsisVertical,
  LuTrash2,
} from "react-icons/lu";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type getCases } from "@/features/results/actions/get-cases";
import { renameCase } from "@/features/results/actions/rename-case";
import { DeleteCaseModal } from "@/features/results/components/delete-case-modal";
import { useResultsStore, type ViewMode } from "@/features/results/store/results-store";
import { SORT_OPTIONS, type SortOptionValue } from "@/lib/constants";
import { cn, formatDate } from "@/lib/utils";

/**
 * Defines the shape of a single case based on the server action's return type.
 */
type Case = Awaited<ReturnType<typeof getCases>>[number];

/**
 * A small component to render an icon for each sort option.
 * @param {object} props The component props.
 * @param {SortOptionValue} props.value The current sort option value.
 * @returns A React icon component or null.
 */
const SortIcon = ({ value }: { value: SortOptionValue }) => {
  const commonProps = { className: "mr-2 h-4 w-4 text-slate-600" };
  switch (value) {
    case "date-uploaded-desc":
    case "date-uploaded-asc":
      return <LuCalendarClock {...commonProps} />;
    case "date-modified-desc":
    case "date-modified-asc":
      return <LuCalendarDays {...commonProps} />;
    case "name-asc":
      return <LuArrowDownAZ {...commonProps} />;
    case "name-desc":
      return <LuArrowUpZA {...commonProps} />;
    default:
      return null;
  }
};

/**
 * Renders an interactive preview of cases.
 * It handles client-side filtering, sorting, and view mode switching.
 *
 * @param {object} props The component props.
 * @param {Case[]} props.initialCases The initial list of cases passed from the server.
 */
export const ResultsPreview = ({ initialCases }: { initialCases: Case[] }) => {
  // Retrieves state and actions from the global Zustand store.
  const viewMode = useResultsStore((state) => state.viewMode);
  const sortOption = useResultsStore((state) => state.sortOption);
  const searchTerm = useResultsStore((state) => state.searchTerm);
  const renamingCaseId = useResultsStore((state) => state.renamingCaseId);
  const setViewMode = useResultsStore((state) => state.setViewMode);
  const setSortOption = useResultsStore((state) => state.setSortOption);
  const setSearchTerm = useResultsStore((state) => state.setSearchTerm);
  const setRenamingCaseId = useResultsStore((state) => state.setRenamingCaseId);

  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Local state for the cases list, enabling optimistic updates.
  const [cases, setCases] = useState<Case[]>(initialCases);
  // Local state for the temporary new name during editing
  const [tempCaseName, setTempCaseName] = useState("");

  // State to manage the delete confirmation modal.
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    caseId: string | null;
    caseName: string | null;
  }>({
    isOpen: false,
    caseId: null,
    caseName: null,
  });

  // TanStack Mutation for renaming a case with optimistic updates.
  const { mutate: executeRename, isPending: isRenaming } = useMutation({
    mutationFn: renameCase,
    // When mutate is called, we update the UI instantly.
    onMutate: async ({ caseId, newName }) => {
      // Exit rename mode immediately for a seamless UX.
      setRenamingCaseId(null);
      // Snapshot the previous state of cases.
      const previousCases = cases;
      // Optimistically update the local cases state.
      setCases((currentCases) =>
        currentCases.map((caseItem) =>
          caseItem.id === caseId ? { ...caseItem, caseName: newName } : caseItem
        )
      );
      // Return a context object with the snapshotted value.
      return { previousCases };
    },
    // This runs after the mutation is finished, on either success or error.
    onSettled: (data, error, variables, context) => {
      // If there was any kind of error, revert the optimistic update.
      if (error || data?.error) {
        if (context?.previousCases) {
          setCases(context.previousCases);
        }
        toast.error(data?.error || "Failed to rename. Please try again.");
      } else if (data?.success) {
        // On success, the interface is already correct. Show the toast.
        toast.success(data.success);
      }
    },
  });

  /**
   * Automatically focuses and selects the text in the input when rename mode is activated.
   */
  useEffect(() => {
    if (renamingCaseId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingCaseId]);

  /**
   * Starts the rename process for a given case.
   * @param {React.MouseEvent | Event} e The event that triggered the action.
   * @param {string} caseId The ID of the case to rename.
   * @param {string} currentName The current name of the case.
   */
  const handleStartRename = (e: React.MouseEvent | Event, caseId: string, currentName: string) => {
    e.stopPropagation();
    setRenamingCaseId(caseId);
    setTempCaseName(currentName);
  };

  /**
   * Confirms and submits the new case name.
   */
  const handleConfirmRename = () => {
    if (isRenaming || !renamingCaseId) return;

    // Find the original case from our local state to check if the name has changed.
    const originalCase = cases.find((c) => c.id === renamingCaseId);
    if (!tempCaseName.trim() || !originalCase || tempCaseName === originalCase.caseName) {
      setRenamingCaseId(null);
      return;
    }

    executeRename({ caseId: renamingCaseId, newName: tempCaseName.trim() });
  };

  /**
   * Handles key presses within the rename input field.
   * @param {React.KeyboardEvent<HTMLInputElement>} e The keyboard event.
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
   * Memoizes the list of relevant sort options for this context, excluding irrelevant ones.
   * This prevents re-filtering on every render.
   */
  const relevantSortOptions = useMemo(() => {
    const irrelevantValues = ["size-asc", "size-desc"];
    return SORT_OPTIONS.filter((option) => !irrelevantValues.includes(option.value));
  }, []);

  /**
   * Memoizes the display label for the currently selected sort option.
   * This avoids finding the label on every render.
   */
  const currentSortLabel = useMemo(() => {
    const currentOption = SORT_OPTIONS.find((option) => option.value === sortOption);
    return currentOption?.label ?? "Sort by";
  }, [sortOption]);

  /**
   * Memoizes the list of cases filtered by the current search term.
   * This is a performance optimization that prevents re-filtering unless the data or search term changes.
   */
  const filteredCases = useMemo(() => {
    if (!searchTerm) return cases;
    return cases.filter((c) => c.caseName.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [cases, searchTerm]);

  /**
   * Memoizes the final list of cases after sorting is applied to the filtered list.
   * This is a performance optimization that prevents re-sorting unless the filtered data or sort option changes.
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

  // Renders an initial empty state when no cases exist and there's no active search.
  if (cases.length === 0 && !searchTerm) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <FaFolder className="h-16 w-16 text-slate-300" />
        <h3 className="font-inter mt-4 text-lg font-medium text-slate-800">No Results Found</h3>
        <p className="font-inter mt-1 text-sm text-slate-500">
          You have not created any cases yet.
        </p>
      </div>
    );
  }

  /**
   * Opens the delete confirmation modal with the details of the selected case.
   * @param {string} caseId The ID of the case to delete.
   * @param {string} caseName The name of the case to delete.
   */
  const openDeleteModal = (caseId: string, caseName: string) => {
    setDeleteModal({ isOpen: true, caseId, caseName });
  };

  // The main component wrapper. Note the flex classes which are now effective.
  return (
    <TooltipProvider>
      {/* Render the delete confirmation modal */}
      <DeleteCaseModal
        isOpen={deleteModal.isOpen}
        onOpenChange={(isOpen) => setDeleteModal({ ...deleteModal, isOpen })}
        caseId={deleteModal.caseId}
        caseName={deleteModal.caseName}
      />

      <div className="flex w-full flex-1 flex-col">
        {/* The main controls bar for searching, sorting, and changing view mode. */}
        <motion.div
          layout
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="mb-4 flex items-center justify-between gap-2"
        >
          {/* Search input field. */}
          <div className="relative w-full max-w-sm">
            <HiOutlineSearch className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Search cases..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              maxLength={50}
              className="font-inter h-10 border-none pl-10 text-sm shadow-none placeholder:!text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {/* Container for the sort and view mode controls. */}
          <div className="flex items-center gap-2">
            {/* Dropdown for selecting the sort order. */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  aria-label="Sort options"
                  className="flex h-10 shrink-0 cursor-pointer items-center justify-center border-2 border-slate-200 bg-white px-2 shadow-none hover:bg-slate-50 focus-visible:ring-0 focus-visible:ring-offset-0 sm:gap-2 sm:px-3"
                >
                  <span className="font-inter hidden text-sm font-normal text-slate-800 sm:inline">
                    {currentSortLabel}
                  </span>
                  <LuArrowUpDown className="h-4 w-4 shrink-0 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64" align="end">
                {relevantSortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => setSortOption(option.value as SortOptionValue)}
                    className={cn(
                      "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 hover:[&_svg]:!text-emerald-600"
                    )}
                  >
                    <SortIcon value={option.value as SortOptionValue} />
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Toggle group for switching between list and grid views. */}
            <ToggleGroup
              type="single"
              variant="outline"
              value={viewMode}
              onValueChange={(value) => {
                if (value) setViewMode(value as ViewMode);
              }}
              aria-label="View mode"
              className="border-2 border-slate-200 bg-white data-[variant=outline]:shadow-none"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value="list"
                    aria-label="List view"
                    className="cursor-pointer border-none data-[state=off]:hover:bg-slate-50 data-[state=on]:!bg-emerald-200 data-[state=on]:!text-emerald-600"
                  >
                    <IoListOutline className="h-5 w-5" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-inter">List view</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <ToggleGroupItem
                    value="grid"
                    aria-label="Grid view"
                    className="cursor-pointer border-none data-[state=off]:hover:bg-slate-50 data-[state=on]:!bg-emerald-200 data-[state=on]:!text-emerald-600"
                  >
                    <IoGridOutline className="h-5 w-5" />
                  </ToggleGroupItem>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-inter">Grid view</p>
                </TooltipContent>
              </Tooltip>
            </ToggleGroup>
          </div>
        </motion.div>

        {/* This div now acts as a flex container, allowing its children to use flex-1 to grow. */}
        <div className="flex flex-1 flex-col">
          <AnimatePresence mode="wait">
            {/* Renders the list of cases if there are any results to display. */}
            {sortedCases.length > 0 && (
              <motion.div
                key={viewMode}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className={cn(
                  "grid gap-3 sm:gap-4",
                  viewMode === "list"
                    ? "grid-cols-1 md:grid-cols-2"
                    : "grid-cols-2 sm:grid-cols-4 lg:grid-cols-5"
                )}
              >
                <AnimatePresence>
                  {sortedCases.map((caseItem) => (
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
                      {/* The main interactive element for a case. */}
                      <div
                        onDoubleClick={() => {
                          if (renamingCaseId !== caseItem.id) {
                            router.push(`/results/${caseItem.id}`);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-label={`${caseItem.caseName}. Double-click to open, or use the menu for more actions.`}
                        className={cn(
                          "flex h-full w-full cursor-pointer items-center border-2 border-slate-200 bg-slate-50 transition-colors duration-300 ease-in-out hover:border-amber-300 hover:bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2",
                          {
                            "justify-between rounded-xl p-2 lg:p-3": viewMode === "list",
                            "aspect-square flex-col justify-center gap-2 rounded-2xl px-3 py-2 text-center sm:gap-4 sm:p-4 md:rounded-3xl":
                              viewMode === "grid",
                          }
                        )}
                      >
                        {viewMode === "list" ? (
                          <>
                            {/* List View for Main content */}
                            <div className="flex min-w-0 flex-grow items-center gap-3">
                              <div
                                className={cn(
                                  "flex flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 transition-all duration-300 group-hover:bg-amber-100",
                                  "h-9 w-9 lg:h-12 lg:w-12"
                                )}
                              >
                                <FaFolder
                                  className={cn(
                                    "text-emerald-600 transition-colors duration-300 group-hover:text-amber-500",
                                    "h-4 w-4 lg:h-6 lg:w-6"
                                  )}
                                />
                              </div>
                              <div className="min-w-0 flex-1">
                                {renamingCaseId === caseItem.id ? (
                                  <Input
                                    ref={inputRef}
                                    value={tempCaseName}
                                    onChange={(e) => setTempCaseName(e.target.value)}
                                    onBlur={handleConfirmRename}
                                    onKeyDown={handleRenameKeyDown}
                                    disabled={isRenaming}
                                    maxLength={256}
                                    className="font-plus-jakarta-sans h-auto truncate border-none bg-transparent p-0 pb-0.5 text-sm font-medium text-slate-800 shadow-none ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 lg:text-base"
                                  />
                                ) : (
                                  <p className="font-plus-jakarta-sans truncate pb-0.5 text-sm font-medium text-slate-800 lg:text-base">
                                    {caseItem.caseName}
                                  </p>
                                )}
                                <p className="truncate text-xs text-slate-500 lg:text-sm">
                                  {formatDate(caseItem.caseDate)}
                                </p>
                              </div>
                            </div>

                            {/* Action Icons for larger screens */}
                            <div className="hidden flex-shrink-0 items-center gap-1 lg:flex">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`View ${caseItem.caseName}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/results/${caseItem.id}`);
                                    }}
                                    className="h-8 w-8 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-amber-100 hover:text-amber-600"
                                  >
                                    <MdOutlineRemoveRedEye className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-inter">View</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Rename ${caseItem.caseName}`}
                                    onClick={(e) =>
                                      handleStartRename(e, caseItem.id, caseItem.caseName)
                                    }
                                    className="h-8 w-8 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-sky-100 hover:text-sky-600"
                                  >
                                    <GoPencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-inter">Rename</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Delete ${caseItem.caseName}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDeleteModal(caseItem.id, caseItem.caseName);
                                    }}
                                    className="h-8 w-8 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-rose-100 hover:text-rose-600"
                                  >
                                    <LuTrash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-inter">Delete</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>

                            {/* Ellipsis Dropdown for smaller screens */}
                            <div className="lg:hidden">
                              <DropdownMenu
                                onOpenChange={(open) => {
                                  // If menu is closed while renaming, cancel rename
                                  if (!open && renamingCaseId === caseItem.id) {
                                    handleConfirmRename();
                                  }
                                }}
                              >
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Options for ${caseItem.caseName}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-8 w-8 cursor-pointer rounded-full text-slate-500 transition-colors hover:bg-transparent hover:text-slate-700 focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:ring-offset-0"
                                  >
                                    <LuEllipsisVertical className="h-5 w-5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  onCloseAutoFocus={(e) => e.preventDefault()}
                                  className="w-40"
                                >
                                  <DropdownMenuItem
                                    onSelect={() => router.push(`/results/${caseItem.id}`)}
                                    className={cn(
                                      "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 hover:[&_svg]:!text-emerald-600"
                                    )}
                                  >
                                    <MdOutlineRemoveRedEye className="mr-2 h-4 w-4" />
                                    <span>Open</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={(e) => {
                                      e.stopPropagation();
                                      setTimeout(
                                        () => handleStartRename(e, caseItem.id, caseItem.caseName),
                                        0
                                      );
                                    }}
                                    className={cn(
                                      "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-sky-200 hover:!text-sky-600 focus:bg-sky-100 hover:[&_svg]:!text-sky-600"
                                    )}
                                  >
                                    <GoPencil className="mr-2 h-4 w-4" />
                                    <span>Rename</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() => openDeleteModal(caseItem.id, caseItem.caseName)}
                                    className={cn(
                                      "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-rose-200 hover:!text-rose-600 focus:bg-red-100 hover:[&_svg]:!text-rose-600"
                                    )}
                                  >
                                    <LuTrash2 className="mr-2 h-4 w-4" />
                                    <span>Delete</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Dropdown menu for Grid View */}
                            <DropdownMenu
                              onOpenChange={(open) => {
                                // If menu is closed while renaming, cancel rename
                                if (!open && renamingCaseId === caseItem.id) {
                                  handleConfirmRename();
                                }
                              }}
                            >
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Options for ${caseItem.caseName}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute top-2 right-2 z-10 h-9 w-9 cursor-pointer rounded-full text-slate-800 transition-colors hover:bg-transparent hover:text-slate-700 focus-visible:ring-1 focus-visible:ring-slate-400 focus-visible:ring-offset-0"
                                >
                                  <LuEllipsisVertical className="h-6 w-6" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent
                                align="end"
                                onCloseAutoFocus={(e) => e.preventDefault()}
                                className="w-40"
                              >
                                <DropdownMenuItem
                                  onSelect={() => router.push(`/results/${caseItem.id}`)}
                                  className={cn(
                                    "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 hover:[&_svg]:!text-emerald-600"
                                  )}
                                >
                                  <MdOutlineRemoveRedEye className="mr-2 h-4 w-4" />
                                  <span>Open</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.stopPropagation();
                                    setTimeout(
                                      () => handleStartRename(e, caseItem.id, caseItem.caseName),
                                      0
                                    );
                                  }}
                                  className={cn(
                                    "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-sky-200 hover:!text-sky-600 focus:bg-sky-100 hover:[&_svg]:!text-sky-600"
                                  )}
                                >
                                  <GoPencil className="mr-2 h-4 w-4" />
                                  <span>Rename</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => openDeleteModal(caseItem.id, caseItem.caseName)}
                                  className={cn(
                                    "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-rose-200 hover:!text-rose-600 focus:bg-red-100 hover:[&_svg]:!text-rose-600"
                                  )}
                                >
                                  <LuTrash2 className="mr-2 h-4 w-4" />
                                  <span>Delete</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Grid View for main content */}
                            <div
                              className={cn(
                                "flex items-center justify-center rounded-full bg-emerald-100 transition-all duration-300 group-hover:bg-amber-100",
                                "h-12 w-12 sm:h-16 sm:w-16 md:h-16 md:w-16 lg:h-20 lg:w-20"
                              )}
                            >
                              <FaFolder
                                className={cn(
                                  "text-emerald-600 transition-colors duration-300 group-hover:text-amber-500",
                                  "h-6 w-6 sm:h-8 sm:w-8 md:h-8 md:w-8 lg:h-10 lg:w-10"
                                )}
                              />
                            </div>
                            <div className="flex w-full flex-col items-center justify-end">
                              {renamingCaseId === caseItem.id ? (
                                <Input
                                  ref={inputRef}
                                  value={tempCaseName}
                                  onChange={(e) => setTempCaseName(e.target.value)}
                                  onBlur={handleConfirmRename}
                                  onKeyDown={handleRenameKeyDown}
                                  disabled={isRenaming}
                                  maxLength={256}
                                  className="font-plus-jakarta-sans h-auto w-full truncate border-none bg-transparent p-0 px-2 text-center text-sm font-medium text-slate-800 shadow-none ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 lg:text-base"
                                />
                              ) : (
                                <p className="font-plus-jakarta-sans w-full truncate px-2 text-sm font-medium text-slate-800 lg:text-base">
                                  {caseItem.caseName}
                                </p>
                              )}
                              <p className="truncate text-xs text-slate-500">
                                {formatDate(caseItem.caseDate)}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Renders a message when the search term yields no results. */}
            {sortedCases.length === 0 && searchTerm && (
              <motion.div
                key="no-results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="flex flex-1 flex-col items-center justify-center text-center"
              >
                <HiOutlineSearch className="h-16 w-16 text-slate-300" />
                <h3 className="font-plus-jakarta-sans mt-4 text-xl font-semibold text-slate-800">
                  No Cases Found
                </h3>
                <p className="font-inter mt-1 max-w-sm text-sm break-all text-slate-500">
                  Your search term did not match any cases.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
};
