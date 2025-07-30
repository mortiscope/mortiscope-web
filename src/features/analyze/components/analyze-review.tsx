import { motion } from "framer-motion";

import { Card } from "@/components/ui/card";
import { ReviewActions } from "@/features/cases/components/review-actions";
import { ReviewDetailsSummary } from "@/features/cases/components/review-details-summary";
import { ReviewHeader } from "@/features/cases/components/review-header";
import { ReviewImageSummary } from "@/features/cases/components/review-image-summary";
import { ReviewProcessingOverlay } from "@/features/cases/components/review-processing-overlay";
import { UploadPreviewModal } from "@/features/cases/components/upload-preview-modal";
import { useAnalyzeReview } from "@/features/cases/hooks/use-analyze-review";

/**
 * Framer Motion variants for the main content container.
 * This orchestrates the animation of its children with a staggered effect.
 */
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

/**
 * Framer Motion variants for individual animated items.
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
};

/**
 * Renders the final review and submission step of the analysis form.
 */
export const AnalyzeReview = () => {
  // Initializes the master hook that provides all state and logic for this component.
  const {
    isProcessing,
    isCancelling,
    isSubmitting,
    isPending,
    processingMessage,
    displayData,
    sortedFiles,
    modalController,
    handleSubmit,
    handleCancel,
    prevStep,
    getPreviewUrl,
  } = useAnalyzeReview();

  return (
    <>
      {/* Renders the image preview modal. */}
      <UploadPreviewModal
        isOpen={modalController.isOpen}
        onClose={modalController.close}
        file={modalController.selectedItem}
        onNext={modalController.next}
        onPrevious={modalController.previous}
        onSelectFile={modalController.selectById}
      />

      {/* The main card that wraps all review content. */}
      <Card className="relative border-none py-2 shadow-none">
        {/* Conditionally renders a processing overlay when the analysis is running. */}
        {isProcessing && <ReviewProcessingOverlay message={processingMessage} />}

        {/* The main animated container that staggers the animations of its children. */}
        <motion.div
          className="space-y-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {/* Renders the animated header section. */}
          <ReviewHeader variants={itemVariants} />

          {/* Renders the animated summary grid of uploaded images. */}
          <ReviewImageSummary
            sortedFiles={sortedFiles}
            getPreviewUrl={getPreviewUrl}
            onImageClick={modalController.open}
            variants={itemVariants}
          />

          {/* Renders the animated summary of case details. */}
          <ReviewDetailsSummary
            caseName={displayData.caseName}
            temperatureDisplay={displayData.temperatureDisplay}
            caseDateDisplay={displayData.caseDateDisplay}
            locationDisplay={displayData.locationDisplay}
            variants={itemVariants}
          />

          {/* Renders the animated footer with action buttons. */}
          <ReviewActions
            isProcessing={isProcessing}
            isCancelling={isCancelling}
            isSubmitting={isSubmitting}
            isPending={isPending}
            onCancel={handleCancel}
            onPrevious={prevStep}
            onSubmit={handleSubmit}
            variants={itemVariants}
          />
        </motion.div>
      </Card>
    </>
  );
};
