"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Governing Law and
 * Dispute Resolution" section of the terms of use page.
 */
export function TermsGoverningLaw() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="governing-law" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        9. Governing Law and Dispute Resolution
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>
          These terms shall be governed by and construed in accordance with the laws of the{" "}
          <strong>Republic of the Philippines</strong>, without regard to its conflict of law
          provisions.
        </p>

        {/* Subsection explaining the dispute resolution process. */}
        <h3 className="font-plus-jakarta-sans mt-6 mb-2 text-lg font-medium text-slate-900">
          Dispute Resolution Process
        </h3>
        <ol className="ml-6 list-decimal space-y-2">
          <li>
            <strong>Amicable Settlement</strong>: In the event of any dispute, controversy, or claim
            arising out of or relating to these terms, the parties agree to first attempt to resolve
            the dispute amicably through good-faith negotiations for a period of at least{" "}
            <strong>thirty (30) days</strong>.
          </li>
          <li>
            <strong>Venue</strong>: If the dispute cannot be resolved amicably, it shall be
            submitted to the exclusive jurisdiction of the competent courts in the{" "}
            <strong>Philippines</strong>. You waive any objection to this venue based on
            inconvenient forum.
          </li>
        </ol>
      </div>
    </motion.section>
  );
}

TermsGoverningLaw.displayName = "TermsGoverningLaw";
