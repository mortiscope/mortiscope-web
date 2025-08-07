import { motion, type Variants } from "framer-motion";
import { memo } from "react";

import { DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

/**
 * The entry animation variants for the component's body, creating a "slide-up and fade-in" effect.
 */
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

/**
 * Defines the possible resolution options for the image export.
 */
type ExportResolution = "1280x720" | "1920x1080" | "3840x2160";

/**
 * A configuration array that defines the available resolution options.
 * This approach centralizes the options, making them easy to manage and map over in the UI.
 */
const resolutions: { value: ExportResolution; label: string }[] = [
  { value: "1280x720", label: "720p" },
  { value: "1920x1080", label: "1080p" },
  { value: "3840x2160", label: "4K" },
];

/**
 * Defines the props for the `ExportLabelledImagesBody` component.
 */
interface ExportLabelledImagesBodyProps {
  /** The currently selected export resolution. */
  selectedResolution: ExportResolution;
  /** A callback function to update the selected resolution in the parent component's state. */
  onResolutionChange: (resolution: ExportResolution) => void;
  /** An optional boolean to disable the controls while an export is in progress. */
  isExporting?: boolean;
}

/**
 * A memoized presentational component that renders the interactive body for the
 * "Export as Labelled Images" modal. It provides informational text and a radio group
 * for selecting the output resolution. This component is fully controlled by its parent.
 */
export const ExportLabelledImagesBody = memo(
  ({
    selectedResolution,
    onResolutionChange,
    isExporting = false,
  }: ExportLabelledImagesBodyProps) => (
    // The main animated container for the modal body.
    <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4">
      {/* Uses dialog description to ensure the content is properly announced by screen readers. */}
      <DialogDescription asChild>
        <div className="font-inter space-y-6 text-left text-sm text-slate-600">
          {/* Informational text section. */}
          <div>
            <p>
              This option generates a <strong className="font-semibold text-slate-800">zip</strong>
              &nbsp;archive containing images rendered with bounding boxes. This format is ideal for
              the following use cases:
            </p>
            <ul className="mt-3 space-y-1 text-slate-600">
              <li className="flex items-start">
                <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"></span>
                <p>
                  <strong className="font-medium text-slate-700">Reports & Presentations:</strong>
                  &nbsp;Provides clear visualization for case file images.
                </p>
              </li>
              <li className="flex items-start">
                <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"></span>
                <p>
                  <strong className="font-medium text-slate-700">Peer Review:</strong>&nbsp;Allows
                  for quick sharing and verification of detected objects with peers.
                </p>
              </li>
            </ul>
          </div>

          {/* Resolution selection section. */}
          <div className="space-y-3">
            <p className="font-normal text-slate-700">
              Please select the desired output resolution for the images.
            </p>
            <RadioGroup
              value={selectedResolution}
              onValueChange={(value) => onResolutionChange(value as ExportResolution)}
              className="grid grid-cols-3 gap-3"
              disabled={isExporting}
            >
              {/* Dynamically generates the radio options from the resolutions constant. */}
              {resolutions.map((res) => (
                <div key={res.value} className={isExporting ? "cursor-not-allowed" : ""}>
                  {/* The actual radio input is visually hidden but remains accessible to screen readers. */}
                  <RadioGroupItem
                    value={res.value}
                    id={res.value}
                    className="peer sr-only"
                    disabled={isExporting}
                  />
                  <Label
                    htmlFor={res.value}
                    className={`block rounded-md border-2 border-slate-200 p-3 text-center text-slate-700 transition-colors duration-600 ease-in-out peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-50/50 peer-data-[state=checked]:font-semibold peer-data-[state=checked]:text-emerald-600 ${
                      isExporting
                        ? "cursor-not-allowed opacity-50"
                        : "cursor-pointer hover:bg-slate-50"
                    }`}
                  >
                    {res.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>
      </DialogDescription>
    </motion.div>
  )
);

ExportLabelledImagesBody.displayName = "ExportLabelledImagesBody";
