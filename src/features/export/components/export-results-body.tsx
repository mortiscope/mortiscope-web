import { motion, type Variants } from "framer-motion";
import { memo } from "react";

import { DialogDescription } from "@/components/ui/dialog";

const itemVariants: Variants = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", damping: 20, stiffness: 150 } },
};

/**
 * Renders the descriptive body content for the "Export Results" modal.
 */
export const ExportResultsBody = memo(() => (
  <motion.div variants={itemVariants} className="shrink-0 px-6 pt-4">
    <DialogDescription asChild>
      <div className="font-inter text-left text-sm text-slate-600">
        <p>
          This option bundles all original case files into a single&nbsp;
          <strong className="font-semibold text-slate-800">zip</strong> archive. This format is
          ideal for the following use cases:
        </p>
        <ul className="mt-3 mb-4 space-y-1 text-slate-600">
          <li className="flex items-start">
            <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"></span>
            <p>
              <strong className="font-medium text-slate-700">Permanent Archival:</strong>&nbsp;
              Creates a complete, offline backup of the case for record-keeping.
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
          The generated archive will contain all original images and a detailed JSON file with the
          complete analysis results.
        </p>
      </div>
    </DialogDescription>
  </motion.div>
));

ExportResultsBody.displayName = "ExportResultsBody";
