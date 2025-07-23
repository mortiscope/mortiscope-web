"use client";

import { FaRegFileAlt, FaRegFileImage, FaRegFilePdf } from "react-icons/fa";
import { LuDownload } from "react-icons/lu";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

/**
 * Renders a dropdown menu for exporting results in various formats.
 */
export const ResultsExportDropdown = () => {
  return (
    <DropdownMenu>
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
      <DropdownMenuContent align="end" className="max-w-xs">
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          className={cn(
            "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 hover:[&_svg]:!text-emerald-600"
          )}
        >
          <FaRegFilePdf className="mr-2 h-4 w-4 shrink-0 text-slate-600" />
          <span className="truncate">Download as PDF</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          className={cn(
            "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 hover:[&_svg]:!text-emerald-600"
          )}
        >
          <FaRegFileImage className="mr-2 h-4 w-4 shrink-0 text-slate-600" />
          <span className="truncate">Download as Labelled Images</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(e) => e.preventDefault()}
          className={cn(
            "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 hover:[&_svg]:!text-emerald-600"
          )}
        >
          <FaRegFileAlt className="mr-2 h-4 w-4 shrink-0 text-slate-600" />
          <span className="truncate">Download as Raw Data</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
