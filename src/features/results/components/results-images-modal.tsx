"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AiOutlineSave } from "react-icons/ai";
import { GoPencil } from "react-icons/go";
import {
  LuChevronLeft,
  LuChevronRight,
  LuDownload,
  LuFocus,
  LuLoaderCircle,
  LuX,
  LuZoomIn,
  LuZoomOut,
} from "react-icons/lu";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, formatBytes } from "@/lib/utils";

/**
 * The shape of the image data object used within this component and its parent.
 */
interface ImageFile {
  id: string;
  name: string;
  url: string;
  size: number;
  dateUploaded: Date;
}

/**
 * Framer Motion variants for the main dialog container.
 * This orchestrates the animation of its children with a staggered effect.
 */
const dialogContentVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.1,
      staggerChildren: 0.15,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
    },
  },
};

/**
 * Framer Motion variants for individual animated items within the dialog.
 * This creates the "slide-up and fade-in" effect.
 */
const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: {
      type: "spring",
      damping: 20,
      stiffness: 150,
    },
  },
  exit: {
    y: 20,
    opacity: 0,
    transition: {
      duration: 0.15,
    },
  },
};

/**
 * A thumbnail component for the preview modal, displaying an image from the list.
 * It highlights the currently active image and allows switching to it on click.
 */
const PreviewThumbnail = ({
  imageFile,
  onClick,
  isActive,
  isMobile,
}: {
  // The image file to be displayed.
  imageFile: ImageFile;
  // Callback function to trigger when the thumbnail is clicked.
  onClick: () => void;
  // A boolean to indicate if this thumbnail represents the currently active image.
  isActive: boolean;
  // A boolean to determine if the component should render in its mobile variant.
  isMobile: boolean;
}) => {
  // Directly use the URL from the prop, as it's already provided.
  const previewUrl = imageFile.url;

  if (!previewUrl) {
    return (
      <div
        className={cn(
          "h-16 w-16 flex-shrink-0 animate-pulse rounded-lg",
          isMobile ? "bg-slate-800" : "bg-slate-200"
        )}
      />
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "tween", duration: 0.4, ease: "easeInOut" }}
      className="relative h-16 w-16 flex-shrink-0"
    >
      <button
        onClick={onClick}
        className={cn(
          "h-full w-full cursor-pointer rounded-md transition-all duration-300 focus:outline-none disabled:cursor-default",
          // Desktop-specific styles for the thumbnail outline.
          !isMobile && [
            "ring-offset-2 focus-visible:ring-2 focus-visible:ring-emerald-500",
            isActive && "ring-offset-background ring-2 ring-emerald-500 ring-offset-2",
          ],
          // Mobile-specific styles for the thumbnail outline.
          isMobile && [
            "ring-2",
            isActive ? "ring-amber-400" : "ring-emerald-500",
            "focus-visible:ring-amber-400",
          ]
        )}
        aria-label={`View ${imageFile.name}`}
        disabled={isActive}
      >
        <Image
          src={previewUrl}
          alt={`Thumbnail of ${imageFile.name}`}
          fill
          className="rounded-lg object-cover"
          sizes="64px"
        />
      </button>
    </motion.div>
  );
};

interface ResultsImagesModalProps {
  /**
   * The image to be displayed in the modal. If null, the modal is not rendered.
   */
  image: ImageFile | null;
  /**
   * The complete, sorted list of images to allow for navigation and thumbnail display.
   */
  images: ImageFile[];
  /**
   * Controls the visibility of the modal.
   */
  isOpen: boolean;
  /**
   * Callback function to be invoked when the modal is requested to be closed.
   */
  onClose: () => void;
  /**
   * Callback function to navigate to the next image in the sequence.
   */
  onNext?: () => void;
  /**
   * Callback function to navigate to the previous image in the sequence.
   */
  onPrevious?: () => void;
  /**
   * Callback function to jump to a specific image by its ID.
   */
  onSelectImage?: (imageId: string) => void;
  /**
   * Callback to handle the rename action. The modal will manage the UI state,
   * while the parent component handles the async logic.
   */
  onRename: (imageId: string, newName: string) => Promise<void>;
}

/**
 * Renders an interactive modal for previewing a result image.
 * It features responsive layouts, pan-and-zoom functionality, and renaming.
 */
export const ResultsImagesModal = ({
  image,
  images,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  onSelectImage,
  onRename,
}: ResultsImagesModalProps) => {
  // State to manage the currently displayed image within the modal.
  const [activeImage, setActiveImage] = useState<ImageFile | null>(image);
  // State to store the dimensions of the image.
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  // State for rename functionality.
  const [isRenaming, setIsRenaming] = useState(false);
  const [isSavingRename, setIsSavingRename] = useState(false);
  const [isNameDirty, setIsNameDirty] = useState(false);
  const [fileNameBase, setFileNameBase] = useState("");
  const [fileExtension, setFileExtension] = useState("");
  const [displayFileName, setDisplayFileName] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);
  // Hook to determine if the device is mobile for responsive rendering.
  const isMobile = useIsMobile();

  /**
   * Memoized index of the currently active image within the sorted list.
   * This is crucial for determining navigation capabilities (next/previous).
   */
  const currentIndex = useMemo(() => {
    if (!activeImage) return -1;
    return images.findIndex((f) => f.id === activeImage.id);
  }, [activeImage, images]);

  /**
   * Determines if a "next" image is available for navigation.
   */
  const hasNext = useMemo(() => {
    if (currentIndex === -1) return false;
    return currentIndex < images.length - 1;
  }, [currentIndex, images.length]);

  /**
   * Determines if a "previous" image is available for navigation.
   */
  const hasPrevious = useMemo(() => {
    return currentIndex > 0;
  }, [currentIndex]);

  /**
   * Effect to synchronize the internal `activeImage` state with the `image` prop.
   */
  useEffect(() => {
    setActiveImage(image);
  }, [image]);

  /**
   * Effect to reset the component's local state when a new image is shown.
   */
  useEffect(() => {
    if (activeImage) {
      // Parse file name for editing.
      const name = activeImage.name;
      const parts = name.split(".");
      const extension = parts.pop() ?? "";
      const nameBase = parts.join(".");

      setFileNameBase(nameBase);
      setFileExtension(extension);
      setDisplayFileName(name);

      // Reset other states.
      setIsRenaming(false);
      setIsSavingRename(false);
      setIsNameDirty(false);
    }
  }, [activeImage, isOpen]);

  /**
   * Effect to automatically focus and select the text in the rename input.
   */
  useEffect(() => {
    if (isRenaming && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isRenaming]);

  /**
   * Effect to load the image and extract its natural dimensions for display.
   */
  useEffect(() => {
    if (!activeImage?.url) {
      setImageDimensions(null);
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      setImageDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.src = activeImage.url;
  }, [activeImage]);

  /**
   * Handles changes to the file name input and marks it as dirty.
   */
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileNameBase(e.target.value);
    if (!isNameDirty) {
      setIsNameDirty(true);
    }
  };

  /**
   * Handles saving the new name by calling the `onRename` prop.
   */
  const handleSaveRename = async () => {
    if (!activeImage || isSavingRename || !isNameDirty) return;

    const originalNameBase = activeImage.name.split(".").slice(0, -1).join(".");
    const newNameBase = fileNameBase.trim();

    // Do nothing if name is empty or unchanged.
    if (!newNameBase || newNameBase === originalNameBase) {
      setIsRenaming(false);
      setFileNameBase(originalNameBase);
      setIsNameDirty(false);
      return;
    }

    setIsSavingRename(true);
    const newName = `${newNameBase}.${fileExtension}`;

    try {
      await onRename(activeImage.id, newName);
      setDisplayFileName(newName);
      setIsNameDirty(false);
    } catch (error) {
      console.error("Failed to rename image:", error);
      setFileNameBase(originalNameBase);
    } finally {
      setIsSavingRename(false);
      setIsRenaming(false);
    }
  };

  /**
   * Handles the download action by creating a temporary link.
   */
  const handleDownload = () => {
    if (!activeImage?.url) return;

    fetch(activeImage.url)
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error("Network response error"))))
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = displayFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        toast.error("Failed to download image.");
      });
  };

  // Guard clause to prevent rendering if the image is not available or the mobile hook hasn't run.
  if (activeImage === null || isMobile === undefined) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent
            className={cn(
              "font-inter flex flex-col p-0",
              isMobile
                ? "h-dvh w-screen max-w-none rounded-none border-none bg-black"
                : "rounded-3xl sm:max-w-2xl"
            )}
            onInteractOutside={(e) => {
              if (isMobile) e.preventDefault();
              if (isRenaming) handleSaveRename();
            }}
          >
            {/* AnimatePresence with a unique key for the main content div to trigger animations on image change. */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeImage.id}
                className={cn("flex h-full w-full flex-col", isMobile && "relative")}
                variants={dialogContentVariants}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <TooltipProvider delayDuration={300}>
                  {/* A consolidated header for the mobile view. */}
                  {isMobile && (
                    <motion.div
                      variants={itemVariants}
                      className="absolute top-4 right-4 left-4 z-20 flex items-center justify-between gap-4 rounded-lg bg-emerald-600/80 p-3 shadow-lg backdrop-blur-sm"
                    >
                      <div className="min-w-0 flex-grow">
                        {isRenaming ? (
                          <Input
                            ref={titleInputRef}
                            value={fileNameBase}
                            onChange={handleNameChange}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveRename()}
                            onBlur={() => setIsRenaming(false)}
                            className="h-auto w-full truncate border-none bg-transparent p-0 text-lg font-bold text-white shadow-none placeholder:text-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                        ) : (
                          <h2 className="font-plus-jakarta-sans truncate text-lg font-bold text-white">
                            {displayFileName}
                          </h2>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 items-center">
                        <Button
                          variant="ghost"
                          onClick={() => setIsRenaming(true)}
                          disabled={isRenaming || isSavingRename}
                          aria-label="Rename image"
                          className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
                        >
                          {/* Removed loading spinner from this button */}
                          <GoPencil className="!h-5 !w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={handleSaveRename}
                          disabled={!isNameDirty || isSavingRename}
                          aria-label="Save"
                          className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
                        >
                          {isSavingRename ? (
                            <LuLoaderCircle className="h-5 w-5 animate-spin" />
                          ) : (
                            <AiOutlineSave className="!h-5 !w-5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={handleDownload}
                          aria-label="Download"
                          className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200"
                        >
                          <LuDownload className="!h-5 !w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={onClose}
                          className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200"
                          aria-label="Close"
                        >
                          <LuX className="h-5 w-5" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* The main dialog header, visible on desktop and used for accessibility on mobile. */}
                  <motion.div variants={itemVariants} className="px-6 pt-0 pb-0 md:pt-6">
                    <DialogHeader className={cn(isMobile && "sr-only")}>
                      {isRenaming ? (
                        <Input
                          ref={titleInputRef}
                          value={fileNameBase}
                          onChange={handleNameChange}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename();
                            if (e.key === "Escape") setIsRenaming(false);
                          }}
                          onBlur={() => setIsRenaming(false)}
                          className="font-plus-jakarta-sans mx-auto h-auto w-full max-w-sm truncate border-none bg-transparent p-0 text-center text-xl font-bold text-emerald-600 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 md:max-w-md md:text-2xl"
                        />
                      ) : (
                        <DialogTitle className="font-plus-jakarta-sans mx-auto w-full max-w-sm truncate text-center text-xl font-bold text-emerald-600 md:max-w-md md:text-2xl">
                          {displayFileName}
                        </DialogTitle>
                      )}
                      <DialogDescription className="font-inter flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-sm text-slate-600">
                        <span>{new Date(activeImage.dateUploaded).toLocaleDateString()}</span>
                        {imageDimensions && (
                          <>
                            <span className="hidden text-slate-400 sm:inline">•</span>
                            <span>
                              {imageDimensions.width} x {imageDimensions.height}
                            </span>
                          </>
                        )}
                        <span className="hidden text-slate-400 sm:inline">•</span>
                        <span>{formatBytes(activeImage.size)}</span>
                      </DialogDescription>
                    </DialogHeader>
                  </motion.div>

                  {/* The main image preview area, wrapped in a pan-and-zoom component. */}
                  {activeImage.url && (
                    <TransformWrapper
                      key={activeImage.id}
                      initialScale={1}
                      minScale={1}
                      maxScale={32}
                      limitToBounds={true}
                      wheel={{ step: 0.5 }}
                    >
                      {({ zoomIn, zoomOut, resetTransform, centerView }) => (
                        <>
                          <motion.div
                            variants={itemVariants}
                            className={cn(
                              "relative w-full cursor-grab overflow-hidden",
                              isMobile ? "flex-grow" : "mt-2 h-96 px-6"
                            )}
                          >
                            {/* Desktop-only action buttons. */}
                            {!isMobile && (
                              <div className="absolute top-2 right-8 z-10 flex w-auto items-center justify-around gap-2 rounded-lg bg-emerald-600/80 px-2 py-1 shadow-lg backdrop-blur-sm">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      onClick={() => setIsRenaming(true)}
                                      disabled={isRenaming || isSavingRename}
                                      aria-label="Rename image"
                                      className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
                                    >
                                      {/* Removed loading spinner from this button */}
                                      <GoPencil className="!h-5 !w-5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-inter">Rename</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      onClick={handleSaveRename}
                                      disabled={!isNameDirty || isSavingRename}
                                      aria-label="Save"
                                      className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
                                    >
                                      {isSavingRename ? (
                                        <LuLoaderCircle className="h-5 w-5 animate-spin" />
                                      ) : (
                                        <AiOutlineSave className="!h-5 !w-5" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-inter">Save changes</p>
                                  </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      onClick={handleDownload}
                                      aria-label="Download"
                                      className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200"
                                    >
                                      <LuDownload className="!h-5 !w-5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-inter">Download</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            )}

                            {/* The interactive image component itself. */}
                            <TransformComponent
                              wrapperClass={cn(
                                "!w-full !h-full",
                                !isMobile && "bg-slate-100 rounded-2xl"
                              )}
                              contentClass="!w-full !h-full flex items-center justify-center"
                            >
                              <Image
                                key={activeImage.url}
                                src={activeImage.url}
                                alt={`Preview of ${displayFileName}`}
                                fill
                                className="object-contain"
                                sizes="(max-width: 768px) 100vw, 560px"
                              />
                            </TransformComponent>
                          </motion.div>

                          {/* Displays a scrollable row of all image thumbnails. */}
                          {images.length > 1 && (
                            <motion.div
                              variants={itemVariants}
                              className={cn(
                                "shrink-0",
                                isMobile
                                  ? "absolute bottom-[88px] left-0 z-10 w-full px-4"
                                  : "px-6 pt-2"
                              )}
                            >
                              <ScrollArea className="w-full whitespace-nowrap">
                                <div className="flex w-max space-x-4 p-3">
                                  <AnimatePresence>
                                    {images.map((img) => (
                                      <PreviewThumbnail
                                        key={img.id}
                                        imageFile={img}
                                        isActive={img.id === activeImage.id}
                                        isMobile={isMobile}
                                        onClick={() => onSelectImage?.(img.id)}
                                      />
                                    ))}
                                  </AnimatePresence>
                                </div>
                                <ScrollBar orientation="horizontal" />
                              </ScrollArea>
                            </motion.div>
                          )}

                          {/* A shared set of controls for pan-and-zoom functionality. */}
                          <motion.div
                            variants={itemVariants}
                            className={cn(
                              isMobile
                                ? "absolute bottom-0 left-0 z-10 w-full"
                                : "shrink-0 px-6 pt-0 pb-6 md:pt-4"
                            )}
                          >
                            <DialogFooter
                              className={cn(
                                "flex-row items-center !justify-between",
                                isMobile && "bg-black/75 px-2 py-4"
                              )}
                            >
                              {/* Button to navigate to the previous image. */}
                              {hasPrevious ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      onClick={onPrevious}
                                      aria-label="Previous image"
                                      className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 md:hover:bg-amber-100 md:hover:text-amber-600"
                                    >
                                      <LuChevronLeft className="!h-6 !w-6" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-inter">Previous</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <div className="h-10 w-10" />
                              )}

                              {/* Group for main view controls */}
                              <div className="flex flex-row items-center justify-center">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      onClick={() => zoomOut()}
                                      aria-label="Zoom out"
                                      className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 md:hover:bg-amber-100 md:hover:text-amber-600"
                                    >
                                      <LuZoomOut className="!h-6 !w-6" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-inter">Zoom out</p>
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      onClick={() => {
                                        resetTransform();
                                        centerView();
                                      }}
                                      aria-label="Reset view"
                                      className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 md:hover:bg-amber-100 md:hover:text-amber-600"
                                    >
                                      <LuFocus className="!h-6 !w-6" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-inter">Reset view</p>
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      onClick={() => zoomIn()}
                                      aria-label="Zoom in"
                                      className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 md:hover:bg-amber-100 md:hover:text-amber-600"
                                    >
                                      <LuZoomIn className="!h-6 !w-6" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-inter">Zoom in</p>
                                  </TooltipContent>
                                </Tooltip>
                              </div>

                              {/* Button to navigate to the next image. */}
                              {hasNext ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      onClick={onNext}
                                      aria-label="Next image"
                                      className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 md:hover:bg-amber-100 md:hover:text-amber-600"
                                    >
                                      <LuChevronRight className="!h-6 !w-6" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="font-inter">Next</p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <div className="h-10 w-10" />
                              )}
                            </DialogFooter>
                          </motion.div>
                        </>
                      )}
                    </TransformWrapper>
                  )}
                </TooltipProvider>
              </motion.div>
            </AnimatePresence>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
};
