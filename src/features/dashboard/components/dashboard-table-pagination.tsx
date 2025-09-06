"use client";

import { LuChevronLeft, LuChevronRight, LuChevronsLeft, LuChevronsRight } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the dashboard table pagination component.
 */
interface DashboardTablePaginationProps {
  /** The number of rows currently selected in the table. */
  selectedRowCount: number;
  /** The total number of rows in the table across all pages. */
  totalRows: number;
  /** The current page number. */
  currentPage: number;
  /** The total number of pages in the table. */
  totalPages: number;
  /** A boolean indicating if a previous page is available. */
  canPreviousPage: boolean;
  /** A boolean indicating if a next page is available. */
  canNextPage: boolean;
  /** A callback function to navigate to the first page. */
  onFirstPage: () => void;
  /** A callback function to navigate to the previous page. */
  onPreviousPage: () => void;
  /** A callback function to navigate to the next page. */
  onNextPage: () => void;
  /** A callback function to navigate to the last page. */
  onLastPage: () => void;
}

/**
 * A presentational component that renders the pagination controls for a data table.
 * It is fully controlled by a parent component or hook and features distinct, responsive
 * layouts for mobile and desktop views.
 */
export const DashboardTablePagination = ({
  selectedRowCount,
  totalRows,
  currentPage,
  totalPages,
  canPreviousPage,
  canNextPage,
  onFirstPage,
  onPreviousPage,
  onNextPage,
  onLastPage,
}: DashboardTablePaginationProps) => {
  return (
    <>
      {/* Mobile Layout */}
      <div className="flex flex-col gap-2 md:hidden">
        {/* The main row containing the navigation buttons and page info. */}
        <div className="flex items-center justify-between">
          {/* Group of buttons for navigating to the first and previous pages. */}
          <div className="flex items-center gap-2">
            {/* A wrapper div to correctly apply the 'cursor-not-allowed' style. */}
            <div className={!canPreviousPage ? "cursor-not-allowed" : ""}>
              <Button
                variant="ghost"
                aria-label="Go to first page"
                disabled={!canPreviousPage}
                onClick={onFirstPage}
                className={cn(
                  "size-7 rounded-md border-2 border-slate-200 bg-slate-100 p-0 text-slate-500 transition-all duration-300 ease-in-out focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0",
                  canPreviousPage
                    ? "cursor-pointer hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500"
                    : "cursor-not-allowed opacity-50"
                )}
              >
                <LuChevronsLeft className="size-3.5" />
              </Button>
            </div>
            <div className={!canPreviousPage ? "cursor-not-allowed" : ""}>
              <Button
                variant="ghost"
                aria-label="Go to previous page"
                disabled={!canPreviousPage}
                onClick={onPreviousPage}
                className={cn(
                  "size-7 rounded-md border-2 border-slate-200 bg-slate-100 p-0 text-slate-500 transition-all duration-300 ease-in-out focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0",
                  canPreviousPage
                    ? "cursor-pointer hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500"
                    : "cursor-not-allowed opacity-50"
                )}
              >
                <LuChevronLeft className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Displays the current page and total pages. */}
          <p className="font-inter text-xs text-slate-700">
            Page {currentPage} of {totalPages}
          </p>

          {/* Group of buttons for navigating to the next and last pages. */}
          <div className="flex items-center gap-2">
            <div className={!canNextPage ? "cursor-not-allowed" : ""}>
              <Button
                variant="ghost"
                aria-label="Go to next page"
                disabled={!canNextPage}
                onClick={onNextPage}
                className={cn(
                  "size-7 rounded-md border-2 border-slate-200 bg-slate-100 p-0 text-slate-500 transition-all duration-300 ease-in-out focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0",
                  canNextPage
                    ? "cursor-pointer hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500"
                    : "cursor-not-allowed opacity-50"
                )}
              >
                <LuChevronRight className="size-3.5" />
              </Button>
            </div>
            <div className={!canNextPage ? "cursor-not-allowed" : ""}>
              <Button
                variant="ghost"
                aria-label="Go to last page"
                disabled={!canNextPage}
                onClick={onLastPage}
                className={cn(
                  "size-7 rounded-md border-2 border-slate-200 bg-slate-100 p-0 text-slate-500 transition-all duration-300 ease-in-out focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0",
                  canNextPage
                    ? "cursor-pointer hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500"
                    : "cursor-not-allowed opacity-50"
                )}
              >
                <LuChevronsRight className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Displays the count of selected rows, centered on mobile. */}
        <p className="font-inter text-center text-xs text-slate-700">
          {selectedRowCount} of {totalRows} row(s) selected.
        </p>
      </div>

      {/* Desktop Layout */}
      <div className="hidden grid-cols-3 items-center gap-4 md:grid">
        {/* Left-aligned section for selected row count. */}
        <div className="text-left">
          <p className="font-inter text-sm text-slate-700">
            {selectedRowCount} of {totalRows} row(s) selected.
          </p>
        </div>

        {/* Centered section for page information. */}
        <div className="text-center">
          <p className="font-inter text-sm text-slate-700">
            Page {currentPage} of {totalPages}
          </p>
        </div>

        {/* Right-aligned section for navigation buttons. */}
        <div className="flex items-center justify-end gap-1">
          <div className={!canPreviousPage ? "cursor-not-allowed" : ""}>
            <Button
              variant="ghost"
              aria-label="Go to first page"
              disabled={!canPreviousPage}
              onClick={onFirstPage}
              className={cn(
                "size-8 rounded-md border-2 border-slate-200 bg-slate-100 p-0 text-slate-500 transition-all duration-300 ease-in-out focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9",
                canPreviousPage
                  ? "cursor-pointer hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500"
                  : "cursor-not-allowed opacity-50"
              )}
            >
              <LuChevronsLeft className="size-4 md:size-5" />
            </Button>
          </div>
          <div className={!canPreviousPage ? "cursor-not-allowed" : ""}>
            <Button
              variant="ghost"
              aria-label="Go to previous page"
              disabled={!canPreviousPage}
              onClick={onPreviousPage}
              className={cn(
                "size-8 rounded-md border-2 border-slate-200 bg-slate-100 p-0 text-slate-500 transition-all duration-300 ease-in-out focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9",
                canPreviousPage
                  ? "cursor-pointer hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500"
                  : "cursor-not-allowed opacity-50"
              )}
            >
              <LuChevronLeft className="size-4 md:size-5" />
            </Button>
          </div>
          <div className={!canNextPage ? "cursor-not-allowed" : ""}>
            <Button
              variant="ghost"
              aria-label="Go to next page"
              disabled={!canNextPage}
              onClick={onNextPage}
              className={cn(
                "size-8 rounded-md border-2 border-slate-200 bg-slate-100 p-0 text-slate-500 transition-all duration-300 ease-in-out focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9",
                canNextPage
                  ? "cursor-pointer hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500"
                  : "cursor-not-allowed opacity-50"
              )}
            >
              <LuChevronRight className="size-4 md:size-5" />
            </Button>
          </div>
          <div className={!canNextPage ? "cursor-not-allowed" : ""}>
            <Button
              variant="ghost"
              aria-label="Go to last page"
              disabled={!canNextPage}
              onClick={onLastPage}
              className={cn(
                "size-8 rounded-md border-2 border-slate-200 bg-slate-100 p-0 text-slate-500 transition-all duration-300 ease-in-out focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0 md:size-9",
                canNextPage
                  ? "cursor-pointer hover:border-emerald-500 hover:bg-emerald-100 hover:text-emerald-500"
                  : "cursor-not-allowed opacity-50"
              )}
            >
              <LuChevronsRight className="size-4 md:size-5" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

DashboardTablePagination.displayName = "DashboardTablePagination";
