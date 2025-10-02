"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { memo, useState } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EditImageBody } from "@/features/annotation/components/edit-image-body";
import { ExportModalFooter } from "@/features/export/components/export-modal-footer";
import { ExportModalHeader } from "@/features/export/components/export-modal-header";

/**
 * Framer Motion variants for the main modal content container.
 */
const modalContentVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.1 } },
};

/**
 * Defines the props for the edit image modal component.
 */
interface EditImageModalProps {
  /** The image object to be edited. If null, the modal may not render or will show a default state. */
  image: { id: string; name: string } | null;
  /** A boolean to control the visibility of the modal. */
  isOpen: boolean;
  /** A callback function to handle changes to the modal's open state. */
  onOpenChange: (isOpen: boolean) => void;
  /** The results/case ID for navigation purposes. */
  resultsId?: string;
}

/**
 * A smart modal component that allows a user to configure how they want to edit and review
 * annotations for a single image. It manages its own internal state for the user's selection.
 */
export const EditImageModal = memo(
  ({ image, isOpen, onOpenChange, resultsId }: EditImageModalProps) => {
    /** Local state to manage the user's selected edit option. */
    const [editOption, setEditOption] = useState<"current_tab" | "new_tab">("current_tab");

    const router = useRouter();

    /**
     * Handles the primary proceed action by navigating to the edit page.
     */
    const handlePrimaryAction = () => {
      if (!image || !resultsId) return;

      const editUrl = `/results/${resultsId}/image/${image.id}/edit`;

      if (editOption === "new_tab") {
        window.open(editUrl, "_blank");
      } else {
        router.push(editUrl as `/results/${string}/image/${string}/edit`);
      }

      // Close the modal after navigation
      handleOpenChange(false);
    };

    /**
     * A wrapper for the `onOpenChange` callback that resets all local state when the modal is closed.
     */
    const handleOpenChange = (open: boolean) => {
      onOpenChange(open);
      // Reset state when the modal is closed to ensure it starts fresh on the next open.
      if (!open) {
        setTimeout(() => {
          setEditOption("current_tab");
        }, 300);
      }
    };

    /**
     * A convenience handler to explicitly close the modal.
     */
    const handleCancel = () => {
      handleOpenChange(false);
    };

    return (
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="flex flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:rounded-3xl">
          <AnimatePresence mode="wait">
            <motion.div
              className="contents"
              variants={modalContentVariants}
              initial="hidden"
              animate="show"
              exit="hidden"
            >
              <ExportModalHeader
                title="Edit and Review Annotations"
                description={
                  <>
                    Choose where to edit and review the annotations of:
                    <br />
                    <strong
                      className="mx-auto block truncate text-center font-semibold text-slate-800 sm:max-w-xs"
                      title={image?.name}
                    >
                      {image?.name}
                    </strong>
                  </>
                }
              />
              <EditImageBody editOption={editOption} onEditOptionChange={setEditOption} />
              <ExportModalFooter
                isPending={false}
                onCancel={handleCancel}
                onExport={handlePrimaryAction}
                exportButtonText="Proceed"
                cancelButtonText="Cancel"
              />
            </motion.div>
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    );
  }
);

EditImageModal.displayName = "EditImageModal";
