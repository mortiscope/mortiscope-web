"use client";

import { PiWarning } from "react-icons/pi";

import { DialogDescription } from "@/components/ui/dialog";

/**
 * Renders the static introduction step for the PDF export wizard. This component
 * provides users with an overview of the export process and its purpose. It is a purely
 * presentational component with no interactive state.
 *
 * @returns A React component representing the introduction step.
 */
export const PdfExportIntroductionStep = () => (
  <DialogDescription asChild>
    <div className="font-inter space-y-6 text-left text-sm text-slate-600">
      {/* Main informational text about the PDF report. */}
      <div>
        <p>
          This option generates a multi-page{" "}
          <strong className="font-semibold text-slate-800">PDF report</strong> containing the
          complete case analysis. This format is ideal for:
        </p>
        {/* A list highlighting the key use cases for the PDF report. */}
        <ul className="mt-3 space-y-1 text-slate-600">
          <li className="flex items-start">
            <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"></span>
            <p>
              <strong className="font-medium text-slate-700">Case Record:</strong> Creates a formal,
              archivable document for official records.
            </p>
          </li>
          <li className="flex items-start">
            <span className="mt-1.5 mr-3 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"></span>
            <p>
              <strong className="font-medium text-slate-700">Sharing & Collaboration:</strong>{" "}
              Allows for easy sharing of results with colleagues and peers.
            </p>
          </li>
        </ul>
      </div>
      {/* A prominent warning or note to the user, styled to draw attention. */}
      <div className="flex items-start gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4 text-left">
        <PiWarning className="h-5 w-5 flex-shrink-0 text-amber-500" />
        <p className="flex-1 text-slate-700">
          <strong className="font-semibold text-amber-500">Note:</strong> Please ensure all case
          details have been thoroughly reviewed before exporting, as this report will serve as a
          formal record of the analysis.
        </p>
      </div>
    </div>
  </DialogDescription>
);

PdfExportIntroductionStep.displayName = "PdfExportIntroductionStep";
