import { motion } from "framer-motion";
import { memo } from "react";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

type ExportImageBodyProps = {
  exportOption: "raw_data" | "labelled_image";
  onExportOptionChange: (value: "raw_data" | "labelled_image") => void;
};

/**
 * Renders the body content for the "Export Image" modal, including format options.
 */
export const ExportImageBody = memo(
  ({ exportOption, onExportOptionChange }: ExportImageBodyProps) => (
    <motion.div variants={itemVariants} className="shrink-0 px-6 pt-2">
      <RadioGroup defaultValue={exportOption} onValueChange={onExportOptionChange}>
        <Label
          htmlFor="raw_data"
          className={cn(
            "flex cursor-pointer flex-col rounded-2xl border-2 p-4 text-left transition-colors duration-300",
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
                exportOption === "raw_data" &&
                  "border-emerald-600 text-emerald-600 [&_svg]:fill-emerald-600"
              )}
            />
            <div className="ml-3">
              <span className="font-inter font-medium text-slate-800">Raw Data</span>
              <p className="font-inter mt-1.5 text-sm font-normal text-slate-600">
                A zip archive file containing the original image and a JSON file with its detection
                data.
              </p>
            </div>
          </div>
        </Label>
        <Label
          htmlFor="labelled_image"
          className="flex cursor-not-allowed flex-col rounded-2xl border-2 p-4 text-left opacity-50 transition-colors duration-300"
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
  )
);

ExportImageBody.displayName = "ExportImageBody";
