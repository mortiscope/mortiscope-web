"use client";

import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AiOutlineSave } from "react-icons/ai";
import { GoPencil } from "react-icons/go";
import {
  LuDownload,
  LuFocus,
  LuLoaderCircle,
  LuRefreshCw,
  LuTrash2,
  LuX,
  LuZoomIn,
  LuZoomOut,
} from "react-icons/lu";
import { TbRotate } from "react-icons/tb";
import {
  type ReactZoomPanPinchRef,
  type ReactZoomPanPinchState,
  TransformComponent,
  TransformWrapper,
} from "react-zoom-pan-pinch";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { createUpload } from "@/features/analyze/actions/create-upload";
import { deleteUpload } from "@/features/analyze/actions/delete-upload";
import { renameUpload } from "@/features/analyze/actions/rename-upload";
import { UploadPreviewMinimap } from "@/features/analyze/components/upload-preview-minimap";
import { type UploadableFile, useAnalyzeStore } from "@/features/analyze/store/analyze-store";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn, formatBytes } from "@/lib/utils";

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
 * Dimensions of the content and wrapper for calculating the minimap viewport.
 */
interface ViewingBox {
  content?: { width: number; height: number };
  wrapper?: { width: number; height: number };
}

interface UploadPreviewModalProps {
  /**
   * The file to be displayed in the modal. If null, the modal is not rendered.
   */
  file: UploadableFile | null;
  /**
   * Controls the visibility of the modal.
   */
  isOpen: boolean;
  /**
   * Callback function to be invoked when the modal is requested to be closed.
   */
  onClose: () => void;
}

/**
 * Renders a highly interactive modal for previewing, editing, and managing an uploaded image file.
 * It features responsive layouts for mobile and desktop, and uses client-side canvas manipulation for edits.
 */
export const UploadPreviewModal = ({ file, isOpen, onClose }: UploadPreviewModalProps) => {
  // Generate a temporary URL for the image preview.
  const [previewUrl, setPreviewUrl] = useState<string>("");
  // State to store the dimensions of the image.
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  // State for the visual rotation of the image preview.
  const [rotation, setRotation] = useState(0);
  // State to track if the image has been rotated, enabling the save button.
  const [isRotationDirty, setIsRotationDirty] = useState(false);
  // State to track if the name has been changed, enabling the save button.
  const [isNameDirty, setIsNameDirty] = useState(false);
  // State to track the saving process and provide user feedback.
  const [isSaving, setIsSaving] = useState(false);
  // State to track the deletion process.
  const [isDeleting, setIsDeleting] = useState(false);
  // State to control the rename input visibility.
  const [isRenaming, setIsRenaming] = useState(false);
  // State to hold the value of the file name (without extension) during editing.
  const [fileNameBase, setFileNameBase] = useState("");
  // State to hold the file extension.
  const [fileExtension, setFileExtension] = useState("");
  // State to immediately reflect the new name in the UI after a successful save.
  const [displayFileName, setDisplayFileName] = useState("");
  // State to hold the pan-and-zoom transformation data for the minimap.
  const [transformState, setTransformState] = useState<ReactZoomPanPinchState>({
    scale: 1,
    positionX: 0,
    positionY: 0,
    previousScale: 1,
  });
  // State to hold the dynamic dimensions of the pan-zoom container for accurate minimap calculation.
  const [viewingBox, setViewingBox] = useState<ViewingBox>({});
  // Ref for the rename input to programmatically focus it.
  const titleInputRef = useRef<HTMLInputElement>(null);
  // Hook to determine if the device is mobile for responsive rendering.
  const isMobile = useIsMobile();

  // Hooks to interact with the global `analyze` store.
  const updateFile = useAnalyzeStore((state) => state.updateFile);
  const removeFile = useAnalyzeStore((state) => state.removeFile);
  const setUploadStatus = useAnalyzeStore((state) => state.setUploadStatus);
  const setUploadKey = useAnalyzeStore((state) => state.setUploadKey);

  // TanStack Query mutation for generating a presigned URL (for rotated image re-upload).
  const presignedUrlMutation = useMutation({
    mutationFn: createUpload,
  });

  // TanStack Query mutation for renaming the file on the server.
  const renameMutation = useMutation({
    mutationFn: renameUpload,
  });

  // TanStack Query mutation for deleting the file on the server.
  const deleteMutation = useMutation({
    mutationFn: deleteUpload,
  });

  /**
   * Effect to reset the component's local state whenever a new file is passed in or the modal is re-opened.
   */
  useEffect(() => {
    if (file) {
      const name = file.file.name;
      const parts = name.split(".");
      const extension = parts.pop() ?? "";
      const nameBase = parts.join(".");

      setFileNameBase(nameBase);
      setFileExtension(extension);
      setDisplayFileName(name);

      setRotation(0);
      setIsRotationDirty(false);
      setIsNameDirty(false);
      setIsSaving(false);
      setIsDeleting(false);
      setIsRenaming(false);
      // Reset transform state for the new file
      setTransformState({ scale: 1, positionX: 0, positionY: 0, previousScale: 1 });
      setViewingBox({});
    }
  }, [file, isOpen]);

  /**
   * Effect to automatically focus and select the text in the rename input when the `isRenaming` state becomes true.
   */
  useEffect(() => {
    if (isRenaming && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isRenaming]);

  /**
   * Effect to create and manage a temporary object URL for the image preview.
   * It also loads the image to extract its natural dimensions for display.
   * The cleanup function revokes the URL to prevent memory leaks.
   */
  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      setImageDimensions(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file.file);
    setPreviewUrl(objectUrl);

    const image = new window.Image();
    image.onload = () => {
      setImageDimensions({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };
    image.src = objectUrl;

    // Cleanup function to revoke the object URL when the component unmounts or the file changes.
    return () => {
      URL.revokeObjectURL(objectUrl);
      image.onload = null;
    };
  }, [file]);

  /**
   * Rotates the image preview by 90 degrees clockwise and marks the rotation as a "dirty" change.
   */
  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
    setIsRotationDirty(true);
  };

  /**
   * Handles changes to the file name input and marks the name as a "dirty" change.
   */
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileNameBase(e.target.value);
    if (!isNameDirty) {
      setIsNameDirty(true);
    }
  };

  /**
   * A comprehensive function to save all pending changes (name and/or rotation) to the file.
   * It handles renaming on the server and client-side image processing for rotation.
   */
  const handleSave = async () => {
    const currentFileState = useAnalyzeStore.getState().data.files.find((f) => f.id === file?.id);
    if (!currentFileState || (!isNameDirty && !isRotationDirty) || isSaving || isDeleting) {
      return;
    }

    setIsSaving(true);
    setUploadStatus(currentFileState.id, "uploading");

    let finalFile = currentFileState.file;
    let finalKey = currentFileState.key;

    // Handle Rename Operation
    if (isNameDirty) {
      if (!finalKey) {
        toast.error("Cannot rename file: S3 key is missing.");
        setIsSaving(false);
        setUploadStatus(currentFileState.id, "error");
        return;
      }
      const newName = `${fileNameBase.trim()}.${fileExtension}`;
      try {
        const result = await renameMutation.mutateAsync({
          oldKey: finalKey,
          newFileName: newName,
        });

        if (!result.success || !result.data) {
          throw new Error(result.error || "Rename failed on server.");
        }

        finalFile = new File([finalFile], newName, { type: finalFile.type });
        finalKey = result.data.newKey;
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not rename file.");
        setIsSaving(false);
        setUploadStatus(currentFileState.id, "error");
        return;
      }
    }

    // Handle Rotation Operation
    if (isRotationDirty) {
      if (!finalKey) {
        toast.error("Cannot save rotation: S3 key is missing.");
        setIsSaving(false);
        setUploadStatus(currentFileState.id, "error");
        return;
      }
      const image = new window.Image();
      const url = URL.createObjectURL(finalFile);
      image.crossOrigin = "anonymous";
      try {
        // Process the image on a canvas to apply the rotation.
        const rotatedBlob = await new Promise<Blob | null>((resolve) => {
          image.onload = () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(null);

            // Swap dimensions for 90/270 degree rotations.
            if (rotation === 90 || rotation === 270) {
              canvas.width = image.naturalHeight;
              canvas.height = image.naturalWidth;
            } else {
              canvas.width = image.naturalWidth;
              canvas.height = image.naturalHeight;
            }
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
            canvas.toBlob(resolve, finalFile.type, 1.0);
          };
          image.onerror = () => resolve(null);
          image.src = url;
        });

        if (!rotatedBlob) throw new Error("Could not process image for rotation.");

        finalFile = new File([rotatedBlob], finalFile.name, { type: finalFile.type });

        // Get a new presigned URL to re-upload the modified image.
        const result = await presignedUrlMutation.mutateAsync({
          fileName: finalFile.name,
          fileType: finalFile.type,
          fileSize: finalFile.size,
          key: finalKey,
        });

        if (!result.success || !result.data) throw new Error("Failed to prepare re-upload.");

        // Upload the new, rotated file to S3.
        const s3Response = await fetch(result.data.url, { method: "PUT", body: finalFile });
        if (!s3Response.ok) throw new Error("Failed to upload rotated image.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not save rotation.");
        setIsSaving(false);
        setUploadStatus(currentFileState.id, "error");
        return;
      }
    }

    // Finalize State
    const newFileObject = new File([finalFile], finalFile.name, { type: finalFile.type });
    updateFile(currentFileState.id, newFileObject);
    if (finalKey) setUploadKey(currentFileState.id, finalKey);
    setUploadStatus(currentFileState.id, "success");
    setDisplayFileName(newFileObject.name);
    toast.success(`${newFileObject.name} changes saved.`);

    // Reset all dirty and saving flags.
    setIsNameDirty(false);
    setIsRotationDirty(false);
    setIsSaving(false);
    setIsRenaming(false);
  };

  /**
   * Handles the deletion of the file from both the client state and the server.
   * It shows appropriate user feedback via toasts and closes the modal on success.
   */
  const handleDelete = async () => {
    if (!file || isDeleting || isSaving) {
      return;
    }

    // If there's no key, the file was likely never successfully uploaded.
    if (!file.key) {
      removeFile(file.id);
      toast.success(`${file.file.name} removed.`);
      onClose();
      return;
    }

    setIsDeleting(true);

    try {
      const result = await deleteMutation.mutateAsync({ key: file.key });

      if (!result.success) {
        throw new Error(result.error || "Failed to delete file on server.");
      }

      // On successful deletion from S3, remove the file from the local Zustand store.
      removeFile(file.id);
      toast.success(`${file.file.name} deleted successfully.`);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete file.");
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handles the download action by applying the current rotation to the image via a canvas.
   */
  const handleDownload = () => {
    if (!file) return;

    const image = new window.Image();
    const url = URL.createObjectURL(file.file);
    image.crossOrigin = "anonymous";

    image.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        toast.error("Could not process image for download.");
        URL.revokeObjectURL(url);
        return;
      }

      // Apply rotation to the canvas before drawing.
      if (rotation === 90 || rotation === 270) {
        canvas.width = image.naturalHeight;
        canvas.height = image.naturalWidth;
      } else {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
      }
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

      // Trigger a download of the canvas content.
      const link = document.createElement("a");
      link.href = canvas.toDataURL(file.file.type);
      link.download = file.file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };

    image.onerror = () => {
      toast.error("Failed to load image for download.");
      URL.revokeObjectURL(url);
    };

    image.src = url;
  };

  /**
   * Callback fired on any pan, zoom, or other transform.
   * It updates our local state to reflect the transform and captures container dimensions for the minimap.
   */
  const onTransformed = (
    ref: ReactZoomPanPinchRef,
    state: { scale: number; positionX: number; positionY: number }
  ) => {
    setTransformState((prevState) => ({ ...prevState, ...state }));
    const { contentComponent, wrapperComponent } = ref.instance;
    if (contentComponent && wrapperComponent) {
      setViewingBox({
        content: {
          width: contentComponent.clientWidth,
          height: contentComponent.clientHeight,
        },
        wrapper: {
          width: wrapperComponent.clientWidth,
          height: wrapperComponent.clientHeight,
        },
      });
    }
  };

  // Guard clause to prevent rendering if the file is not available or the mobile hook hasn't run.
  if (file === null || isMobile === undefined) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setIsRenaming(false);
          onClose();
        }
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <DialogContent
            className={cn(
              "font-inter p-0",
              isMobile
                ? "h-dvh w-screen max-w-none rounded-none border-none bg-black"
                : "rounded-3xl sm:max-w-2xl"
            )}
            onInteractOutside={isMobile ? (e) => e.preventDefault() : undefined}
          >
            <motion.div
              className={cn("flex h-full w-full flex-col", isMobile && "relative")}
              variants={dialogContentVariants}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              <TooltipProvider delayDuration={300}>
                {/* A consolidated header for the mobile view, providing key actions in a compact form. */}
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
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              titleInputRef.current?.blur();
                            }
                            if (e.key === "Escape") setIsRenaming(false);
                          }}
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
                        disabled={isRenaming || renameMutation.isPending || isSaving || isDeleting}
                        aria-label="Rename image"
                        className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
                      >
                        {renameMutation.isPending ? (
                          <LuLoaderCircle className="h-5 w-5 animate-spin" />
                        ) : (
                          <GoPencil className="!h-5 !w-5" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleDownload}
                        disabled={isSaving || isDeleting}
                        aria-label="Download"
                        className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
                      >
                        <LuDownload className="!h-5 !w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={handleSave}
                        disabled={(!isRotationDirty && !isNameDirty) || isSaving || isDeleting}
                        aria-label="Save"
                        className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
                      >
                        {isSaving ? (
                          <LuLoaderCircle className="h-5 w-5 animate-spin" />
                        ) : (
                          <AiOutlineSave className="!h-5 !w-5" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        onClick={handleDelete}
                        disabled={isDeleting || isSaving}
                        aria-label="Delete"
                        className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
                      >
                        {isDeleting ? (
                          <LuLoaderCircle className="h-5 w-5 animate-spin" />
                        ) : (
                          <LuTrash2 className="!h-5 !w-5" />
                        )}
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
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
                          if (e.key === "Enter") {
                            e.preventDefault();
                            titleInputRef.current?.blur();
                          }
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
                      <span>{new Date(file.file.lastModified).toLocaleDateString()}</span>
                      {imageDimensions && (
                        <>
                          <span className="hidden text-slate-400 sm:inline">•</span>
                          <span>
                            {imageDimensions.width} x {imageDimensions.height}
                          </span>
                        </>
                      )}
                      <span className="hidden text-slate-400 sm:inline">•</span>
                      <span>{formatBytes(file.file.size)}</span>
                    </DialogDescription>
                  </DialogHeader>
                </motion.div>

                {/* The main image preview area, wrapped in a pan-and-zoom component. */}
                {previewUrl && (
                  <TransformWrapper
                    key={file.id}
                    initialScale={1}
                    minScale={1}
                    maxScale={32}
                    limitToBounds={true}
                    wheel={{ step: 0.5 }}
                    onTransformed={onTransformed}
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
                          {/* Desktop-only action buttons, overlaid on the image preview. */}
                          {!isMobile && (
                            <div className="absolute top-2 right-8 z-10 flex w-44 items-center justify-around rounded-lg bg-emerald-600/80 py-1 shadow-lg backdrop-blur-sm">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    onClick={() => setIsRenaming(true)}
                                    disabled={
                                      isRenaming ||
                                      renameMutation.isPending ||
                                      isSaving ||
                                      isDeleting
                                    }
                                    aria-label="Rename image"
                                    className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
                                  >
                                    {renameMutation.isPending ? (
                                      <LuLoaderCircle className="h-5 w-5 animate-spin" />
                                    ) : (
                                      <GoPencil className="!h-5 !w-5" />
                                    )}
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
                                    onClick={handleDownload}
                                    disabled={isSaving || isDeleting}
                                    aria-label="Download"
                                    className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
                                  >
                                    <LuDownload className="!h-5 !w-5" />
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
                                    onClick={handleSave}
                                    disabled={
                                      (!isRotationDirty && !isNameDirty) || isSaving || isDeleting
                                    }
                                    aria-label="Save"
                                    className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
                                  >
                                    {isSaving ? (
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
                                    onClick={handleDelete}
                                    disabled={isDeleting || isSaving}
                                    aria-label="Delete image"
                                    className="h-8 w-8 cursor-pointer p-0 text-white transition-colors duration-300 ease-in-out hover:bg-transparent hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-white/50"
                                  >
                                    {isDeleting ? (
                                      <LuLoaderCircle className="h-5 w-5 animate-spin" />
                                    ) : (
                                      <LuTrash2 className="!h-5 !w-5" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="font-inter">Delete file</p>
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
                              key={previewUrl}
                              src={previewUrl}
                              alt={`Preview of ${file.file.name}`}
                              fill
                              className="object-contain"
                              style={{ transform: `rotate(${rotation}deg)` }}
                              sizes="(max-width: 768px) 100vw, 560px"
                            />
                          </TransformComponent>

                          {/* The minimap to show the current view context, visible only on desktop. */}
                          {!isMobile && (
                            <UploadPreviewMinimap
                              previewUrl={previewUrl}
                              rotation={rotation}
                              alt={`Minimap preview of ${file.file.name}`}
                              transformState={transformState}
                              viewingBox={viewingBox}
                            />
                          )}
                        </motion.div>

                        {/* A shared set of controls for pan-and-zoom functionality, styled responsively. */}
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
                              "flex-row !justify-center",
                              isMobile && "bg-black/75 py-4"
                            )}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  onClick={() => zoomOut()}
                                  aria-label="Zoom out"
                                  className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 disabled:hover:bg-transparent md:hover:bg-amber-100 md:hover:text-amber-600"
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
                                    setRotation(0);
                                    setIsRotationDirty(false);
                                  }}
                                  aria-label="Reset view"
                                  className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 disabled:hover:bg-transparent md:hover:bg-amber-100 md:hover:text-amber-600"
                                >
                                  <TbRotate className="!h-6 !w-6" />
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
                                  onClick={() => centerView()}
                                  aria-label="Center focus"
                                  className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 disabled:hover:bg-transparent md:hover:bg-amber-100 md:hover:text-amber-600"
                                >
                                  <LuFocus className="!h-6 !w-6" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-inter">Center focus</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  onClick={handleRotate}
                                  disabled={isSaving || isDeleting}
                                  aria-label="Rotate image"
                                  className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 disabled:hover:bg-transparent md:hover:bg-amber-100 md:hover:text-amber-600"
                                >
                                  <LuRefreshCw className="!h-6 !w-6" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-inter">Rotate</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  onClick={() => zoomIn()}
                                  aria-label="Zoom in"
                                  className="h-10 w-10 cursor-pointer rounded-lg p-0 text-emerald-600 transition-all duration-300 ease-in-out hover:bg-transparent hover:text-amber-400 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-rose-300 disabled:hover:bg-transparent md:hover:bg-amber-100 md:hover:text-amber-600"
                                >
                                  <LuZoomIn className="!h-6 !w-6" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="font-inter">Zoom in</p>
                              </TooltipContent>
                            </Tooltip>
                          </DialogFooter>
                        </motion.div>
                      </>
                    )}
                  </TransformWrapper>
                )}
              </TooltipProvider>
            </motion.div>
          </DialogContent>
        )}
      </AnimatePresence>
    </Dialog>
  );
};
