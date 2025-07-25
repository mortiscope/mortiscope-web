"use client";

import { useState } from "react";
import { FaRegFileAlt, FaRegFileImage, FaRegFilePdf } from "react-icons/fa";
import { LuDownload } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ExportResultsModal } from "@/features/results/components/export-results-modal";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the results export dropdown component.
 */
interface ResultsExportDropdownProps {
  caseId: string;
}

/**
 * Renders a dropdown menu for exporting results in various formats.
 * @param {ResultsExportDropdownProps} props - The component props.
 */
export const ResultsExportDropdown = ({ caseId }: ResultsExportDropdownProps) => {
  const [isRawDataModalOpen, setIsRawDataModalOpen] = useState(false);

  return (
    <>
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                aria-label="Export results"
                className="flex h-10 shrink-0 cursor-pointer items-center justify-center border-2 border-slate-200 bg-white px-2 shadow-none hover:bg-slate-50 focus-visible:ring-0 focus-visible:ring-offset-0 sm:gap-2 sm:px-3"
              >
                <LuDownload className="h-4 w-4 shrink-0 text-slate-600" />
                <span className="font-inter hidden text-sm font-normal text-slate-800 sm:inline">
                  Export Results
                </span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <DropdownMenuContent align="end" className="max-w-xs">
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              disabled
              className={cn(
                "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 hover:[&_svg]:!text-emerald-600",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-transparent disabled:hover:text-slate-800 disabled:focus:bg-transparent disabled:hover:[&_svg]:!text-slate-600"
              )}
            >
              <FaRegFilePdf className="mr-2 h-4 w-4 shrink-0 text-slate-600" />
              <span className="truncate">Export as PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              disabled
              className={cn(
                "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 hover:[&_svg]:!text-emerald-600",
                "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-transparent disabled:hover:text-slate-800 disabled:focus:bg-transparent disabled:hover:[&_svg]:!text-slate-600"
              )}
            >
              <FaRegFileImage className="mr-2 h-4 w-4 shrink-0 text-slate-600" />
              <span className="truncate">Export as Labelled Images</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                setIsRawDataModalOpen(true);
              }}
              className={cn(
                "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 hover:[&_svg]:!text-emerald-600"
              )}
            >
              <FaRegFileAlt className="mr-2 h-4 w-4 shrink-0 text-slate-600" />
              <span className="truncate">Export as Raw Data</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <TooltipContent className="bg-slate-800 text-white sm:hidden">
          <p className="font-inter">Export Results</p>
        </TooltipContent>
      </Tooltip>

      {/* The modal component, controlled by state. */}
      <ExportResultsModal
        caseId={caseId}
        isOpen={isRawDataModalOpen}
        onOpenChange={setIsRawDataModalOpen}
      />
    </>
  );
};
