"use client";

import dynamic from "next/dynamic";
import { Suspense, useState } from "react";
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
import { cn } from "@/lib/utils";

// Lazy-loaded version of the modal.
const ExportResultsModal = dynamic(() =>
  import("@/features/export/components/export-results-modal").then((mod) => mod.ExportResultsModal)
);

/**
 * Defines the available case export formats that can trigger the modal.
 */
type CaseExportFormat = "raw_data" | "labelled_images";

/**
 * Defines the props for the export dropdown component.
 */
interface ExportDropdownProps {
  caseId: string;
}

/**
 * Renders a dropdown menu for exporting results in various formats.
 */
export const ExportDropdown = ({ caseId }: ExportDropdownProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<CaseExportFormat>("raw_data");

  const handleOpenModal = (format: CaseExportFormat) => {
    setSelectedFormat(format);
    setIsModalOpen(true);
  };

  return (
    <>
      <Tooltip>
        <DropdownMenu>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                aria-label="Export results"
                className="flex h-10 w-11 shrink-0 cursor-pointer items-center justify-center border-2 border-slate-200 bg-white px-2 shadow-none hover:bg-slate-50 focus-visible:ring-0 focus-visible:ring-offset-0 sm:w-[150px] sm:gap-2 sm:px-3"
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
              onSelect={(e) => {
                e.preventDefault();
                handleOpenModal("labelled_images");
              }}
              className={cn(
                "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 hover:[&_svg]:!text-emerald-600"
              )}
            >
              <FaRegFileImage className="mr-2 h-4 w-4 shrink-0 text-slate-600" />
              <span className="truncate">Export as Labelled Images</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                handleOpenModal("raw_data");
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

      {/* Wrap the modal in a Suspense boundary. */}
      <Suspense fallback={null}>
        {isModalOpen && (
          <ExportResultsModal
            caseId={caseId}
            isOpen={isModalOpen}
            onOpenChange={setIsModalOpen}
            format={selectedFormat}
          />
        )}
      </Suspense>
    </>
  );
};
