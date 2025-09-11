"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Severability and Waiver" section of the terms of use page.
 */
export function TermsSeverability() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="severability" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        10. Severability and Waiver
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        {/* Subsection for Severability clause. */}
        <h3 className="font-plus-jakarta-sans mt-6 mb-2 text-lg font-medium text-slate-900">
          Severability
        </h3>
        <p>
          If any provision of these terms is held to be invalid, illegal, or unenforceable by a
          court of competent jurisdiction, such provision shall be modified to the minimum extent
          necessary to make it valid and enforceable. If it cannot be modified, it shall be severed
          (removed) from these terms. The remaining provisions shall remain in full force and
          effect.
        </p>

        {/* Subsection for Waiver clause. */}
        <h3 className="font-plus-jakarta-sans mt-6 mb-2 text-lg font-medium text-slate-900">
          Waiver
        </h3>
        <p>
          Our failure to enforce any right or provision of these terms will not be considered a
          waiver of those rights. A waiver of any default or breach of these Terms shall not
          constitute a waiver of any subsequent default or breach. Any waiver must be in writing and
          signed by an authorized representative of the Mortiscope Developers.
        </p>
      </div>
    </motion.section>
  );
}

TermsSeverability.displayName = "TermsSeverability";
