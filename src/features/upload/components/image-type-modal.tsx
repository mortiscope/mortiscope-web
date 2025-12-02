"use client";

import { AnimatePresence, motion, type Variants } from "framer-motion";
import { useEffect, useState } from "react";
import { PiWarning } from "react-icons/pi";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { type UploadableFile } from "@/features/analyze/store/analyze-store";
import { ExportModalFooter } from "@/features/export/components/export-modal-footer";
import { ExportModalHeader } from "@/features/export/components/export-modal-header";
import { IMAGE_TYPE_OPTIONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Framer Motion variants for the main modal content container.
 */
const modalContentVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { delayChildren: 0.1, staggerChildren: 0.1 } },
};

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

/**
 * The two selectable image type options.
 */

type ImageType = "macro" | "field";

interface ImageTypeModalProps {
  /** The file being classified. Null means the modal is closed. */
  file: UploadableFile | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  /** Called with the file ID and chosen image type when the user confirms. */
  onConfirm: (fileId: string, imageType: ImageType) => void;
  /** Whether the confirm action is pending (e.g. awaiting the server). */
  isPending?: boolean;
}

/**
 * A modal that allows the user to specify whether an uploaded image is a macro or field image.
 */
export const ImageTypeModal = ({
  file,
  isOpen,
  onOpenChange,
  onConfirm,
  isPending = false,
}: ImageTypeModalProps) => {
  // Default to the file's existing type if set, otherwise macro.
  const [selectedType, setSelectedType] = useState<ImageType>(file?.imageType ?? "macro");

  // Sync selected type whenever the modal opens for a different file.
  useEffect(() => {
    if (isOpen) {
      setSelectedType(file?.imageType ?? "macro");
    }
  }, [isOpen, file]);

  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    // Reset to file's current type after the modal closes.
    if (!open) {
      setTimeout(() => setSelectedType(file?.imageType ?? "macro"), 300);
    }
  };

  const handleConfirm = () => {
    if (!file || isPending) return;
    onConfirm(file.id, selectedType);
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-full max-h-[85vh] flex-col rounded-2xl bg-white p-0 shadow-2xl sm:max-w-md md:h-auto md:rounded-3xl">
        <AnimatePresence mode="wait">
          <motion.div
            key="image-type"
            className="contents"
            variants={modalContentVariants}
            initial="hidden"
            animate="show"
            exit="hidden"
          >
            <ExportModalHeader
              title="Specify Image Type"
              description={
                <>
                  Choose the image type for:
                  <br />
                  <strong
                    className="mx-auto block truncate text-center font-semibold text-slate-800 sm:max-w-xs"
                    title={file?.name}
                  >
                    {file?.name}
                  </strong>
                </>
              }
            />

            <motion.div
              variants={itemVariants}
              className="flex-1 overflow-y-auto border-y border-slate-200 p-6"
            >
              <div className="flex flex-col gap-4">
                <div className="flex items-start gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-3">
                  <PiWarning className="h-5 w-5 flex-shrink-0 text-amber-500" />
                  <p className="font-inter flex-1 text-sm text-amber-600">
                    <strong className="font-semibold text-amber-600">Note:</strong> Selecting the
                    correct image type is critical for the model&apos;s detection capability. Once
                    submitted, the selection cannot be modified.
                  </p>
                </div>

                {/* Radio group with macro and field options */}
                <RadioGroup
                  value={selectedType}
                  onValueChange={(value) => setSelectedType(value as ImageType)}
                  className="gap-1.5 space-y-2"
                >
                  {IMAGE_TYPE_OPTIONS.map(({ value, label, description }) => (
                    <Label
                      key={value}
                      htmlFor={`image-type-${value}`}
                      className={cn(
                        "flex flex-col rounded-2xl border-2 p-4 text-left transition-colors duration-300",
                        isPending ? "cursor-not-allowed" : "cursor-pointer",
                        selectedType === value
                          ? "border-emerald-400 bg-emerald-50"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <RadioGroupItem
                          value={value}
                          id={`image-type-${value}`}
                          disabled={isPending}
                          className={cn(
                            "mt-0.5 focus-visible:ring-emerald-500/50",
                            selectedType === value &&
                              "border-emerald-600 text-emerald-600 [&_svg]:fill-emerald-600"
                          )}
                        />
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <div className="min-w-0">
                            <span className="font-inter font-medium text-slate-800">{label}: </span>
                            <span className="font-inter text-sm font-normal text-slate-600">
                              {description}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            </motion.div>

            <ExportModalFooter
              isPending={isPending}
              onCancel={() => handleOpenChange(false)}
              onExport={handleConfirm}
              exportButtonText="Confirm"
              cancelButtonText="Cancel"
              pendingButtonText="Saving..."
            />
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

ImageTypeModal.displayName = "ImageTypeModal";
