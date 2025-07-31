"use client";

import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { requestImageExport } from "@/features/export/actions/request-image-export";
import { ExportImageBody } from "@/features/export/components/export-image-body";
import { ExportModalFooter } from "@/features/export/components/export-modal-footer";
import { ExportModalHeader } from "@/features/export/components/export-modal-header";
import { useExportStatus } from "@/features/export/hooks/use-export-status";

/**
 * Framer Motion variants for the main modal content container.
 */
const modalContentVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.2 } },
};

interface ExportImageModalProps {
  image: { id: string; name: string } | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal to configure and confirm the export of a single image. This smart
 * component manages state and orchestrates the UI.
 */
export const ExportImageModal = ({ image, isOpen, onOpenChange }: ExportImageModalProps) => {
  const [exportOption, setExportOption] = useState<"raw_data" | "labelled_image">("raw_data");
  const [exportId, setExportId] = useState<string | null>(null);

  const { mutate: startExport, isPending: isStarting } = useMutation({
    mutationFn: requestImageExport,
    onSuccess: (data) => {
      // Correctly handle the discriminated union from the server action.
      if (data.success) {
        if (data.data?.exportId) {
          toast.success("Export started successfully.");
          setExportId(data.data.exportId);
        }
      } else {
        // If success is false, we can safely access the error property.
        toast.error(data.error || "Failed to start export.");
        onOpenChange(false);
      }
    },
    onError: () => {
      toast.error("An unexpected error occurred.");
      onOpenChange(false);
    },
  });

  // Handles polling and side-effects. Closes modal on completion.
  const isPolling = useExportStatus({ exportId, onClose: () => onOpenChange(false) });

  const isPending = isStarting || isPolling;

  const handleExport = () => {
    if (image && !isPending && exportOption === "raw_data") {
      startExport({ uploadId: image.id, format: "raw_data" });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) setExportId(null);
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:rounded-3xl">
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          <ExportModalHeader
            title="Download Image"
            description={
              <>
                Choose a download option for&nbsp;
                <strong className="font-semibold text-slate-800">{image?.name}</strong>.
              </>
            }
          />
          <ExportImageBody exportOption={exportOption} onExportOptionChange={setExportOption} />
          <ExportModalFooter
            isPending={isPending}
            onCancel={() => handleOpenChange(false)}
            onExport={handleExport}
            exportButtonText="Download"
            pendingButtonText="Downloading..."
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
