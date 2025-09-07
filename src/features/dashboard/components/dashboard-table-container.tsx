"use client";

import {
  type FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import dynamic from "next/dynamic";
import { Suspense, useMemo, useState } from "react";

import { Card } from "@/components/ui/card";
import {
  type CaseData,
  dashboardTableColumns,
} from "@/features/dashboard/components/dashboard-table-columns";
import { DashboardTablePagination } from "@/features/dashboard/components/dashboard-table-pagination";
import { DashboardTableToolbar } from "@/features/dashboard/components/dashboard-table-toolbar";
import { getCaseById } from "@/features/results/actions/get-case-by-id";
import { type Case } from "@/features/results/components/results-preview";

// Dynamically import modal components
const CaseInformationModal = dynamic(() =>
  import("@/features/cases/components/case-information-modal").then(
    (module) => module.CaseInformationModal
  )
);

const DeleteSelectedCaseModal = dynamic(() =>
  import("@/features/dashboard/components/delete-selected-case-modal").then(
    (module) => module.DeleteSelectedCaseModal
  )
);

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
  /** Local state to control the case information modal. */
  const [infoModal, setInfoModal] = useState({
    isOpen: false,
    caseItem: null as Case | null,
  });
  /** Local state to control the delete selected cases modal. */
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
  });

  /**
   * Handler to open the case information modal and fetch case data.
   */
  const handleViewCase = async (caseId: string) => {
    try {
      const caseData = await getCaseById(caseId);
      if (caseData) {
        // Compute the verification status and detection counts
        const allDetections = caseData.uploads.flatMap((u) => u.detections);
        const hasDetections = allDetections.length > 0;
        const unverifiedCount = allDetections.filter((d) => d.status === "model_generated").length;
        const totalCount = allDetections.length;
        const verifiedCount = totalCount - unverifiedCount;

        let verificationStatus: "verified" | "in_progress" | "unverified" | "no_detections" =
          "no_detections";

        if (!hasDetections) {
          verificationStatus = "no_detections";
        } else if (unverifiedCount === 0) {
          verificationStatus = "verified";
        } else if (unverifiedCount === totalCount) {
          verificationStatus = "unverified";
        } else {
          verificationStatus = "in_progress";
        }

        // Create the enriched case object with computed properties
        const enrichedCase = {
          ...caseData,
          verificationStatus,
          hasDetections,
          totalDetections: totalCount,
          verifiedDetections: verifiedCount,
        };

        setInfoModal({
          isOpen: true,
          caseItem: enrichedCase as unknown as Case,
        });
      }
    } catch (error) {
      console.error("Failed to fetch case data:", error);
    }
  };

  /**
   * Handler to open the delete selected cases modal.
   */
  const handleDeleteSelected = () => {
    setDeleteModal({ isOpen: true });
  };

  /**
   * Handler when cases are successfully deleted.
   */
  const handleDeleteSuccess = () => {
    setRowSelection({});
  };

  /** Local state to manage sorting. */
  const [sorting, setSorting] = useState<SortingState>([{ id: "caseDate", desc: true }]);

  /**
   * Memoized array of selected cases with id and name.
   */
  const selectedCases = useMemo(() => {
    return Object.keys(rowSelection)
      .map((index) => {
        const row = data[parseInt(index)];
        return row ? { id: row.caseId, name: row.caseName } : null;
      })
      .filter((item): item is { id: string; name: string } => item !== null);
  }, [rowSelection, data]);

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
    // Add meta property for custom handlers
    meta: {
      onViewCase: handleViewCase,
    },
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
    // Enables sorting functionality.
    getSortedRowModel: getSortedRowModel(),
    // Connects local sorting state to the table.
    onSortingChange: setSorting,
    state: {
      // Connects the local row selection state to the table instance.
      rowSelection,
      columnVisibility,
      globalFilter,
      sorting,
    },
  });

  return (
    <Card className="font-inter w-full gap-4 overflow-hidden rounded-3xl border-none bg-white p-4 shadow-none md:p-8">
      {/* Renders the toolbar, passing down the count of selected rows for contextual actions. */}
      <DashboardTableToolbar
        table={table}
        selectedCount={Object.keys(rowSelection).length}
        onDeleteSelected={handleDeleteSelected}
      />

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

      {/* Lazy-loaded case information modal */}
      <Suspense fallback={null}>
        {infoModal.isOpen && (
          <CaseInformationModal
            isOpen={infoModal.isOpen}
            onOpenChange={(isOpen) => setInfoModal((prev) => ({ ...prev, isOpen }))}
            caseItem={infoModal.caseItem}
          />
        )}
      </Suspense>

      {/* Lazy-loaded delete selected cases modal */}
      <Suspense fallback={null}>
        {deleteModal.isOpen && (
          <DeleteSelectedCaseModal
            isOpen={deleteModal.isOpen}
            onOpenChange={(isOpen) => setDeleteModal({ isOpen })}
            selectedCases={selectedCases}
            onSuccess={handleDeleteSuccess}
          />
        )}
      </Suspense>
    </Card>
  );
};

DashboardTableContainer.displayName = "DashboardTableContainer";
