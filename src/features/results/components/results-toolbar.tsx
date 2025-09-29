import { motion } from "framer-motion";
import React, { memo, useMemo } from "react";
import { HiOutlineSearch } from "react-icons/hi";
import { IoGridOutline, IoListOutline } from "react-icons/io5";
import {
  LuArrowDownAZ,
  LuArrowUpDown,
  LuArrowUpZA,
  LuCalendarClock,
  LuCalendarDays,
} from "react-icons/lu";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type ViewMode } from "@/features/results/store/results-store";
import { SORT_OPTIONS, type SortOptionValue } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * A sub-component that renders the appropriate icon for a given sort option value.
 * This keeps the rendering logic separate and clean.
 */
const SortIcon = ({ value }: { value: SortOptionValue }) => {
  const commonProps = { className: "h-4 w-4 text-slate-600" };
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
 * Defines the props for the results toolbar component.
 */
interface ResultsToolbarProps {
  /** The current value of the search input. */
  searchTerm: string;
  /** A callback function to update the search term in the parent component's state. */
  onSearchTermChange: (value: string) => void;
  /** The currently selected sort option value. */
  sortOption: SortOptionValue;
  /** A callback function to update the sort option in the parent component's state. */
  onSortOptionChange: (value: SortOptionValue) => void;
  /** The current view mode ('list' or 'grid'). */
  viewMode: ViewMode;
  /** A callback function to update the view mode in the parent component's state. */
  onViewModeChange: (value: ViewMode) => void;
}

/**
 * A memoized component that renders the toolbar for searching, sorting, and changing the view mode of the results list.
 */
export const ResultsToolbar = memo(
  ({
    searchTerm,
    onSearchTermChange,
    sortOption,
    onSortOptionChange,
    viewMode,
    onViewModeChange,
  }: ResultsToolbarProps) => {
    /**
     * Memoizes a filtered list of sort options, excluding those that are not relevant for this context (e.g., size).
     * This is a performance optimization that prevents re-filtering on every render.
     */
    const relevantSortOptions = useMemo(() => {
      const irrelevantValues = ["size-asc", "size-desc"];
      return SORT_OPTIONS.filter((option) => !irrelevantValues.includes(option.value));
    }, []);

    /**
     * Memoizes the display label for the currently active sort option.
     * This avoids re-finding the label on every render, only re-calculating when the sort option changes.
     */
    const currentSortLabel = useMemo(() => {
      return SORT_OPTIONS.find((option) => option.value === sortOption)?.label ?? "Sort by";
    }, [sortOption]);

    return (
      // The main animated container for the toolbar.
      <motion.div
        layout
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="mb-4 flex items-center justify-between gap-2"
      >
        {/* Search Input Section */}
        <div className="relative w-full max-w-sm">
          <HiOutlineSearch className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search cases..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            maxLength={50}
            className="font-inter h-10 border-none pl-10 text-sm shadow-none placeholder:!text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {/* Action Controls Section (Sort and View Mode) */}
        <div className="flex items-center gap-2" suppressHydrationWarning>
          {/* Sort Options Dropdown */}
          <DropdownMenu key="sort-dropdown">
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
            <DropdownMenuContent className="w-64 border-2 border-slate-200" align="end">
              {relevantSortOptions.map((option: (typeof SORT_OPTIONS)[number], index) => {
                const isActive = option.value === sortOption;
                const prevOption = relevantSortOptions[index - 1];
                const isPrevActive = prevOption?.value === sortOption;

                return (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => onSortOptionChange(option.value)}
                    className={cn(
                      "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 hover:[&_svg]:!text-emerald-600",
                      index > 0 && "mt-0.5",
                      isActive &&
                        "border-emerald-200 bg-emerald-50 text-emerald-700 [&_svg]:text-emerald-600",
                      isActive && index > 0 && !isPrevActive && "mt-1",
                      isActive && index > 0 && !isPrevActive && "mt-1",
                      !isActive && isPrevActive && "mt-1",
                      "flex items-center gap-2"
                    )}
                  >
                    <SortIcon value={option.value} />
                    {option.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Mode Toggle Group */}
          <ToggleGroup
            type="single"
            variant="outline"
            value={viewMode}
            onValueChange={(value) => {
              if (value) onViewModeChange(value as ViewMode);
            }}
            aria-label="View mode"
            className="border-2 border-slate-200 bg-white data-[variant=outline]:shadow-none"
          >
            <Tooltip key="list-view-tooltip">
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
            <Tooltip key="grid-view-tooltip">
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
    );
  }
);

ResultsToolbar.displayName = "ResultsToolbar";
