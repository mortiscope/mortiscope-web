"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { HiOutlineSearch } from "react-icons/hi";
import { IoGridOutline, IoListOutline } from "react-icons/io5";
import {
  LuArrowDownAZ,
  LuArrowUpDown,
  LuArrowUpZA,
  LuCalendarClock,
  LuCalendarDays,
  LuScaling,
} from "react-icons/lu";
import { MdOutlineRemoveRedEye } from "react-icons/md";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type uploads } from "@/db/schema";
import { SORT_OPTIONS, type SortOptionValue } from "@/lib/constants";
import { cn, formatBytes } from "@/lib/utils";

// Define local types for better state management within this component.
type ViewMode = "list" | "grid";
type ImageFile = {
  id: string;
  name: string;
  url: string;
  size: number;
  dateUploaded: Date;
};

/**
 * A small component to render an icon for each sort option.
 */
const SortIcon = ({ value }: { value: SortOptionValue }) => {
  const commonProps = { className: "mr-2 h-4 w-4 text-slate-600" };
  switch (value) {
    case "date-uploaded-desc":
    case "date-uploaded-asc":
      return <LuCalendarClock {...commonProps} />;
    case "date-modified-desc":
    case "date-modified-asc":
      return <LuCalendarDays {...commonProps} />;
    case "name-asc":
      return <LuArrowDownAZ {...commonProps} />;
    case "name-desc":
      return <LuArrowUpZA {...commonProps} />;
    case "size-asc":
    case "size-desc":
      return <LuScaling {...commonProps} />;
    default:
      return null;
  }
};

/**
 * A small component that creates a temporary local URL for a File object and renders it as an image thumbnail.
 */
const Thumbnail = ({ imageFile, className }: { imageFile: ImageFile; className?: string }) => {
  // Render a skeleton loader if the URL is somehow missing.
  if (!imageFile.url) {
    return (
      <div className={cn("flex-shrink-0 rounded-md bg-slate-200", className || "h-10 w-10")} />
    );
  }

  return (
    // Enforces the aspect ratio and clips the image.
    <div
      className={cn("relative flex-shrink-0 overflow-hidden", className || "h-10 w-10 rounded-md")}
    >
      <Image
        src={imageFile.url}
        alt={`Preview of ${imageFile.name}`}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
      />
    </div>
  );
};

type ResultsImagesProps = {
  // The component receives images from the database as props.
  initialImages: (typeof uploads.$inferSelect)[];
};

/**
 * Renders a list of the case images, with controls for searching, sorting, and changing view mode.
 */
export const ResultsImages = ({ initialImages }: ResultsImagesProps) => {
  // Map initial database data to the local state format.
  const mappedImages: ImageFile[] = useMemo(
    () =>
      initialImages.map((img) => ({
        id: img.id,
        name: img.name,
        url: img.url,
        size: img.size,
        dateUploaded: img.createdAt,
      })),
    [initialImages]
  );

  // Use local state instead of a global store.
  const [files, setFiles] = useState<ImageFile[]>(mappedImages);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortOption, setSortOption] = useState<SortOptionValue>("date-uploaded-desc");
  const [searchTerm, setSearchTerm] = useState("");

  /**
   * Memoize the current sort option's label to display in the trigger.
   * This avoids re-calculating the label on every render.
   */
  const currentSortLabel = useMemo(() => {
    const currentOption = SORT_OPTIONS.find((option) => option.value === sortOption);
    return currentOption?.label ?? "Sort by";
  }, [sortOption]);

  /**
   * Memoizes the list of files filtered by the current search term.
   */
  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    return files.filter((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [files, searchTerm]);

  /**
   * Memoize the sorted files to prevent re-sorting on every render.
   */
  const sortedFiles = useMemo(() => {
    const sorted = [...filteredFiles];
    switch (sortOption) {
      case "name-asc":
        return sorted.sort((a, b) => a.name.localeCompare(b.name));
      case "name-desc":
        return sorted.sort((a, b) => b.name.localeCompare(a.name));
      case "size-asc":
        return sorted.sort((a, b) => a.size - b.size);
      case "size-desc":
        return sorted.sort((a, b) => b.size - a.size);
      case "date-modified-desc":
      case "date-uploaded-desc":
      default:
        return sorted.sort((a, b) => b.dateUploaded.getTime() - a.dateUploaded.getTime());
      case "date-modified-asc":
      case "date-uploaded-asc":
        return sorted.sort((a, b) => a.dateUploaded.getTime() - b.dateUploaded.getTime());
    }
  }, [filteredFiles, sortOption]);

  // Update files state if the initial props change.
  useEffect(() => {
    setFiles(mappedImages);
  }, [mappedImages]);

  return (
    <>
      <TooltipProvider>
        {/* Only render the container if there are files to show */}
        {files.length > 0 && (
          <motion.div
            layout
            transition={{ layout: { type: "tween", duration: 0.6, ease: "easeInOut" } }}
            className="w-full"
          >
            {/* View mode and sort controls */}
            <motion.div
              layout
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
              className="mb-4 flex items-center justify-between gap-2"
            >
              {/* Search input field. */}
              <div className="relative w-full max-w-sm">
                <HiOutlineSearch className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Search images..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  maxLength={50}
                  className="font-inter h-10 border-none pl-10 text-sm shadow-none placeholder:!text-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>

              {/* Container for the sort and view mode controls. */}
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      aria-label="Sort options"
                      className="flex h-10 shrink-0 cursor-pointer items-center justify-center border-2 border-slate-200 bg-white px-2 shadow-none hover:bg-slate-50 focus-visible:ring-0 focus-visible:ring-offset-0 sm:gap-2 sm:px-3"
                    >
                      <span className="font-inter hidden text-sm font-normal text-slate-800 sm:inline">
                        {currentSortLabel}
                      </span>
                      <LuArrowUpDown className="h-4 w-4 shrink-0 text-slate-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    {SORT_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onSelect={() => setSortOption(option.value as SortOptionValue)}
                        className={cn(
                          "font-inter cursor-pointer border-2 border-transparent text-slate-800 transition-colors duration-300 ease-in-out hover:border-emerald-200 hover:!text-emerald-600 focus:bg-emerald-100 hover:[&_svg]:!text-emerald-600"
                        )}
                      >
                        <SortIcon value={option.value as SortOptionValue} />
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={viewMode}
                  onValueChange={(value) => {
                    if (value) setViewMode(value as ViewMode);
                  }}
                  aria-label="View mode"
                  className="border-2 border-slate-200 bg-white data-[variant=outline]:shadow-none"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value="list"
                        aria-label="List view"
                        className="cursor-pointer border-none data-[state=off]:hover:bg-slate-50 data-[state=on]:!bg-emerald-200 data-[state=on]:!text-emerald-600"
                      >
                        <IoListOutline className="h-5 w-5" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-inter">List view</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToggleGroupItem
                        value="grid"
                        aria-label="Grid view"
                        className="cursor-pointer border-none data-[state=off]:hover:bg-slate-50 data-[state=on]:!bg-emerald-200 data-[state=on]:!text-emerald-600"
                      >
                        <IoGridOutline className="h-5 w-5" />
                      </ToggleGroupItem>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-inter">Grid view</p>
                    </TooltipContent>
                  </Tooltip>
                </ToggleGroup>
              </div>
            </motion.div>

            {/* Container for the file list, with view-switch animation. */}
            <AnimatePresence mode="wait">
              {sortedFiles.length > 0 ? (
                <motion.div
                  layout
                  key={viewMode}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{
                    layout: { type: "tween", duration: 0.6, ease: "easeInOut" },
                    opacity: { duration: 0.3 },
                  }}
                  className={cn(
                    "grid gap-3",
                    viewMode === "list"
                      ? "grid-cols-1 md:grid-cols-2"
                      : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
                  )}
                >
                  <AnimatePresence>
                    {sortedFiles.map((imageFile) => (
                      <motion.div
                        key={imageFile.id}
                        layout
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{
                          layout: { type: "tween", duration: 0.6, ease: "easeInOut" },
                          opacity: { duration: 0.4 },
                          scale: { duration: 0.4 },
                        }}
                        className={cn(
                          "font-inter group relative rounded-lg border-2 border-slate-200 bg-slate-50 transition-colors duration-300 ease-in-out hover:border-emerald-300 hover:bg-emerald-50 md:rounded-xl",
                          {
                            "flex items-center justify-between p-2 sm:p-3": viewMode === "list",
                            "flex aspect-square flex-col overflow-hidden": viewMode === "grid",
                          }
                        )}
                      >
                        {viewMode === "list" ? (
                          <>
                            {/* List View Layout */}
                            <div className="flex min-w-0 flex-grow items-center gap-3">
                              <Thumbnail imageFile={imageFile} />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-normal text-slate-700 sm:text-base">
                                  {imageFile.name}
                                </p>
                                <p className="text-xs text-slate-500 sm:text-sm">
                                  {formatBytes(imageFile.size)}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`View ${imageFile.name}`}
                                    className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-amber-100 hover:text-amber-600"
                                  >
                                    <MdOutlineRemoveRedEye className="h-5 w-5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-inter">View</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </>
                        ) : (
                          <>
                            {/* Grid View Layout */}
                            <div className="min-h-0 flex-1">
                              <Thumbnail imageFile={imageFile} className="h-full w-full" />
                            </div>
                            <div className="flex w-full flex-col items-center justify-center p-1">
                              <div className="mt-1 flex flex-shrink-0 items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      aria-label={`View ${imageFile.name}`}
                                      className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-amber-100 hover:text-amber-600"
                                    >
                                      <MdOutlineRemoveRedEye className="h-5 w-5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-inter">View</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          </>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : searchTerm ? (
                <motion.div
                  key="no-results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex flex-1 flex-col items-center justify-center py-10 text-center"
                >
                  <HiOutlineSearch className="h-12 w-12 text-slate-300" />
                  <h3 className="font-plus-jakarta-sans mt-4 text-xl font-semibold text-slate-800">
                    No Images Found
                  </h3>
                  <p className="font-inter mt-1 max-w-sm text-sm break-all text-slate-500">
                    Your search term did not match any images.
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        )}
      </TooltipProvider>
    </>
  );
};
