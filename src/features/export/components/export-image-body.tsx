import { AnimatePresence, motion, type Variants } from "framer-motion";
import { forwardRef } from "react";
import type { z } from "zod";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { requestImageExportSchema } from "@/features/export/schemas/export";
import { cn } from "@/lib/utils";

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

const pageTransitionVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: "easeInOut" } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2, ease: "easeInOut" } },
};

const resolutions = [
  {
    value: "1280x720",
    label: "1280x720",
    description: "Good for quick previews and sharing. Best for smaller screens.",
  },
  {
    value: "1920x1080",
    label: "1920x1080",
    description: "Recommended for most use cases. Balances quality and file size.",
  },
  {
    value: "3840x2160",
    label: "3840x2160",
    description: "Highest quality for detailed analysis. Creates the largest file.",
  },
];

type Resolution = z.infer<(typeof requestImageExportSchema.options)[1]["shape"]["resolution"]>;

type ExportImageBodyProps = {
  step: "format" | "resolution";
  exportOption: "raw_data" | "labelled_image";
  onExportOptionChange: (value: "raw_data" | "labelled_image") => void;
  resolution: Resolution;
  onResolutionChange: (value: Resolution) => void;
  isPending: boolean;
};

/**
 * Renders the body content for the "Export Image" modal, including format and resolution options.
 */
export const ExportImageBody = forwardRef<HTMLDivElement, ExportImageBodyProps>(
  (
    { step, exportOption, onExportOptionChange, resolution, onResolutionChange, isPending },
    ref
  ) => (
    <motion.div ref={ref} variants={itemVariants} className="shrink-0 overflow-hidden px-6 pt-2">
      <AnimatePresence mode="wait">
        {step === "format" && (
          <motion.div
            key="format"
            variants={pageTransitionVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <div className={cn(isPending && "opacity-50")}>
              <RadioGroup
                defaultValue={exportOption}
                onValueChange={(value) =>
                  onExportOptionChange(value as "raw_data" | "labelled_image")
                }
                className="gap-1.5 space-y-2"
              >
                <Label
                  htmlFor="raw_data"
                  className={cn(
                    "flex flex-col rounded-2xl border-2 p-4 text-left transition-colors duration-300",
                    isPending ? "cursor-not-allowed" : "cursor-pointer",
                    exportOption === "raw_data"
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-start">
                    <RadioGroupItem
                      value="raw_data"
                      id="raw_data"
                      disabled={isPending}
                      className={cn(
                        "focus-visible:ring-emerald-500/50",
                        exportOption === "raw_data" &&
                          "border-emerald-600 text-emerald-600 [&_svg]:fill-emerald-600"
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
                <Label
                  htmlFor="labelled_image"
                  className={cn(
                    "flex flex-col rounded-2xl border-2 p-4 text-left transition-colors duration-300",
                    isPending ? "cursor-not-allowed" : "cursor-pointer",
                    exportOption === "labelled_image"
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-start">
                    <RadioGroupItem
                      value="labelled_image"
                      id="labelled_image"
                      disabled={isPending}
                      className={cn(
                        "focus-visible:ring-emerald-500/50",
                        exportOption === "labelled_image" &&
                          "border-emerald-600 text-emerald-600 [&_svg]:fill-emerald-600"
                      )}
                    />
                    <div className="ml-3">
                      <span className="font-inter font-medium text-slate-800">Labelled Image</span>
                      <p className="font-inter mt-1.5 text-sm font-normal text-slate-600">
                        An image file with all bounding boxes and labels drawn directly onto it.
                      </p>
                    </div>
                  </div>
                </Label>
              </RadioGroup>
            </div>
          </motion.div>
        )}

        {step === "resolution" && (
          <motion.div
            key="resolution"
            variants={pageTransitionVariants}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            <div className={cn(isPending && "opacity-50")}>
              <RadioGroup
                defaultValue={resolution}
                onValueChange={(value) => onResolutionChange(value as Resolution)}
                className="gap-1.5 space-y-2"
              >
                {resolutions.map((res) => (
                  <Label
                    key={res.value}
                    htmlFor={res.value}
                    className={cn(
                      "flex flex-col rounded-2xl border-2 p-4 text-left transition-colors duration-300",
                      isPending ? "cursor-not-allowed" : "cursor-pointer",
                      resolution === res.value
                        ? "border-emerald-400 bg-emerald-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-start">
                      <RadioGroupItem
                        value={res.value}
                        id={res.value}
                        disabled={isPending}
                        className={cn(
                          "focus-visible:ring-emerald-500/50",
                          resolution === res.value &&
                            "border-emerald-600 text-emerald-600 [&_svg]:fill-emerald-600"
                        )}
                      />
                      <div className="ml-3">
                        <span className="font-inter font-medium text-slate-800">{res.label}</span>
                        <p className="font-inter mt-1.5 text-sm font-normal text-slate-600">
                          {res.description}
                        </p>
                      </div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
);

ExportImageBody.displayName = "ExportImageBody";
