"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { DateRange } from "react-day-picker";

import { Card } from "@/components/ui/card";
import { DashboardTable } from "@/features/dashboard/components/dashboard-table";
import { DashboardTablePagination } from "@/features/dashboard/components/dashboard-table-pagination";
import { DashboardTableToolbar } from "@/features/dashboard/components/dashboard-table-toolbar";
import { useDashboardTable } from "@/features/dashboard/hooks/use-dashboard-table";
import { type CaseData } from "@/features/dashboard/schemas/dashboard";

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
  dateRange: DateRange | undefined;
}

/**
 * A smart container component that initializes and orchestrates a data table using TanStack Table.
 * It manages the table's state, composes the toolbar, table, and pagination components, and passes
 * the necessary state and handlers down to them. Filters data based on the selected date range.
 */
export const DashboardTableContainer = ({ data, dateRange }: DashboardTableContainerProps) => {
  // Use the custom hook to manage all table logic and state
  const {
    table,
    tableScrollRef,
    rowSelection,
    infoModal,
    deleteModal,
    selectedCases,
    handleDeleteSelected,
    handleDeleteSuccess,
    setInfoModal,
    setDeleteModal,
  } = useDashboardTable({ data, dateRange });

  return (
    <Card className="font-inter w-full gap-4 overflow-hidden rounded-3xl border-none bg-white p-4 shadow-none md:p-8">
      {/* Renders the toolbar, passing down the count of selected rows for contextual actions. */}
      <DashboardTableToolbar
        table={table}
        selectedCount={Object.keys(rowSelection).length}
        onDeleteSelected={handleDeleteSelected}
      />

      {/* Renders the table component with the table instance and scroll ref */}
      <DashboardTable table={table} tableScrollRef={tableScrollRef} />

      {/* Renders the pagination component, passing down all necessary state and handlers from the `table` instance. */}
      <DashboardTablePagination
        selectedRowCount={Object.keys(rowSelection).length}
        totalRows={table.getFilteredRowModel().rows.length}
        currentPage={table.getState().pagination.pageIndex + 1}
        totalPages={Math.max(1, table.getPageCount())}
        canPreviousPage={table.getCanPreviousPage()}
        canNextPage={table.getCanNextPage()}
        onFirstPage={() => table.setPageIndex(0)}
        onPreviousPage={() => table.previousPage()}
        onNextPage={() => table.nextPage()}
        onLastPage={() => table.setPageIndex(Math.max(0, table.getPageCount() - 1))}
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
