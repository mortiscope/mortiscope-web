"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useState } from "react";
import {
  type ReactZoomPanPinchRef,
  type ReactZoomPanPinchState,
  TransformWrapper,
} from "react-zoom-pan-pinch";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ResultsImageViewer } from "@/features/images/components/results-image-viewer";
import { ResultsThumbnailList } from "@/features/images/components/results-thumbnail-list";
import {
  type ImageFile,
  useResultsImageViewer,
  type ViewingBox,
} from "@/features/images/hooks/use-results-image-viewer";
import { ResultsModalHeader } from "@/features/results/components/results-modal-header";
import { ResultsViewControls } from "@/features/results/components/results-view-controls";
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
}

export const ResultsImagesModal = (props: ResultsImagesModalProps) => {
  const { image, images, isOpen, onClose, onNext, onPrevious, onSelectImage } = props;
  const {
    activeImage,
    isImageLoaded,
    imageDimensions,
    isMobile,
    imageContainerRef,
    renderedImageStyle,
    hasNext,
    hasPrevious,
  } = useResultsImageViewer({ image, images, isOpen });
  const [transformState, setTransformState] = useState<ReactZoomPanPinchState>({
    scale: 1,
    positionX: 0,
    positionY: 0,
    previousScale: 1,
  });
  // State to hold the dynamic dimensions of the pan-zoom container for accurate minimap calculation.
  const [viewingBox, setViewingBox] = useState<ViewingBox>({});

  /**
   * Callback fired on any pan, zoom, or other transform.
   * It updates local state to reflect the transform and captures container dimensions for the minimap.
   */
  const handleTransformed = (
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

  if (!activeImage || isMobile === undefined) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AnimatePresence>
        {isOpen && (
          <DialogContent
            className={cn(
              "font-inter flex flex-col p-0",
              isMobile
                ? "h-dvh w-screen max-w-none rounded-none border-none bg-black"
                : "rounded-4xl sm:max-w-2xl"
            )}
            onInteractOutside={isMobile ? (e) => e.preventDefault() : undefined}
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
                  <ResultsModalHeader
                    activeImage={activeImage}
                    imageDimensions={imageDimensions}
                    isMobile={isMobile}
                    onClose={onClose}
                    variants={itemVariants}
                  />
                  {activeImage.url && (
                    <TransformWrapper
                      key={activeImage.id}
                      initialScale={1}
                      minScale={1}
                      maxScale={32}
                      limitToBounds={true}
                      wheel={{ step: 0.5 }}
                      onTransformed={handleTransformed}
                    >
                      {({ zoomIn, zoomOut, resetTransform, centerView }) => (
                        <>
                          <ResultsImageViewer
                            activeImage={activeImage}
                            isImageLoaded={isImageLoaded}
                            imageContainerRef={imageContainerRef}
                            imageDimensions={imageDimensions}
                            renderedImageStyle={renderedImageStyle}
                            isMobile={isMobile}
                            transformState={transformState}
                            viewingBox={viewingBox}
                            variants={itemVariants}
                          />
                          {images.length > 1 && (
                            <ResultsThumbnailList
                              images={images}
                              activeImage={activeImage}
                              isMobile={isMobile}
                              onSelectImage={onSelectImage}
                              variants={itemVariants}
                            />
                          )}
                          <ResultsViewControls
                            isMobile={isMobile}
                            hasPrevious={hasPrevious}
                            hasNext={hasNext}
                            onPrevious={onPrevious}
                            onNext={onNext}
                            zoomIn={zoomIn}
                            zoomOut={zoomOut}
                            resetTransform={resetTransform}
                            centerView={centerView}
                            variants={itemVariants}
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

ResultsImagesModal.displayName = "ResultsImagesModal";
