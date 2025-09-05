"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { BsSortUp } from "react-icons/bs";
import { PiEye } from "react-icons/pi";

import { Checkbox } from "@/components/ui/checkbox";

/**
 * Defines the TypeScript interface for a single row of data in the dashboard table.
 */
export interface CaseData {
  caseName: string;
  caseDate: string;
  imageCount: number;
  verificationStatus: string;
  pmiEstimation: string;
  oldestStage: string;
  averageConfidence: number;
}

/**
 * An array of column definitions for the dashboard data table, configured for use with TanStack Table.
 * Each object in this array defines a single column, specifying its ID, header, and how its cells are rendered.
 */
export const dashboardTableColumns: ColumnDef<CaseData>[] = [
  {
    // A non-data column used to display a decorative view icon.
    id: "view",
    // Renders an empty header for this column.
    header: () => <div />,
    // Renders a simple eye icon in each cell of this column.
    cell: () => (
      <div className="flex items-center justify-center">
        <PiEye className="h-4 w-4 text-slate-600" />
      </div>
    ),
  },
  {
    // A non-data column used for row selection.
    id: "select",
    header: () => <div />,
    // Renders a checkbox component in each cell.
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={row.getToggleSelectedHandler()}
          className="cursor-pointer data-[state=checked]:border-emerald-600 data-[state=checked]:bg-emerald-600"
        />
      </div>
    ),
  },
  {
    // Defines a column for the case name data field.
    accessorKey: "caseName",
    // Renders the header for the case name column, including a sort icon.
    header: () => (
      <div className="flex items-center gap-2">
        <span>Case Name</span>
        <BsSortUp className="h-4 w-4" />
      </div>
    ),
    // Renders the cell content by retrieving the case name value from the row's data.
    cell: ({ row }) => <strong>{row.getValue("caseName")}</strong>,
  },
  {
    // Defines a column for the case date data field.
    accessorKey: "caseDate",
    header: () => (
      <div className="flex items-center gap-2">
        <span>Case Date</span>
        <BsSortUp className="h-4 w-4" />
      </div>
    ),
    cell: ({ row }) => <div>{row.getValue("caseDate")}</div>,
  },
  {
    // Defines a column for the verification status data field.
    accessorKey: "verificationStatus",
    header: () => (
      <div className="flex items-center gap-2">
        <span>Verification Status</span>
        <BsSortUp className="h-4 w-4" />
      </div>
    ),
    cell: ({ row }) => <div>{row.getValue("verificationStatus")}</div>,
  },
  {
    // Defines a column for the PMI estimation data field.
    accessorKey: "pmiEstimation",
    header: () => (
      <div className="flex items-center gap-2">
        <span>PMI Estimation</span>
        <BsSortUp className="h-4 w-4" />
      </div>
    ),
    cell: ({ row }) => <div>{row.getValue("pmiEstimation")}</div>,
  },
  {
    // Defines a column for the oldest stage data field.
    accessorKey: "oldestStage",
    header: () => (
      <div className="flex items-center gap-2">
        <span>Oldest Stage</span>
        <BsSortUp className="h-4 w-4" />
      </div>
    ),
    cell: ({ row }) => <div>{row.getValue("oldestStage")}</div>,
  },
  {
    // Defines a column for the average confidence data field.
    accessorKey: "averageConfidence",
    header: () => (
      <div className="flex items-center gap-2">
        <span>Average Confidence</span>
        <BsSortUp className="h-4 w-4" />
      </div>
    ),
    cell: ({ row }) => <div>{row.getValue("averageConfidence")}</div>,
  },
];
