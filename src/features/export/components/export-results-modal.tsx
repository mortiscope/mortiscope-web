"use client";

import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { requestResultsExport } from "@/features/export/actions/request-results-export";
import { ExportModalFooter } from "@/features/export/components/export-modal-footer";
import { ExportModalHeader } from "@/features/export/components/export-modal-header";
import { ExportResultsBody } from "@/features/export/components/export-results-body";
import { useExportStatus } from "@/features/export/hooks/use-export-status";

/**
 * Framer Motion variants for the main modal content container.
 */
const modalContentVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.2, staggerChildren: 0.2 } },
};

interface ExportResultsModalProps {
  caseId: string | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal to confirm the export of a case. This smart component manages the
 * export request and orchestrates the UI components.
 */
export const ExportResultsModal = ({ caseId, isOpen, onOpenChange }: ExportResultsModalProps) => {
  const [exportId, setExportId] = useState<string | null>(null);

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
    if (caseId && !isPending) startExport({ caseId, format: "raw_data" });
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
          <ExportModalHeader title="Export as Raw Data" />
          <ExportResultsBody />
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
