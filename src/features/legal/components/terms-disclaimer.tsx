"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Forensic and Medical Disclaimer" section
 * of the Terms of Use page. This is a critical section for setting user expectations
 * about the application's limitations as an academic tool.
 */
export function TermsDisclaimer() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="disclaimer" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        6. Forensic and Medical Disclaimer
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <ol className="ml-6 list-decimal space-y-2">
          <li>
            <strong>No Professional Advice</strong>: The service is <strong>NOT</strong> a
            substitute for the professional judgment of a certified forensic entomologist,
            pathologist, or law enforcement officer. It is intended to be a supportive tool, not a
            replacement for human expertise.
          </li>
          <li>
            <strong>Verification Required</strong>: All results, including species identification
            and PMI estimates, must be independently verified by a qualified human expert. Do not
            rely solely on the AI&apos;s output for critical decisions.
          </li>
          <li>
            <strong>No Chain of Custody</strong>: The service is not designed to maintain a legal
            chain of custody (the chronological documentation or paper trail that records the
            sequence of custody, control, transfer, analysis, and disposition of physical or
            electronic evidence). Uploading evidence to this cloud-based system may affect its
            admissibility in court depending on your jurisdiction&apos;s laws.{" "}
            <strong>
              We recommend using this tool only for copies of evidence, not unique original files.
            </strong>
          </li>
          <li>
            <strong>Investigative Aid Only</strong>: This tool is designed as a{" "}
            <strong>preliminary screening tool</strong> to generate investigative leads. It is{" "}
            <strong>not</strong> a substitute for a certified laboratory report and should not be
            presented as primary evidence in legal proceedings without independent expert
            verification.
          </li>
          <li>
            <strong>Processing Delays</strong>: Image analysis is performed asynchronously via
            background processing. We do not guarantee immediate results, as processing times may
            vary depending on server load.
          </li>
        </ol>
      </div>
    </motion.section>
  );
}

TermsDisclaimer.displayName = "TermsDisclaimer";
