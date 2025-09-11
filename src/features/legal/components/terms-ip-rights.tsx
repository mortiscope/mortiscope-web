"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Intellectual Property Rights" section of the terms of use page.
 */
export function TermsIPRights() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="ip-rights" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        5. Intellectual Property Rights
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>User Content</strong>: You retain all rights and ownership of the images and
            data you upload. By uploading user content, you represent and warrant that you have the{" "}
            <strong>official authority</strong> to share such data for analysis. You grant us a
            non-exclusive, worldwide, royalty-free license to use, store, and process such content{" "}
            <strong>
              solely for the purpose of providing the service and validating our research
            </strong>
            .
          </li>
          <li>
            <strong>Service Content</strong>: The MortiScope application, including its software,
            design, and AI models, is the property of the Developers and the University. You may not
            copy, modify, or distribute any part of the Service without our prior written consent.
          </li>
        </ul>

        {/* Subsection clarifying ownership of AI results. */}
        <h3 className="font-plus-jakarta-sans mt-6 mb-2 text-lg font-medium text-slate-900">
          Who owns the AI analysis results?
        </h3>
        <p>
          While you own the images you upload, the{" "}
          <strong>AI models, algorithms, and the generated analysis reports</strong> are the
          intellectual property of the developers and the holder of this web application. We grant
          you a limited, non-exclusive license to use these reports for your personal research or
          academic purposes.
        </p>
      </div>
    </motion.section>
  );
}

TermsIPRights.displayName = "TermsIPRights";
