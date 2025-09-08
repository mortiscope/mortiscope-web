import { flexRender, type Table } from "@tanstack/react-table";
import { type RefObject } from "react";
import { HiOutlineSearch } from "react-icons/hi";

import { type CaseData } from "@/features/dashboard/components/dashboard-table-columns";

interface DashboardTableProps {
  table: Table<CaseData>;
  tableScrollRef: RefObject<HTMLDivElement | null>;
}

/**
 * A presentational component that renders the dashboard table interface.
 * It receives the table instance and scroll ref from the parent container
 * and focuses purely on rendering the table structure without managing any state or logic.
 */
export const DashboardTable = ({ table, tableScrollRef }: DashboardTableProps) => {
  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        {/* A wrapper to allow horizontal scrolling of the table on smaller screens. */}
        <div ref={tableScrollRef} className="w-full overflow-x-auto">
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
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={table.getAllColumns().length} className="py-8">
                    <div className="flex flex-col items-center justify-center text-center">
                      <HiOutlineSearch className="h-8 w-8 text-slate-300 md:h-12 md:w-12" />
                      <h3 className="font-plus-jakarta-sans mt-2 text-lg font-semibold text-slate-800 md:text-xl">
                        No Cases Found
                      </h3>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

DashboardTable.displayName = "DashboardTable";
