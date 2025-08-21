import { motion } from "framer-motion";
import React, { memo, useMemo } from "react";
import { HiOutlineSearch } from "react-icons/hi";
import {
  LuArrowDownAZ,
  LuArrowUpDown,
  LuArrowUpZA,
  LuCalendarClock,
  LuCalendarDays,
  LuScaling,
} from "react-icons/lu";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SORT_OPTIONS, type SortOptionValue } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * A sub-component that renders the appropriate icon for a given sort option value.
 * This keeps the rendering logic separate and clean.
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
    case "size-asc":
    case "size-desc":
      return <LuScaling {...commonProps} />;
    default:
      return null;
  }
};

/**
 * Defines the props for the ImageToolbar component.
 */
interface ImageToolbarProps {
  /** The current value of the search input. */
  searchTerm: string;
  /** A callback function to update the search term in the parent component's state. */
  onSearchTermChange: (value: string) => void;
  /** The currently selected sort option value. */
  sortOption: SortOptionValue;
  /** A callback function to update the sort option in the parent component's state. */
  onSortOptionChange: (value: SortOptionValue) => void;
  /** A boolean to disable the sorting functionality. */
  isSortDisabled: boolean;
}

/**
 * A memoized component that renders the toolbar for searching and sorting the list of analyzed images.
 * Its entrance is animated with Framer Motion.
 */
export const ImageToolbar = memo(
  ({
    searchTerm,
    onSearchTermChange,
    sortOption,
    onSortOptionChange,
    isSortDisabled,
  }: ImageToolbarProps) => {
    /**
     * Memoizes the display label for the currently active sort option.
     * This avoids re-finding the label on every render, only re-calculating when the sort option changes.
     */
    const currentSortLabel = useMemo(
      () => SORT_OPTIONS.find((o) => o.value === sortOption)?.label ?? "Sort by",
      [sortOption]
    );

    return (
      // The main animated container for the toolbar.
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="mb-4 flex items-center justify-between gap-2"
      >
        {/* Search Input Section */}
        <div className="relative w-full max-w-sm">
          <HiOutlineSearch className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search images..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            maxLength={50}
            className="font-inter h-10 border-none pl-10 text-sm shadow-none placeholder:!text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
        {/* Action Controls Section (Sort) */}
        <div className="flex items-center gap-2">
          {/* A wrapper div to apply the 'cursor-not-allowed' style to the entire dropdown when disabled. */}
          <div className={cn({ "cursor-not-allowed": isSortDisabled })}>
            <DropdownMenu key="image-sort-dropdown">
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  aria-label="Sort options"
                  className="flex h-10 shrink-0 cursor-pointer items-center justify-center border-2 border-slate-200 bg-white px-2 shadow-none hover:bg-slate-50 focus-visible:ring-0 focus-visible:ring-offset-0 sm:gap-2 sm:px-3"
                  disabled={isSortDisabled}
                >
                  <span className="font-inter hidden text-sm font-normal text-slate-800 sm:inline">
                    {currentSortLabel}
                  </span>
                  <LuArrowUpDown className="h-4 w-4 shrink-0 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 border-2 border-slate-200">
                {/* Maps over the global sort options to render each menu item. */}
                {SORT_OPTIONS.map((option, index) => {
                  const isActive = option.value === sortOption;
                  const prevOption = SORT_OPTIONS[index - 1];
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
                        !isActive && isPrevActive && "mt-1"
                      )}
                    >
                      <SortIcon value={option.value} />
                      {option.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.div>
    );
  }
);

ImageToolbar.displayName = "ImageToolbar";
