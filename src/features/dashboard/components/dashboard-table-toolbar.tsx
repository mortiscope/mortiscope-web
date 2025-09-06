"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { BsLayoutThreeColumns } from "react-icons/bs";
import { IoTrashBinOutline } from "react-icons/io5";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Defines the props for the dashboard table toolbar component.
 */
interface DashboardTableToolbarProps {
  /** The number of rows currently selected in the table, used to conditionally show the delete button. */
  selectedCount: number;
}

/**
 * A presentational component that renders the toolbar for the main dashboard data table.
 * It includes a search filter, a column visibility toggle, and a contextual delete button
 * that appears when rows are selected.
 */
export const DashboardTableToolbar = ({ selectedCount }: DashboardTableToolbarProps) => {
  // Local state to manage the visibility of each table column.
  const [columnVisibility, setColumnVisibility] = useState({
    caseDate: false,
    verificationStatus: false,
    pmiEstimation: false,
    oldestStage: false,
    averageConfidence: false,
    imageCount: false,
    detectionCount: false,
    location: false,
    temperature: false,
  });

  return (
    // The main container for the toolbar, using flexbox for alignment.
    <div className="flex w-full items-center justify-between gap-2">
      {/* Search Input Section */}
      <div className="w-full md:max-w-sm">
        <Input
          type="text"
          placeholder="Search cases..."
          className="h-9 rounded-lg border-2 border-slate-200 text-xs shadow-none placeholder:text-slate-400 focus-visible:border-green-600 focus-visible:ring-0 md:h-10 md:text-sm"
        />
      </div>

      {/* Action Controls Section */}
      <div className="flex items-center gap-2">
        <AnimatePresence>
          {selectedCount > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Button
                variant="destructive"
                className="h-9 cursor-pointer gap-2 rounded-lg bg-rose-600 text-white shadow-none transition-all duration-300 ease-in-out hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/20 md:h-10"
              >
                <IoTrashBinOutline className="h-4 w-4 shrink-0" />
                {/* The delete text is hidden on smaller screens for a more compact layout. */}
                <span className="hidden whitespace-nowrap md:inline">Delete</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Column Visibility Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-9 cursor-pointer gap-2 rounded-lg border-2 border-slate-200 text-slate-400 shadow-none transition-colors ease-in-out hover:border-green-600 hover:bg-green-100 hover:text-green-600 md:h-10"
              )}
            >
              <BsLayoutThreeColumns className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Columns</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-auto border-2 border-slate-200">
            <DropdownMenuItem
              className="group font-inter cursor-pointer text-sm transition-colors duration-300 ease-in-out hover:!bg-emerald-100"
              onSelect={(e) => e.preventDefault()}
            >
              <Checkbox
                checked={columnVisibility.caseDate}
                onCheckedChange={(checked) =>
                  setColumnVisibility((prev) => ({ ...prev, caseDate: !!checked }))
                }
                className="mr-2 cursor-pointer group-hover:!border-emerald-600 data-[state=checked]:!border-emerald-600 data-[state=checked]:!bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:[&_svg]:!text-white"
              />
              <span className="text-slate-800 group-hover:!text-emerald-600">Case Date</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="group font-inter cursor-pointer text-sm transition-colors duration-300 ease-in-out hover:!bg-emerald-100"
              onSelect={(e) => e.preventDefault()}
            >
              <Checkbox
                checked={columnVisibility.verificationStatus}
                onCheckedChange={(checked) =>
                  setColumnVisibility((prev) => ({ ...prev, verificationStatus: !!checked }))
                }
                className="mr-2 cursor-pointer group-hover:!border-emerald-600 data-[state=checked]:!border-emerald-600 data-[state=checked]:!bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:[&_svg]:!text-white"
              />
              <span className="text-slate-800 group-hover:!text-emerald-600">
                Verification Status
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="group font-inter cursor-pointer text-sm transition-colors duration-300 ease-in-out hover:!bg-emerald-100"
              onSelect={(e) => e.preventDefault()}
            >
              <Checkbox
                checked={columnVisibility.pmiEstimation}
                onCheckedChange={(checked) =>
                  setColumnVisibility((prev) => ({ ...prev, pmiEstimation: !!checked }))
                }
                className="mr-2 cursor-pointer group-hover:!border-emerald-600 data-[state=checked]:!border-emerald-600 data-[state=checked]:!bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:[&_svg]:!text-white"
              />
              <span className="text-slate-800 group-hover:!text-emerald-600">PMI Estimation</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="group font-inter cursor-pointer text-sm transition-colors duration-300 ease-in-out hover:!bg-emerald-100"
              onSelect={(e) => e.preventDefault()}
            >
              <Checkbox
                checked={columnVisibility.oldestStage}
                onCheckedChange={(checked) =>
                  setColumnVisibility((prev) => ({ ...prev, oldestStage: !!checked }))
                }
                className="mr-2 cursor-pointer group-hover:!border-emerald-600 data-[state=checked]:!border-emerald-600 data-[state=checked]:!bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:[&_svg]:!text-white"
              />
              <span className="text-slate-800 group-hover:!text-emerald-600">Oldest Stage</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="group font-inter cursor-pointer text-sm transition-colors duration-300 ease-in-out hover:!bg-emerald-100"
              onSelect={(e) => e.preventDefault()}
            >
              <Checkbox
                checked={columnVisibility.averageConfidence}
                onCheckedChange={(checked) =>
                  setColumnVisibility((prev) => ({ ...prev, averageConfidence: !!checked }))
                }
                className="mr-2 cursor-pointer group-hover:!border-emerald-600 data-[state=checked]:!border-emerald-600 data-[state=checked]:!bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:[&_svg]:!text-white"
              />
              <span className="text-slate-800 group-hover:!text-emerald-600">
                Average Confidence
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="group font-inter cursor-pointer text-sm transition-colors duration-300 ease-in-out hover:!bg-emerald-100"
              onSelect={(e) => e.preventDefault()}
            >
              <Checkbox
                checked={columnVisibility.imageCount}
                onCheckedChange={(checked) =>
                  setColumnVisibility((prev) => ({ ...prev, imageCount: !!checked }))
                }
                className="mr-2 cursor-pointer group-hover:!border-emerald-600 data-[state=checked]:!border-emerald-600 data-[state=checked]:!bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:[&_svg]:!text-white"
              />
              <span className="text-slate-800 group-hover:!text-emerald-600">Image Count</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="group font-inter cursor-pointer text-sm transition-colors duration-300 ease-in-out hover:!bg-emerald-100"
              onSelect={(e) => e.preventDefault()}
            >
              <Checkbox
                checked={columnVisibility.detectionCount}
                onCheckedChange={(checked) =>
                  setColumnVisibility((prev) => ({ ...prev, detectionCount: !!checked }))
                }
                className="mr-2 cursor-pointer group-hover:!border-emerald-600 data-[state=checked]:!border-emerald-600 data-[state=checked]:!bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:[&_svg]:!text-white"
              />
              <span className="text-slate-800 group-hover:!text-emerald-600">Detection Count</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="group font-inter cursor-pointer text-sm transition-colors duration-300 ease-in-out hover:!bg-emerald-100"
              onSelect={(e) => e.preventDefault()}
            >
              <Checkbox
                checked={columnVisibility.location}
                onCheckedChange={(checked) =>
                  setColumnVisibility((prev) => ({ ...prev, location: !!checked }))
                }
                className="mr-2 cursor-pointer group-hover:!border-emerald-600 data-[state=checked]:!border-emerald-600 data-[state=checked]:!bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:[&_svg]:!text-white"
              />
              <span className="text-slate-800 group-hover:!text-emerald-600">Location</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="group font-inter cursor-pointer text-sm transition-colors duration-300 ease-in-out hover:!bg-emerald-100"
              onSelect={(e) => e.preventDefault()}
            >
              <Checkbox
                checked={columnVisibility.temperature}
                onCheckedChange={(checked) =>
                  setColumnVisibility((prev) => ({ ...prev, temperature: !!checked }))
                }
                className="mr-2 cursor-pointer group-hover:!border-emerald-600 data-[state=checked]:!border-emerald-600 data-[state=checked]:!bg-emerald-600 data-[state=checked]:text-white data-[state=checked]:[&_svg]:!text-white"
              />
              <span className="text-slate-800 group-hover:!text-emerald-600">Temperature</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

DashboardTableToolbar.displayName = "DashboardTableToolbar";
