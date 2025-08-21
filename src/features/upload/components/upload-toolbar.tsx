import { memo } from "react";
import { HiOutlineSearch } from "react-icons/hi";
import { IoGridOutline, IoListOutline } from "react-icons/io5";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { type ViewMode } from "@/features/analyze/store/analyze-store";
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
 * Defines the props for the upload toolbar component.
 */
type UploadToolbarProps = {
  /** The current value of the search input. */
  searchTerm: string;
  /** A callback function to update the search term in the parent component's state. */
  onSearchTermChange: (term: string) => void;
  /** The display label for the currently selected sort option. */
  currentSortLabel: string;
  /** The currently selected sort option value. */
  sortOption: SortOptionValue;
  /** A callback function to update the sort option in the parent component's state. */
  onSortOptionChange: (value: SortOptionValue) => void;
  /** The current view mode ('list' or 'grid'). */
  viewMode: ViewMode;
  /** A callback function to update the view mode in the parent component's state. */
  onViewModeChange: (value: ViewMode) => void;
};

/**
 * Renders the toolbar for the upload preview, including search, sort, and view mode controls.
 * This component is memoized to prevent re-renders when its props are unchanged.
 */
export const UploadToolbar = memo(
  ({
    searchTerm,
    onSearchTermChange,
    currentSortLabel,
    sortOption,
    onSortOptionChange,
    viewMode,
    onViewModeChange,
  }: UploadToolbarProps) => {
    return (
      // The main container for the toolbar.
      <div className="mb-4 flex items-center justify-between gap-2">
        {/* Search Input Section */}
        <div className="relative w-full max-w-sm">
          <HiOutlineSearch className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            maxLength={50}
            className="font-inter h-10 border-none pl-10 text-sm shadow-none placeholder:!text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>

        {/* Action Controls Section (Sort and View Mode) */}
        <div className="flex items-center gap-2">
          {/* Sort Options Dropdown */}
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
            <DropdownMenuContent align="end" className="w-64 border-2 border-slate-200">
              {SORT_OPTIONS.map((option, index) => {
                const isActive = option.value === sortOption;
                const prevOption = SORT_OPTIONS[index - 1];
                const isPrevActive = prevOption?.value === sortOption;

                return (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() => onSortOptionChange(option.value as SortOptionValue)}
                    className={cn(
                      "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 hover:[&_svg]:!text-emerald-600",
                      index > 0 && "mt-0.5",
                      isActive &&
                        "border-emerald-200 bg-emerald-50 text-emerald-700 [&_svg]:text-emerald-600",
                      isActive && index > 0 && !isPrevActive && "mt-1",
                      !isActive && isPrevActive && "mt-1"
                    )}
                  >
                    <SortIcon value={option.value as SortOptionValue} />
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
      </div>
    );
  }
);

UploadToolbar.displayName = "UploadToolbar";
