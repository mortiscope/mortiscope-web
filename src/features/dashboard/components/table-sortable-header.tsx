import type { Header } from "@tanstack/react-table";
import React from "react";
import { BsSortDown, BsSortUp } from "react-icons/bs";

import { cn } from "@/lib/utils";

interface SortableHeaderProps<TData> {
  header: Header<TData, unknown>;
  children: React.ReactNode;
}

/**
 * A reusable sortable header component for table columns.
 * Displays sort indicators and handles click events for sorting.
 *
 * @param header - The TanStack Table header instance
 * @param children - The header content to display
 */
export const SortableHeader = <TData,>({ header, children }: SortableHeaderProps<TData>) => {
  const isSorted = header.column.getIsSorted();
  const canSort = header.column.getCanSort();

  if (!canSort) {
    return <div className="flex items-center justify-center gap-2">{children}</div>;
  }

  return (
    <button
      onClick={header.column.getToggleSortingHandler()}
      className="flex w-full cursor-pointer items-center justify-center gap-2 transition-colors duration-200 select-none"
    >
      <span>{children}</span>
      {isSorted === "desc" ? (
        <BsSortDown className="h-4 w-4 text-emerald-500 hover:text-emerald-400 active:text-emerald-500 md:h-5 md:w-5" />
      ) : (
        <BsSortUp
          className={cn(
            "h-4 w-4 transition-colors duration-200 md:h-5 md:w-5",
            isSorted === "asc"
              ? "text-emerald-500"
              : "text-slate-600 hover:text-emerald-400 active:text-emerald-500"
          )}
        />
      )}
    </button>
  );
};

SortableHeader.displayName = "SortableHeader";
