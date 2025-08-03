"use client";

import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useCallback, useEffect, useRef } from "react";
import { type ReactZoomPanPinchRef, TransformWrapper } from "react-zoom-pan-pinch";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { PreviewImageViewer } from "@/features/cases/components/preview-image-viewer";
import { PreviewModalHeader } from "@/features/cases/components/preview-modal-header";
import { PreviewThumbnailList } from "@/features/cases/components/preview-thumbnail-list";
import { PreviewViewControls } from "@/features/cases/components/preview-view-controls";
import { usePreviewModal } from "@/features/images/hooks/use-preview-modal";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the main dialog container.
 * This orchestrates the animation of its children with a staggered effect.
 */
const dialogContentVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

/**
 * Framer Motion variants for individual animated items within the dialog.
 * This creates the "slide-up and fade-in" effect.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
  exit: { y: 20, opacity: 0, transition: { duration: 0.15 } },
};

/**
 * Defines the props for the UploadPreviewModal component.
 */
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
  /**
   * Callback function to navigate to the next file in the sequence.
   */
  onNext?: () => void;
  /**
   * Callback function to navigate to the previous file in the sequence.
   */
  onPrevious?: () => void;
  /**
   * Callback function to jump to a specific file by its ID.
   */
  onSelectFile?: (fileId: string) => void;
}

/**
 * A comprehensive, highly interactive, and responsive modal for previewing and editing uploaded files.
 */
export const UploadPreviewModal = (props: UploadPreviewModalProps) => {
  // Initializes the master hook that provides all state and logic for the modal.
  const {
    activeFile,
    setActiveFile,
    previewUrl,
    imageDimensions,
    rotation,
    isRotationDirty,
    isNameDirty,
    isSaving,
    isDeleting,
    isRenaming,
    setIsRenaming,
    fileNameBase,
    displayFileName,
    transformState,
    setTransformState,
    viewingBox,
    setViewingBox,
    titleInputRef,
    isMobile,
    sortedFiles,
    hasNext,
    hasPrevious,
    renameMutation,
    handleRotate,
    resetRotation,
    handleNameChange,
    handleSave,
    handleDelete,
    handleDownload,
  } = usePreviewModal(props);

  // A ref to access the `react-zoom-pan-pinch` instance for programmatic control.
  const transformRef = useRef<ReactZoomPanPinchRef>(null);

  /**
   * A custom zoom-out handler that prevents the scale from going below 100%.
   */
  const handleZoomOut = useCallback(() => {
    if (!transformRef.current) return;

    const currentScale = transformRef.current.instance.transformState.scale;
    const zoomStep = 0.3;
    const newScale = currentScale - zoomStep;

    // Only allow zoom out if the new scale would be >= 1 (100%).
    if (newScale >= 1) {
      transformRef.current.zoomOut();
    }
    // If the user tries to zoom out below 100%, do nothing.
  }, []);

  /**
   * Resets the image to 100% scale, centers it in the view, and resets client-side rotation.
   */
  const handleResetTransform = useCallback(() => {
    if (!transformRef.current) return;

    // Reset to 100% scale and center the image.
    transformRef.current.setTransform(0, 0, 1);
    resetRotation();
  }, [resetRotation]);

  /**
   * A side effect to auto-adjust the zoom level if rotation causes the scale to drop below 100%.
   * This ensures the image always fills the container after being rotated.
   */
  useEffect(() => {
    if (!transformRef.current || !imageDimensions) return;

    // Ensure scale doesn't go below 100% after rotation.
    const currentScale = transformRef.current.instance.transformState.scale;
    if (currentScale < 1) {
      transformRef.current.setTransform(0, 0, 1);
    }
  }, [rotation, imageDimensions]);

  /**
   * A callback that syncs the `react-zoom-pan-pinch` state with the local state
   * managed by the `usePreviewTransform` hook, which is used for the minimap.
   */
  const onTransformed = (
    ref: ReactZoomPanPinchRef,
    state: { scale: number; positionX: number; positionY: number }
  ) => {
    setTransformState((prevState) => ({ ...prevState, ...state }));
    const { contentComponent, wrapperComponent } = ref.instance;
    if (contentComponent && wrapperComponent) {
      setViewingBox({
        content: { width: contentComponent.clientWidth, height: contentComponent.clientHeight },
        wrapper: { width: wrapperComponent.clientWidth, height: wrapperComponent.clientHeight },
      });
    }
  };

  // Prevents rendering if no file is active or during initial server-side render.
  if (activeFile === null || isMobile === undefined) return null;

  return (
    <Dialog open={props.isOpen} onOpenChange={(open) => !open && props.onClose()}>
      {/* Manages the entry and exit animations of the entire modal. */}
      <AnimatePresence>
        {props.isOpen && (
          <DialogContent
            // Applies responsive styling: fullscreen on mobile, contained on desktop.
            className={cn(
              "font-inter flex flex-col p-0",
              isMobile
                ? "h-dvh w-screen max-w-none rounded-none border-none bg-black"
                : "rounded-3xl sm:max-w-2xl"
            )}
            onInteractOutside={isMobile ? (e) => e.preventDefault() : undefined}
          >
            {/* Manages the transition between different files. */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFile.id}
                className={cn("flex h-full w-full flex-col", isMobile && "relative")}
                variants={dialogContentVariants}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                {/* Provides an accessible title for screen readers without being visually displayed. */}
                <DialogHeader>
                  <VisuallyHidden.Root>
                    <DialogTitle>
                      {activeFile ? `Preview: ${activeFile.name}` : "Image Preview"}
                    </DialogTitle>
                  </VisuallyHidden.Root>
                </DialogHeader>
                {/* Provides tooltips for all child components. */}
                <TooltipProvider delayDuration={300}>
                  <PreviewModalHeader
                    activeFile={activeFile}
                    displayFileName={displayFileName}
                    fileNameBase={fileNameBase}
                    imageDimensions={imageDimensions}
                    isMobile={isMobile}
                    isRenaming={isRenaming}
                    isSaving={isSaving}
                    isDeleting={isDeleting}
                    isNameDirty={isNameDirty}
                    isRotationDirty={isRotationDirty}
                    renameMutationIsPending={renameMutation.isPending}
                    titleInputRef={titleInputRef}
                    variants={itemVariants}
                    onClose={props.onClose}
                    onDelete={handleDelete}
                    onDownload={handleDownload}
                    onNameChange={handleNameChange}
                    onRenameClick={() => setIsRenaming(true)}
                    onSave={handleSave}
                    onSetIsRenaming={setIsRenaming}
                  />
                  {/* The main component from `react-zoom-pan-pinch` that enables interactive panning and zooming. */}
                  {previewUrl && (
                    <TransformWrapper
                      key={activeFile.id}
                      ref={transformRef}
                      initialScale={1}
                      minScale={1}
                      maxScale={32}
                      limitToBounds={true}
                      wheel={{ step: 0.3 }}
                      smooth={true}
                      onTransformed={onTransformed}
                    >
                      {/* Uses a render prop to pass down control functions to child components. */}
                      {({ zoomIn, centerView }) => (
                        <>
                          <PreviewImageViewer
                            activeFile={activeFile}
                            previewUrl={previewUrl}
                            rotation={rotation}
                            isMobile={isMobile}
                            variants={itemVariants}
                            transformState={transformState}
                            viewingBox={viewingBox}
                            isRenaming={isRenaming}
                            renameMutationIsPending={renameMutation.isPending}
                            isSaving={isSaving}
                            isDeleting={isDeleting}
                            isRotationDirty={isRotationDirty}
                            isNameDirty={isNameDirty}
                            onRenameClick={() => setIsRenaming(true)}
                            onDownload={handleDownload}
                            onSave={handleSave}
                            onDelete={handleDelete}
                          />
                          {/* Conditionally renders the thumbnail list for navigation. */}
                          {sortedFiles.length > 1 && (
                            <PreviewThumbnailList
                              sortedFiles={sortedFiles}
                              activeFile={activeFile}
                              isMobile={isMobile}
                              onSelectFile={(file) => {
                                setActiveFile(file);
                                if (props.onSelectFile) props.onSelectFile(file.id);
                              }}
                              variants={itemVariants}
                            />
                          )}
                          <PreviewViewControls
                            isMobile={isMobile}
                            hasPrevious={hasPrevious}
                            hasNext={hasNext}
                            isSaving={isSaving}
                            isDeleting={isDeleting}
                            variants={itemVariants}
                            onPrevious={props.onPrevious}
                            onNext={props.onNext}
                            onZoomIn={zoomIn}
                            onZoomOut={handleZoomOut}
                            onResetTransform={handleResetTransform}
                            onCenterView={centerView}
                            onRotate={handleRotate}
                          />
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
