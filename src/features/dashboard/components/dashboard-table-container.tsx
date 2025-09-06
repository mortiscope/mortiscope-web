"use client";

import {
  type FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  type RowSelectionState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { useState } from "react";

import { Card } from "@/components/ui/card";
import {
  type CaseData,
  dashboardTableColumns,
} from "@/features/dashboard/components/dashboard-table-columns";
import { DashboardTablePagination } from "@/features/dashboard/components/dashboard-table-pagination";
import { DashboardTableToolbar } from "@/features/dashboard/components/dashboard-table-toolbar";

interface DashboardTableContainerProps {
  data: CaseData[];
}

/**
 * Custom global filter function that searches across all visible columns
 */
const globalFilterFn: FilterFn<CaseData> = (row, _columnId, filterValue) => {
  const search = String(filterValue).toLowerCase();

  // Get all visible columns
  const visibleColumns = row.getAllCells().filter((cell) => cell.column.getIsVisible());

  // Search through all visible column values
  return visibleColumns.some((cell) => {
    const cellValue = cell.getValue();

    // Handle different data types
    if (cellValue === null || cellValue === undefined) return false;

    // Convert to string and search
    const stringValue = String(cellValue).toLowerCase();
    return stringValue.includes(search);
  });
};

/**
 * A smart container component that initializes and orchestrates a data table using TanStack Table.
 * It manages the table's state, composes the toolbar, table, and pagination components, and passes
 * the necessary state and handlers down to them.
 */
export const DashboardTableContainer = ({ data }: DashboardTableContainerProps) => {
  /** Local state to manage the selection state of the table rows. */
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  /** Local state to manage the global search filter. */
  const [globalFilter, setGlobalFilter] = useState("");
  /** Local state to manage column visibility. */
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    verificationStatus: true,
    pmiEstimation: true,
    oldestStage: true,
    averageConfidence: true,
    imageCount: false,
    detectionCount: false,
    location: false,
    temperature: false,
  });

  /**
   * The core hook from TanStack Table that creates and manages the table instance.
   */
  const table = useReactTable({
    // The data to be displayed in the table.
    data,
    // The column definitions imported from another file.
    columns: dashboardTableColumns,
    // Enables the basic table functionality.
    getCoreRowModel: getCoreRowModel(),
    // Enables the pagination feature.
    getPaginationRowModel: getPaginationRowModel(),
    // Enables filtering feature.
    getFilteredRowModel: getFilteredRowModel(),
    // Enables the row selection feature.
    enableRowSelection: true,
    // Use custom global filter function
    globalFilterFn: globalFilterFn,
    enableGlobalFilter: true,
    initialState: {
      pagination: {
        // Sets the number of rows per page.
        pageSize: 10,
      },
    },
    // Provides the callback to update the local state when selection changes.
    onRowSelectionChange: setRowSelection,
    // Connects local column visibility state to the table.
    onColumnVisibilityChange: setColumnVisibility,
    // Connects local global filter state to the table.
    onGlobalFilterChange: setGlobalFilter,
    state: {
      // Connects the local row selection state to the table instance.
      rowSelection,
      columnVisibility,
      globalFilter,
    },
  });

  return (
    <Card className="font-inter w-full gap-4 overflow-hidden rounded-3xl border-none bg-white p-4 shadow-none md:p-8">
      {/* Renders the toolbar, passing down the count of selected rows for contextual actions. */}
      <DashboardTableToolbar table={table} selectedCount={Object.keys(rowSelection).length} />

      <div className="w-full">
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          {/* A wrapper to allow horizontal scrolling of the table on smaller screens. */}
          <div className="w-full overflow-x-auto">
            <table className="w-full table-auto">
              {/* Renders the table header. */}
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="border-b border-slate-200 bg-slate-100 px-4 py-3 text-center text-xs font-normal whitespace-nowrap text-slate-800 md:text-sm"
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              {/* Renders the table body. */}
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className={row.getIsSelected() ? "bg-emerald-50" : "hover:bg-slate-50"}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isSelectColumn = cell.column.id === "select";
                      const isCaseNameColumn = cell.column.id === "caseName";
                      const paddingClass = isSelectColumn
                        ? "pr-1"
                        : isCaseNameColumn
                          ? "pl-1"
                          : "px-2 md:px-4";
                      return (
                        <td
                          key={cell.id}
                          className={`border-b border-slate-200 ${paddingClass} py-3 text-xs text-slate-600 md:text-sm`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {/* Renders the pagination component, passing down all necessary state and handlers from the `table` instance. */}
      <DashboardTablePagination
        selectedRowCount={Object.keys(rowSelection).length}
        totalRows={data.length}
        currentPage={table.getState().pagination.pageIndex + 1}
        totalPages={table.getPageCount()}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
        onFirstPage={() => table.setPageIndex(0)}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
        onLastPage={() => table.setPageIndex(table.getPageCount() - 1)}
      />
    </Card>
  );
};

DashboardTableContainer.displayName = "DashboardTableContainer";
