"use client";

import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { HiOutlineSearch } from "react-icons/hi";
import {
  LuArrowDownAZ,
  LuArrowUpDown,
  LuArrowUpZA,
  LuCalendarClock,
  LuCalendarDays,
  LuDownload,
  LuScaling,
  LuTrash2,
} from "react-icons/lu";
import { MdOutlineRemoveRedEye } from "react-icons/md";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { type detections, type uploads } from "@/db/schema";
import { renameImage } from "@/features/results/actions/rename-image";
import { DeleteImageModal } from "@/features/results/components/delete-image-modal";
import { ExportImageModal } from "@/features/results/components/export-image-modal";
import { ResultsImagesModal } from "@/features/results/components/results-images-modal";
import { ResultsImagesSkeleton } from "@/features/results/components/results-skeleton";
import {
  LG_GRID_LIMIT,
  MD_GRID_LIMIT,
  SM_GRID_LIMIT,
  SORT_OPTIONS,
  type SortOptionValue,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

// Define local types for better state management within this component.
type Detection = typeof detections.$inferSelect;
type ImageFile = {
  id: string;
  name: string;
  url: string;
  size: number;
  dateUploaded: Date;
  version: number;
  detections?: Detection[];
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

  // Apply cache-busting to the thumbnail URL
  const cacheBustedUrl = `${imageFile.url}?v=${imageFile.version}`;

  return (
    // Enforces the aspect ratio and clips the image.
    <div
      className={cn("relative flex-shrink-0 overflow-hidden", className || "h-10 w-10 rounded-md")}
    >
      <Image
        src={cacheBustedUrl}
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
  initialImages?: (typeof uploads.$inferSelect & {
    detections: Detection[];
  })[];
  /**
   * If true, the component will render its skeleton state.
   */
  isLoading?: boolean;
};

/**
 * Renders a list of the case images, with controls for searching, sorting, and changing view mode.
 */
export const ResultsImages = ({ initialImages, isLoading }: ResultsImagesProps) => {
  // Map initial database data to the local state format.
  const mappedImages: ImageFile[] = useMemo(
    () =>
      initialImages?.map((img) => ({
        id: img.id,
        name: img.name,
        url: img.url,
        size: img.size,
        dateUploaded: img.createdAt,
        version: img.createdAt.getTime(),
        detections: img.detections,
      })) || [],
    [initialImages]
  );

  // All Hooks are called unconditionally at the top of the component.
  const [files, setFiles] = useState<ImageFile[]>(mappedImages);
  const [sortOption, setSortOption] = useState<SortOptionValue>("date-uploaded-desc");
  const [searchTerm, setSearchTerm] = useState("");

  // State for managing the preview modal.
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // State for managing the single-image export modal.
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [imageToExport, setImageToExport] = useState<ImageFile | null>(null);

  // State for managing the single delete image modal.
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [imageToDelete, setImageToDelete] = useState<ImageFile | null>(null);

  // TanStack Query mutation for renaming an image.
  const renameMutation = useMutation({
    mutationFn: renameImage,
    onSuccess: (response, variables) => {
      if (response.success && response.data) {
        // Update the local state to reflect the change immediately.
        setFiles((currentFiles) =>
          currentFiles.map((file) =>
            file.id === variables.imageId
              ? {
                  ...file,
                  name: variables.newName,
                  url: response.data!.newUrl,
                  version: Date.now(),
                }
              : file
          )
        );
        toast.success("Image renamed successfully.");
      } else {
        toast.error(response.error || "Failed to rename image. Please try again.");
      }
    },
    onError: (error) => {
      toast.error(error.message || "An unexpected error occurred.");
    },
  });

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

  // Memoize the currently selected image object for the modal.
  const selectedImage = useMemo(() => {
    if (!selectedImageId) return null;
    return sortedFiles.find((f) => f.id === selectedImageId) ?? null;
  }, [selectedImageId, sortedFiles]);

  // Update files state if the initial props change.
  useEffect(() => {
    setFiles(mappedImages);
  }, [mappedImages]);

  // The conditional return now happens *after* all hooks have been called.
  if (isLoading) {
    return <ResultsImagesSkeleton />;
  }

  const handleOpenModal = (imageId: string) => {
    setSelectedImageId(imageId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Delay clearing the selected image to allow for the modal's exit animation.
    setTimeout(() => setSelectedImageId(null), 300);
  };

  // Handler to open the export image modal with the correct image data.
  const handleOpenExportModal = (imageFile: ImageFile) => {
    setImageToExport(imageFile);
    setIsExportModalOpen(true);
  };

  // Handler to open the delete image modal with the correct image data.
  const handleOpenDeleteModal = (imageFile: ImageFile) => {
    setImageToDelete(imageFile);
    setIsDeleteModalOpen(true);
  };

  const handleSelectImage = (imageId: string) => {
    setSelectedImageId(imageId);
  };

  const handleNextImage = () => {
    const currentIndex = sortedFiles.findIndex((f) => f.id === selectedImageId);
    if (currentIndex > -1 && currentIndex < sortedFiles.length - 1) {
      setSelectedImageId(sortedFiles[currentIndex + 1].id);
    }
  };

  const handlePreviousImage = () => {
    const currentIndex = sortedFiles.findIndex((f) => f.id === selectedImageId);
    if (currentIndex > 0) {
      setSelectedImageId(sortedFiles[currentIndex - 1].id);
    }
  };

  const handleRenameImage = async (imageId: string, newName: string) => {
    await renameMutation.mutateAsync({ imageId, newName });
  };

  // Props for motion elements for a fade and scale animation, without layout shuffling.
  const motionItemProps = {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: {
      duration: 0.3,
      ease: "easeInOut",
    },
  };

  return (
    <>
      <TooltipProvider>
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
            </div>
          </motion.div>

          {/* Container for the file list, with view-switch animation. */}
          <AnimatePresence mode="wait">
            {sortedFiles.length > 0 ? (
              <motion.div
                layout
                key="grid-view"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  layout: { type: "tween", duration: 0.6, ease: "easeInOut" },
                  opacity: { duration: 0.3 },
                }}
              >
                {/* Large Screen Layout */}
                <div className="hidden grid-cols-5 gap-3 lg:grid">
                  <AnimatePresence mode="wait">
                    {sortedFiles.slice(0, LG_GRID_LIMIT - 1).map((imageFile) => (
                      <motion.div
                        key={`${sortOption}-${imageFile.id}`}
                        {...motionItemProps}
                        className="font-inter group relative flex aspect-square flex-col overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 transition-colors duration-300 ease-in-out hover:border-emerald-300 hover:bg-emerald-50 md:rounded-2xl lg:rounded-3xl"
                      >
                        <div
                          className="min-h-0 flex-1 cursor-pointer"
                          onClick={() => handleOpenModal(imageFile.id)}
                        >
                          <Thumbnail imageFile={imageFile} className="h-full w-full" />
                        </div>
                        <div className="flex w-full flex-col items-center justify-center p-1">
                          <div className="my-1 flex flex-shrink-0 items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`View ${imageFile.name}`}
                                  onClick={() => handleOpenModal(imageFile.id)}
                                  className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-amber-100 hover:text-amber-600"
                                >
                                  <MdOutlineRemoveRedEye className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-inter">View</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Download ${imageFile.name}`}
                                  onClick={() => handleOpenExportModal(imageFile)}
                                  className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-emerald-100 hover:text-emerald-600"
                                >
                                  <LuDownload className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-inter">Download</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Delete ${imageFile.name}`}
                                  onClick={() => handleOpenDeleteModal(imageFile)}
                                  className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-rose-100 hover:text-rose-600"
                                >
                                  <LuTrash2 className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-inter">Delete</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {sortedFiles.length >= LG_GRID_LIMIT && (
                      <motion.div
                        key={`more-images-lg-${sortOption}`}
                        {...motionItemProps}
                        onClick={() => handleOpenModal(sortedFiles[LG_GRID_LIMIT - 1].id)}
                        className="font-inter group relative flex aspect-square cursor-pointer flex-col overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 transition-colors duration-300 ease-in-out hover:border-emerald-300 hover:bg-emerald-50 md:rounded-2xl lg:rounded-3xl"
                      >
                        <Image
                          src={`${sortedFiles[LG_GRID_LIMIT - 1].url}?v=${
                            sortedFiles[LG_GRID_LIMIT - 1].version
                          }`}
                          alt={`More images`}
                          fill
                          className={cn(
                            "object-cover transition-transform duration-300 group-hover:scale-105",
                            sortedFiles.length > LG_GRID_LIMIT && "blur-sm"
                          )}
                          sizes="(max-width: 1024px) 33vw, 20vw"
                        />
                        {sortedFiles.length > LG_GRID_LIMIT && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-3xl font-bold text-white">
                            +{sortedFiles.length - (LG_GRID_LIMIT - 1)}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Medium Screen Layout */}
                <div className="hidden grid-cols-4 gap-3 md:grid lg:hidden">
                  <AnimatePresence mode="wait">
                    {sortedFiles.slice(0, MD_GRID_LIMIT - 1).map((imageFile) => (
                      <motion.div
                        key={`${sortOption}-${imageFile.id}`}
                        {...motionItemProps}
                        className="font-inter group relative flex aspect-square flex-col overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 transition-colors duration-300 ease-in-out hover:border-emerald-300 hover:bg-emerald-50 md:rounded-2xl lg:rounded-3xl"
                      >
                        <div
                          className="min-h-0 flex-1 cursor-pointer"
                          onClick={() => handleOpenModal(imageFile.id)}
                        >
                          <Thumbnail imageFile={imageFile} className="h-full w-full" />
                        </div>
                        <div className="flex w-full flex-col items-center justify-center p-1">
                          <div className="my-1 flex flex-shrink-0 items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`View ${imageFile.name}`}
                                  onClick={() => handleOpenModal(imageFile.id)}
                                  className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-amber-100 hover:text-amber-600"
                                >
                                  <MdOutlineRemoveRedEye className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-inter">View</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Download ${imageFile.name}`}
                                  onClick={() => handleOpenExportModal(imageFile)}
                                  className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-emerald-100 hover:text-emerald-600"
                                >
                                  <LuDownload className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-inter">Download</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Delete ${imageFile.name}`}
                                  onClick={() => handleOpenDeleteModal(imageFile)}
                                  className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-rose-100 hover:text-rose-600"
                                >
                                  <LuTrash2 className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-inter">Delete</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {sortedFiles.length >= MD_GRID_LIMIT && (
                      <motion.div
                        key={`more-images-md-${sortOption}`}
                        {...motionItemProps}
                        onClick={() => handleOpenModal(sortedFiles[MD_GRID_LIMIT - 1].id)}
                        className="font-inter group relative flex aspect-square cursor-pointer flex-col overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 transition-colors duration-300 ease-in-out hover:border-emerald-300 hover:bg-emerald-50 md:rounded-2xl lg:rounded-3xl"
                      >
                        <Image
                          src={`${sortedFiles[MD_GRID_LIMIT - 1].url}?v=${
                            sortedFiles[MD_GRID_LIMIT - 1].version
                          }`}
                          alt={`More images`}
                          fill
                          className={cn(
                            "object-cover transition-transform duration-300 group-hover:scale-105",
                            sortedFiles.length > MD_GRID_LIMIT && "blur-sm"
                          )}
                          sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 20vw"
                        />
                        {sortedFiles.length > MD_GRID_LIMIT && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-3xl font-bold text-white">
                            +{sortedFiles.length - (MD_GRID_LIMIT - 1)}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Small Screen Layout */}
                <div className="grid grid-cols-2 gap-3 md:hidden">
                  <AnimatePresence mode="wait">
                    {sortedFiles.slice(0, SM_GRID_LIMIT - 1).map((imageFile) => (
                      <motion.div
                        key={`${sortOption}-${imageFile.id}`}
                        {...motionItemProps}
                        className="font-inter group relative flex aspect-square flex-col overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 transition-colors duration-300 ease-in-out hover:border-emerald-300 hover:bg-emerald-50 md:rounded-2xl lg:rounded-3xl"
                      >
                        <div
                          className="min-h-0 flex-1 cursor-pointer"
                          onClick={() => handleOpenModal(imageFile.id)}
                        >
                          <Thumbnail imageFile={imageFile} className="h-full w-full" />
                        </div>
                        <div className="flex w-full flex-col items-center justify-center p-1">
                          <div className="my-1 flex flex-shrink-0 items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`View ${imageFile.name}`}
                                  onClick={() => handleOpenModal(imageFile.id)}
                                  className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-amber-100 hover:text-amber-600"
                                >
                                  <MdOutlineRemoveRedEye className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-inter">View</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Download ${imageFile.name}`}
                                  onClick={() => handleOpenExportModal(imageFile)}
                                  className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-emerald-100 hover:text-emerald-600"
                                >
                                  <LuDownload className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-inter">Download</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Delete ${imageFile.name}`}
                                  onClick={() => handleOpenDeleteModal(imageFile)}
                                  className="h-8 w-8 flex-shrink-0 cursor-pointer text-slate-500 transition-colors duration-300 ease-in-out hover:bg-rose-100 hover:text-rose-600"
                                >
                                  <LuTrash2 className="h-5 w-5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-inter">Delete</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    {sortedFiles.length >= SM_GRID_LIMIT && (
                      <motion.div
                        key={`more-images-sm-${sortOption}`}
                        {...motionItemProps}
                        onClick={() => handleOpenModal(sortedFiles[SM_GRID_LIMIT - 1].id)}
                        className="font-inter group relative flex aspect-square cursor-pointer flex-col overflow-hidden rounded-xl border-2 border-slate-200 bg-slate-50 transition-colors duration-300 ease-in-out hover:border-emerald-300 hover:bg-emerald-50 md:rounded-2xl lg:rounded-3xl"
                      >
                        <Image
                          src={`${sortedFiles[SM_GRID_LIMIT - 1].url}?v=${
                            sortedFiles[SM_GRID_LIMIT - 1].version
                          }`}
                          alt={`More images`}
                          fill
                          className={cn(
                            "object-cover transition-transform duration-300 group-hover:scale-105",
                            sortedFiles.length > SM_GRID_LIMIT && "blur-sm"
                          )}
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                        {sortedFiles.length > SM_GRID_LIMIT && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-3xl font-bold text-white">
                            +{sortedFiles.length - (SM_GRID_LIMIT - 1)}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
      </TooltipProvider>

      {/* The preview modal is rendered here, controlled by state. */}
      <ResultsImagesModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        image={selectedImage}
        images={sortedFiles}
        onNext={handleNextImage}
        onPrevious={handlePreviousImage}
        onSelectImage={handleSelectImage}
        onRename={handleRenameImage}
      />

      {/* The export image modal is rendered here, controlled by its own state. */}
      <ExportImageModal
        isOpen={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        image={imageToExport}
      />

      {/* The delete image modal, rendered here and controlled by its own state. */}
      <DeleteImageModal
        isOpen={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        imageName={imageToDelete?.name ?? null}
      />
    </>
  );
};
