"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { BsSortUp } from "react-icons/bs";
import { PiEye } from "react-icons/pi";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipTrigger } from "@/components/ui/tooltip";
import { STATUS_CONFIG } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Defines the TypeScript interface for a single row of data in the dashboard table.
 */
export interface CaseData {
  caseName: string;
  caseDate: string;
  verificationStatus: string;
  pmiEstimation: string;
  oldestStage: string;
  averageConfidence: string;
  imageCount: number;
  detectionCount: number;
  location: {
    region: string;
    province: string;
    city: string;
    barangay: string;
  };
  temperature: string;
}

/**
 * A custom tooltip content component, created using `forwardRef` to ensure it
 * correctly receives the ref from the underlying Radix UI primitive.
 */
const CustomTooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "bg-popover text-popover-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 overflow-hidden rounded-md border px-3 py-1.5 text-sm shadow-md",
      className
    )}
    {...props}
  />
));
CustomTooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * An array of column definitions for the dashboard data table, configured for use with Tanstack Table.
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
    // Defines a column for the case date data field.
    accessorKey: "caseDate",
    // Renders the header for the case name column, including a sort icon.
    header: () => (
      <div className="flex items-center justify-center gap-2">
        <span>Case Date</span>
        <BsSortUp className="h-4 w-4" />
      </div>
    ),
    // Renders the cell content by retrieving the case name value from the row's data and formatting it.
    cell: ({ row }) => <div>{new Date(row.getValue("caseDate")).toISOString().split("T")[0]}</div>,
  },
  {
    // Defines a column for the case name data field.
    accessorKey: "caseName",
    header: () => (
      <div className="flex items-center justify-center gap-2">
        <span>Case Name</span>
        <BsSortUp className="h-4 w-4" />
      </div>
    ),
    cell: ({ row }) => <div>{row.getValue("caseName")}</div>,
  },
  {
    // Defines a column for the verification status data field with custom cell rendering.
    accessorKey: "verificationStatus",
    header: () => (
      <div className="flex items-center justify-center gap-2">
        <span>Verification Status</span>
        <BsSortUp className="h-4 w-4" />
      </div>
    ),
    cell: ({ row }) => {
      // Retrieves the status value and looks up its configuration.
      const status = row.getValue("verificationStatus") as keyof typeof STATUS_CONFIG;
      const config = STATUS_CONFIG[status] || STATUS_CONFIG.no_detections;

      // A map to apply specific styling based on the status.
      const styles: Record<string, string> = {
        verified:
          "bg-transparent text-emerald-500 hover:bg-emerald-100 border-emerald-500 transition-colors duration-300 ease-in-out",
        in_progress:
          "bg-transparent text-sky-500 hover:bg-sky-100 border-sky-500 transition-colors duration-300 ease-in-out",
        unverified:
          "bg-transparent text-amber-500 hover:bg-amber-100 border-amber-500 transition-colors duration-300 ease-in-out",
      };

      const Icon = config.icon;

      return (
        // Renders a styled Badge with an icon and label.
        <div className="flex">
          <Badge
            variant="outline"
            className={cn(
              "cursor-pointer gap-1.5 rounded-sm text-xs font-normal md:text-sm [&>svg]:size-4",
              styles[status] || "bg-slate-100 text-slate-800"
            )}
          >
            <Icon className="h-4 w-4" />
            {config.label}
          </Badge>
        </div>
      );
    },
  },
  {
    // Defines a column for the PMI estimation data field.
    accessorKey: "pmiEstimation",
    header: () => (
      <div className="flex items-center justify-center gap-2">
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
      <div className="flex items-center justify-center gap-2">
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
      <div className="flex items-center justify-center gap-2">
        <span>Average Confidence</span>
        <BsSortUp className="h-4 w-4" />
      </div>
    ),
    cell: ({ row }) => <div>{row.getValue("averageConfidence")}</div>,
  },
  {
    // Defines a column for the image count.
    accessorKey: "imageCount",
    header: () => (
      <div className="flex items-center justify-center gap-2">
        <span>Image Count</span>
        <BsSortUp className="h-4 w-4" />
      </div>
    ),
    cell: ({ row }) => <div>{row.getValue("imageCount")}</div>,
  },
  {
    // Defines a column for the detection count.
    accessorKey: "detectionCount",
    header: () => (
      <div className="flex items-center justify-center gap-2">
        <span>Detection Count</span>
        <BsSortUp className="h-4 w-4" />
      </div>
    ),
    cell: ({ row }) => <div>{row.getValue("detectionCount")}</div>,
  },
  {
    // Defines a column for the location with custom cell rendering for a tooltip.
    accessorKey: "location",
    header: () => (
      <div className="flex items-center justify-center gap-2">
        <span>Location</span>
        <BsSortUp className="h-4 w-4" />
      </div>
    ),
    cell: ({ row }) => {
      // Retrieves the full location object from the row's data.
      const loc = row.getValue("location") as CaseData["location"];
      return (
        <div className="flex justify-start">
          <Tooltip>
            <TooltipTrigger asChild>
              {/* Renders a shortened version of the location in the cell. */}
              <span className="cursor-help decoration-slate-400 decoration-dashed underline-offset-4 hover:underline">
                {loc.city}, {loc.province}
              </span>
            </TooltipTrigger>
            {/* Renders the full, detailed location in a custom tooltip on hover. */}
            <CustomTooltipContent className="font-inter rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 shadow-lg">
              <div className="space-y-1">
                <p>
                  <span className="font-semibold text-slate-900">Region:</span> {loc.region}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Province:</span> {loc.province}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">City/Municipality:</span>{" "}
                  {loc.city}
                </p>
                <p>
                  <span className="font-semibold text-slate-900">Barangay:</span> {loc.barangay}
                </p>
              </div>
            </CustomTooltipContent>
          </Tooltip>
        </div>
      );
    },
  },
  {
    // Defines a column for the temperature.
    accessorKey: "temperature",
    header: () => (
      <div className="flex items-center justify-center gap-2">
        <span>Temperature</span>
        <BsSortUp className="h-4 w-4" />
      </div>
    ),
    cell: ({ row }) => <div>{row.getValue("temperature")}</div>,
  },
];
