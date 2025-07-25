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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getExportStatus } from "@/features/results/actions/get-export-status";
import { requestImageExport } from "@/features/results/actions/request-image-export";
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
 * Defines the props for the export image modal component.
 */
interface ExportImageModalProps {
  image: { id: string; name: string } | null;
  /** Controls whether the modal is open or closed. */
  isOpen: boolean;
  /** Function to call when the modal's open state changes. */
  onOpenChange: (isOpen: boolean) => void;
}

/**
 * A modal to configure and confirm the export of a single image.
 * It provides options for different export formats.
 *
 * @param {ExportImageModalProps} props The props for controlling the modal's state.
 */
export const ExportImageModal = ({ image, isOpen, onOpenChange }: ExportImageModalProps) => {
  // State to manage the selected export option.
  const [exportOption, setExportOption] = useState<"raw_data" | "labelled_image">("raw_data");
  // State to hold the ID of the current export job.
  const [exportId, setExportId] = useState<string | null>(null);

  // Starts the job and sets the export id for polling.
  const { mutate: startExport, isPending: isStarting } = useMutation({
    mutationFn: requestImageExport,
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

  // A useQuery to poll for the status of the specific export job.
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
      toast.error(exportStatusData.failureReason || "Export failed during processing.");
      onOpenChange(false);
      setExportId(null);
    }
  }, [exportStatusData, onOpenChange]);

  const isPending = isStarting || !!exportId;

  /**
   * Handles the click event for the export confirmation button.
   */
  const handleExport = () => {
    if (image && !isPending) {
      // Only the raw_data option is currently functional.
      if (exportOption === "raw_data") {
        startExport({ uploadId: image.id, format: "raw_data" });
      }
    }
  };

  /**
   * Resets the polling state when the modal is closed manually.
   */
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setExportId(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:rounded-3xl">
        {/* Main wrapper for the modal content. */}
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
                Download Image
              </DialogTitle>
              <p className="font-inter pt-2 text-center text-sm text-slate-500">
                Choose a download option for&nbsp;
                <strong className="font-semibold text-slate-800">{image?.name}</strong>.
              </p>
            </DialogHeader>
          </motion.div>

          {/* Body content with radio group options */}
          <motion.div variants={itemVariants} className="shrink-0 px-6 pt-2">
            <RadioGroup
              defaultValue={exportOption}
              onValueChange={(value: "raw_data" | "labelled_image") => setExportOption(value)}
            >
              {/* Raw Data */}
              <Label
                htmlFor="raw_data"
                className={cn(
                  "flex cursor-pointer flex-col rounded-2xl border-2 p-4 text-left transition-colors duration-300 ease-in-out",
                  exportOption === "raw_data"
                    ? "border-emerald-400 bg-emerald-50"
                    : "border-slate-200 bg-white hover:bg-slate-50"
                )}
              >
                <div className="flex items-start">
                  <RadioGroupItem
                    value="raw_data"
                    id="raw_data"
                    className={cn(
                      "focus-visible:ring-emerald-500/50",
                      exportOption === "raw_data"
                        ? "border-emerald-600 text-emerald-600 [&_svg]:fill-emerald-600"
                        : ""
                    )}
                  />
                  <div className="ml-3">
                    <span className="font-inter font-medium text-slate-800">Raw Data</span>
                    <p className="font-inter mt-1.5 text-sm font-normal text-slate-600">
                      A zip archive file containing the original image and a JSON file with its
                      detection data.
                    </p>
                  </div>
                </div>
              </Label>

              {/* Labelled Image */}
              <Label
                htmlFor="labelled_image"
                className={cn(
                  "flex flex-col rounded-2xl border-2 p-4 text-left transition-colors duration-300 ease-in-out",
                  "cursor-not-allowed opacity-50"
                )}
              >
                <div className="flex items-start">
                  <RadioGroupItem value="labelled_image" id="labelled_image" disabled />
                  <div className="ml-3">
                    <span className="font-inter font-medium text-slate-800">Labelled Image</span>
                    <p className="font-inter mt-1.5 text-sm font-normal text-slate-600">
                      An image file with all bounding boxes and labels drawn directly onto it.
                    </p>
                  </div>
                </div>
              </Label>
            </RadioGroup>
          </motion.div>

          {/* Wrapper for the dialog footer. */}
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
                      Downloading...
                    </>
                  ) : (
                    "Download"
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
