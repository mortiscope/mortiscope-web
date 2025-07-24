"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ImSpinner2 } from "react-icons/im";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getExportStatus } from "@/features/results/actions/get-export-status";
import { requestExport } from "@/features/results/actions/request-export";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the main modal content container.
 * This orchestrates the animation of its children with a staggered effect.
 */
const modalContentVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.2,
      staggerChildren: 0.2,
    },
  },
};

/**
 * Framer Motion variants for individual animated items within the modal.
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
 * Defines the props for the export results modal component.
 */
interface ExportResultsModalProps {
  /** The unique identifier of the case to be exported. */
  caseId: string | null;
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal to confirm the export of a case.
 * It handles the mutation to request an export, polls for the result,
 * and provides feedback without closing until the job is complete.
 *
 * @param {ExportResultsModalProps} props The props for controlling the modal's state.
 */
export const ExportResultsModal = ({ caseId, isOpen, onOpenChange }: ExportResultsModalProps) => {
  const [exportId, setExportId] = useState<string | null>(null);

  const { mutate: startExport, isPending: isStarting } = useMutation({
    mutationFn: requestExport,
    onSuccess: (data) => {
      if (data.success && data.exportId) {
        toast.success("Export started successfully.");
        setExportId(data.exportId);
      } else if (data.error) {
        toast.error(data.error);
        onOpenChange(false);
      }
    },
    onError: () => {
      toast.error("An unexpected error occurred.");
      onOpenChange(false);
    },
  });

  // The useQuery hook that only fetches data.
  const { data: exportStatusData } = useQuery({
    queryKey: ["exportStatus", exportId],
    queryFn: () => getExportStatus({ exportId: exportId! }),
    enabled: !!exportId,
    refetchInterval: 3000,
    retry: false,
  });

  // A useEffect hook handles the side-effects of the polling data.
  useEffect(() => {
    if (exportStatusData?.status === "completed" && exportStatusData.url) {
      toast.success("Export ready! Download will begin.");
      window.location.href = exportStatusData.url;
      onOpenChange(false);
      setExportId(null);
    } else if (exportStatusData?.status === "failed") {
      toast.error("Export failed during processing.", {
        description: exportStatusData.failureReason,
      });
      onOpenChange(false);
      setExportId(null);
    }
  }, [exportStatusData, onOpenChange]);

  const isPending = isStarting || !!exportId;

  const handleExport = () => {
    if (caseId && !isPending) {
      startExport({ caseId, format: "raw_data" });
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setExportId(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:rounded-3xl">
        {/* Main animation wrapper for the modal content. */}
        <motion.div
          className="contents"
          variants={modalContentVariants}
          initial="hidden"
          animate="show"
        >
          {/* Header content */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-6">
            <DialogHeader>
              <DialogTitle className="font-plus-jakarta-sans text-center text-xl font-bold text-emerald-600 md:text-2xl">
                Download as Raw Data
              </DialogTitle>
            </DialogHeader>
          </motion.div>

          {/* Body content */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4">
            <div className="font-inter text-left text-sm text-slate-600">
              <p>
                This option bundles all original case files into a single&nbsp;
                <strong className="font-semibold text-slate-800">zip</strong> archive. This format
                is ideal for the following use cases:
              </p>
              <ul className="mt-3 mb-4 space-y-1 text-slate-600">
                <li className="flex items-start">
                  <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"></span>
                  <p>
                    <strong className="font-medium text-slate-700">Permanent Archival:</strong>
                    &nbsp; Creates a complete, offline backup of the case for record-keeping.
                  </p>
                </li>
                <li className="flex items-start">
                  <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"></span>
                  <p>
                    <strong className="font-medium text-slate-700">External Analysis:</strong>&nbsp;
                    Allows the data to be used with other software or for academic research.
                  </p>
                </li>
              </ul>
              <p>
                The generated archive will contain all original images and a detailed JSON file with
                the complete analysis results.
              </p>
            </div>
          </motion.div>

          {/* Animated wrapper for the dialog footer. */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4 pb-6">
            <DialogFooter className="flex w-full flex-row gap-3">
              <div className={cn("flex-1", isPending && "cursor-not-allowed")}>
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  disabled={isPending}
                  className="font-inter h-10 w-full cursor-pointer uppercase transition-all duration-300 ease-in-out hover:bg-slate-100 disabled:cursor-not-allowed"
                >
                  Cancel
                </Button>
              </div>

              <div className={cn("flex-1", isPending && "cursor-not-allowed")}>
                <Button
                  onClick={handleExport}
                  disabled={isPending}
                  className="font-inter flex h-10 w-full cursor-pointer items-center justify-center gap-2 bg-emerald-600 text-white uppercase transition-all duration-300 ease-in-out hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <>
                      <ImSpinner2 className="h-5 w-5 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    "Export"
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
