import { motion, type Variants } from "framer-motion";
import { memo } from "react";

import { DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

// The entry animation for the component body.
const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

type ExportResolution = "1280x720" | "1920x1080" | "3840x2160";

/**
 * An array to define the resolution options to map.
 */
const resolutions: { value: ExportResolution; label: string }[] = [
  { value: "1280x720", label: "720p" },
  { value: "1920x1080", label: "1080p" },
  { value: "3840x2160", label: "4K" },
];

interface ExportImagesBodyProps {
  selectedResolution: ExportResolution;
  onResolutionChange: (resolution: ExportResolution) => void;
}

/**
 * Renders the interactive body for the "Export as Labelled Images" modal,
 * allowing users to select an output resolution for a case export.
 */
export const ExportImagesBody = memo(
  ({ selectedResolution, onResolutionChange }: ExportImagesBodyProps) => (
    <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4">
      <DialogDescription asChild>
        <div className="font-inter space-y-6 text-left text-sm text-slate-600">
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

          <div className="space-y-3">
            <p className="font-normal text-slate-700">
              Please select the desired output resolution for the images.
            </p>
            <RadioGroup
              value={selectedResolution}
              onValueChange={(value) => onResolutionChange(value as ExportResolution)}
              className="grid grid-cols-3 gap-3"
            >
              {resolutions.map((res) => (
                <div key={res.value}>
                  <RadioGroupItem value={res.value} id={res.value} className="peer sr-only" />
                  <Label
                    htmlFor={res.value}
                    className="block cursor-pointer rounded-md border-2 border-slate-200 p-3 text-center text-slate-700 transition-colors duration-600 ease-in-out peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-50/50 peer-data-[state=checked]:font-semibold peer-data-[state=checked]:text-emerald-600 hover:bg-slate-50"
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

ExportImagesBody.displayName = "ExportImagesBody";
