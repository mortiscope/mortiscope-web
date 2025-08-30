"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { memo, useEffect, useRef } from "react";
import { PiWarning } from "react-icons/pi";

import { AnnotationModalContainer } from "@/features/annotation/components/annotation-modal-container";
import { AnnotationModalFooter } from "@/features/annotation/components/annotation-modal-footer";
import { AnnotationModalHeader } from "@/features/annotation/components/annotation-modal-header";
import { deleteImage } from "@/features/images/actions/delete-image";
import { useResultsStore } from "@/features/results/store/results-store";

/**
 * Defines the props for the editor delete image modal component.
 */
interface EditorDeleteImageModalProps {
  /** The unique identifier of the image to be deleted. */
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
 * A modal to confirm the deletion of a single image from the annotation editor.
 * It warns the user about the irreversible nature of the action and handles the deletion logic.
 *
 * @param {EditorDeleteImageModalProps} props The props for controlling the modal's state.
 */
export const EditorDeleteImageModal = memo(
  ({ imageId, imageName, isOpen, onOpenChange, totalImages }: EditorDeleteImageModalProps) => {
    const queryClient = useQueryClient();
    const params = useParams();
    const caseId = typeof params.resultsId === "string" ? params.resultsId : null;

    const { markForRecalculation } = useResultsStore();

    // Track if the user successfully initiated a deletion to prevent modal flickering
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
        // Mark that the user initiated deletion
        hasInitiatedDeletion.current = true;
        isDeleting.current = true;
      },
      // The onSuccess callback handles all post-deletion logic after the server has responded.
      onSuccess: (data) => {
        isDeleting.current = false;

        if (data.success) {
          // Mark case for recalculation since image deletion affects PMI
          if (caseId) {
            markForRecalculation(caseId);
          }

          // Invalidate the case data query to refresh the interface immediately
          queryClient.invalidateQueries({ queryKey: ["case", caseId] });
        }

        // Close the modal
        onOpenChange(false);
      },
      // Handles closing the modal on failure.
      onError: () => {
        isDeleting.current = false;
        onOpenChange(false);
      },
    });

    /**
     * Handles the click event for the delete confirmation button.
     */
    const handleDelete = () => {
      // Prevent deletion if it's the last image.
      if (totalImages <= 1) {
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

    // Don't render the modal if deletion has been successfully initiated
    if (hasInitiatedDeletion.current && !isPending && !isOpen) {
      return null;
    }

    return (
      <AnnotationModalContainer isOpen={isOpen} onOpenChange={handleModalClose}>
        <AnnotationModalHeader
          title="Delete Image"
          colorVariant="rose"
          description={
            <>
              <p>
                Are you sure you want to permanently delete the image named{" "}
                <strong className="font-semibold break-all text-slate-800">{imageName}</strong>?
                This action is irreversible.
              </p>

              <div className="mt-4 flex items-start gap-3 rounded-2xl border-2 border-rose-400 bg-rose-100 p-4 text-left">
                <PiWarning className="h-5 w-5 flex-shrink-0 text-rose-600" />
                <p className="flex-1 text-slate-700">
                  <strong className="font-semibold text-rose-600">Note:</strong> To update the PMI
                  estimation with the remaining files, you need to click the{" "}
                  <strong className="font-semibold text-slate-800">recalculate</strong> button in
                  the results page.
                </p>
              </div>
            </>
          }
        />
        <AnnotationModalFooter
          onCancel={() => handleModalClose(false)}
          onConfirm={handleDelete}
          cancelText="Cancel"
          confirmText="Delete"
          pendingText="Deleting..."
          buttonVariant="destructive"
          isPending={isPending || hasInitiatedDeletion.current}
        />
      </AnnotationModalContainer>
    );
  }
);

EditorDeleteImageModal.displayName = "EditorDeleteImageModal";
