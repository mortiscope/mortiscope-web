"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, type Variants } from "framer-motion";
import { useParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { ImSpinner2 } from "react-icons/im";
import { PiWarning } from "react-icons/pi";
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
import { deleteImage } from "@/features/images/actions/delete-image";
import { useResultsStore } from "@/features/results/store/results-store";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the main modal content container.
 * This orchestrates the animation of its children with a staggered effect.
 */
const modalContentVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.2 } },
};

/**
 * Framer Motion variants for individual animated items within the modal.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

/**
 * Defines the props for the DeleteImageModal component.
 */
interface DeleteImageModalProps {
  // The unique identifier of the image to be deleted.
  imageId: string | null;
  /** The name of the image, displayed for confirmation. */
  imageName: string | null;
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
  /** The total number of images in the case. */
  totalImages: number;
}

/**
 * A modal to confirm the deletion of a single image.
 * It warns the user about the irreversible nature of the action and handles the deletion logic.
 *
 * @param {DeleteImageModalProps} props The props for controlling the modal's state.
 */
export const DeleteImageModal = ({
  imageId,
  imageName,
  isOpen,
  onOpenChange,
  totalImages,
}: DeleteImageModalProps) => {
  const queryClient = useQueryClient();
  const params = useParams();
  const caseId = typeof params.resultsId === "string" ? params.resultsId : null;

  const { markForRecalculation } = useResultsStore();

  // Track if we've successfully initiated a deletion to prevent modal flickering
  const hasInitiatedDeletion = useRef(false);
  const isDeleting = useRef(false);

  // Reset refs when modal opens or when imageId changes
  useEffect(() => {
    if (isOpen) {
      hasInitiatedDeletion.current = false;
      isDeleting.current = false;
    }
  }, [isOpen, imageId]);

  // Implement the useMutation hook for deleting an image with synchronous feedback.
  const { mutate, isPending } = useMutation({
    mutationFn: (params: { imageId: string; imageName?: string }) => deleteImage(params),
    onMutate: () => {
      // Mark that we've initiated deletion
      hasInitiatedDeletion.current = true;
      isDeleting.current = true;
    },
    // The onSuccess callback handles all post-deletion logic after the server has responded.
    onSuccess: (data) => {
      isDeleting.current = false;

      if (data.success) {
        // Use the refined, more generic success message.
        toast.success(data.success);

        // Mark case for recalculation since image deletion affects PMI
        if (caseId) {
          markForRecalculation(caseId);
        }

        // Invalidate the case data query to refresh the UI immediately
        queryClient.invalidateQueries({ queryKey: ["case", caseId] });
      } else {
        toast.error(data.error || "Failed to delete file.");
      }

      // Close the modal
      onOpenChange(false);
    },
    // Handles closing the modal on failure.
    onError: () => {
      isDeleting.current = false;
      toast.error("Deletion failed. An unexpected error occurred.");
      onOpenChange(false);
    },
  });

  /**
   * Handles the click event for the delete confirmation button.
   */
  const handleDelete = () => {
    // Prevent deletion if it's the last image.
    if (totalImages <= 1) {
      toast.error("A case must have at least one image.");
      onOpenChange(false);
      return;
    }

    if (imageId && !isPending && !hasInitiatedDeletion.current) {
      mutate({ imageId, imageName: imageName || undefined });
    }
  };

  /**
   * Handles the modal close action, but prevents closing while deletion is in progress
   */
  const handleModalClose = (open: boolean) => {
    // Don't allow closing if in the middle of deleting
    if (!isDeleting.current) {
      onOpenChange(open);
    }
  };

  // Don't render the modal if deletion has been successfuly initiated
  if (hasInitiatedDeletion.current && !isPending && !isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-sm md:rounded-3xl">
        {/* Main animation wrapper for the modal content. */}
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          {/* Animated wrapper for the dialog header. */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-6">
            <DialogHeader className="text-center">
              <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-rose-600 md:text-2xl">
                Delete Image
              </DialogTitle>
              <DialogDescription asChild>
                <div className="font-inter pt-4 text-center text-sm text-slate-600">
                  <p>
                    Are you sure you want to permanently delete the image named{" "}
                    <strong className="font-semibold break-all text-slate-800">{imageName}</strong>?
                    This action is irreversible.
                  </p>

                  <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-rose-400 bg-rose-50 p-4 text-left">
                    <PiWarning className="h-5 w-5 flex-shrink-0 text-rose-500" />
                    <p className="flex-1 text-slate-700">
                      <strong className="font-semibold text-rose-500">Note:</strong> To update the
                      PMI estimation with the remaining files, you need to click the{" "}
                      <strong className="font-semibold text-slate-800">recalculate</strong> button.
                    </p>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
          </motion.div>

          {/* Animated wrapper for the dialog footer. */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4 pb-6">
            <DialogFooter className="flex w-full flex-row gap-3">
              <div
                className={cn(
                  "flex-1",
                  (isPending || hasInitiatedDeletion.current) && "cursor-not-allowed"
                )}
              >
                <Button
                  variant="outline"
                  onClick={() => handleModalClose(false)}
                  disabled={isPending || hasInitiatedDeletion.current}
                  className="font-inter h-10 w-full cursor-pointer uppercase transition-all duration-300 ease-in-out hover:bg-slate-100"
                >
                  Cancel
                </Button>
              </div>

              <div
                className={cn(
                  "flex-1",
                  (isPending || hasInitiatedDeletion.current) && "cursor-not-allowed"
                )}
              >
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending || hasInitiatedDeletion.current}
                  className="font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 uppercase transition-all duration-300 ease-in-out hover:bg-rose-500 hover:shadow-lg hover:shadow-rose-500/20"
                >
                  {isPending ? (
                    <>
                      <ImSpinner2 className="h-5 w-5 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </div>
            </DialogFooter>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
