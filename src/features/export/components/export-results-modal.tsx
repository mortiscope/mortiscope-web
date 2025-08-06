"use client";

import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { requestResultsExport } from "@/features/export/actions/request-results-export";
import { ExportImagesBody } from "@/features/export/components/export-images-body";
import { ExportModalFooter } from "@/features/export/components/export-modal-footer";
import { ExportModalHeader } from "@/features/export/components/export-modal-header";
import { ExportResultsBody } from "@/features/export/components/export-results-body";
import { useExportStatus } from "@/features/export/hooks/use-export-status";
import type { RequestResultsExportInput } from "@/features/export/schemas/export";

/**
 * Framer Motion variants for the main modal content container.
 */
const modalContentVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.2 } },
};

/**
 * Defines the types for the case export formats and resolutions.
 */
type CaseExportFormat = "raw_data" | "labelled_images";
type ExportResolution = "1280x720" | "1920x1080" | "3840x2160";

interface ExportResultsModalProps {
  caseId: string | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  format: CaseExportFormat;
}

/**
 * A modal to confirm the export of a case. This smart component manages the
 * export request and orchestrates the UI components.
 */
export const ExportResultsModal = ({
  caseId,
  isOpen,
  onOpenChange,
  format,
}: ExportResultsModalProps) => {
  const [exportId, setExportId] = useState<string | null>(null);
  const [resolution, setResolution] = useState<ExportResolution>("1920x1080");

  const { mutate: startExport, isPending: isStarting } = useMutation({
    mutationFn: requestResultsExport,
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
    if (caseId && !isPending) {
      const payload: RequestResultsExportInput =
        format === "labelled_images" ? { caseId, format, resolution } : { caseId, format };
      startExport(payload);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setExportId(null);
      setResolution("1920x1080");
    }
    onOpenChange(open);
  };

  const modalTitle = format === "raw_data" ? "Export as Raw Data" : "Export as Labelled Images";

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:rounded-3xl">
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          <ExportModalHeader title={modalTitle} />
          {format === "raw_data" ? (
            <ExportResultsBody />
          ) : (
            <ExportImagesBody
              selectedResolution={resolution}
              onResolutionChange={setResolution}
              isExporting={isPending}
            />
          )}
          <ExportModalFooter
            isPending={isPending}
            onCancel={() => handleOpenChange(false)}
            onExport={handleExport}
          />
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};
