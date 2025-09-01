"use client";

import { memo } from "react";

import { AnnotationModalContainer } from "@/features/annotation/components/annotation-modal-container";
import { AnnotationModalFooter } from "@/features/annotation/components/annotation-modal-footer";
import { AnnotationModalHeader } from "@/features/annotation/components/annotation-modal-header";

/**
 * Defines the props for the no detections status modal component.
 */
interface NoDetectionsStatusModalProps {
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * An informational modal that explains what the no detections status means.
 * This modal provides details about images with no detections found.
 *
 * @param {NoDetectionsStatusModalProps} props The props for controlling the modal's state.
 */
export const NoDetectionsStatusModal = memo(
  ({ isOpen, onOpenChange }: NoDetectionsStatusModalProps) => {
    /**
     * Handles the modal close action
     */
    const handleModalClose = (open: boolean) => {
      onOpenChange(open);
    };

    return (
      <AnnotationModalContainer isOpen={isOpen} onOpenChange={handleModalClose}>
        <AnnotationModalHeader
          title="No Detections"
          colorVariant="rose"
          description={
            <div className="text-left">
              <p className="mb-3">
                This status indicates that no detections were found in the current image during
                analysis.
              </p>
              <ul className="space-y-1 text-slate-600">
                <li className="flex items-start">
                  <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  <p>
                    <strong className="font-medium text-slate-700">Empty Image:</strong> The
                    analysis did not identify any objects or specimens.
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  <p>
                    <strong className="font-medium text-slate-700">Manual Addition:</strong> You can
                    still manually add detections if needed.
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  <p>
                    <strong className="font-medium text-slate-700">No Action Required:</strong> If
                    the image truly contains no specimens, no further action is needed.
                  </p>
                </li>
              </ul>
            </div>
          }
        />
        <AnnotationModalFooter
          onConfirm={() => handleModalClose(false)}
          confirmText="Understood"
          buttonVariant="destructive"
          singleButton
        />
      </AnnotationModalContainer>
    );
  }
);

NoDetectionsStatusModal.displayName = "NoDetectionsStatusModal";
