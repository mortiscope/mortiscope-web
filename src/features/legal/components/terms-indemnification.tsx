"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Indemnification" section of the terms of use page.
 */
export function TermsIndemnification() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="indemnification" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        8. Indemnification
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>
          You agree to defend, indemnify, and hold harmless the developers, the university, and its
          affiliates from and against any claims, liabilities, damages, judgments, awards, losses,
          costs, expenses, or fees (including reasonable attorneys&apos; fees) resulting from:
        </p>
        <ol className="ml-6 list-decimal space-y-2">
          <li>
            <strong>Your Violation</strong>: Your violation of these <em>Terms of Use</em> or any
            other policy.
          </li>
          <li>
            <strong>Your Misuse</strong>: Your use or misuse of the service, including any data or
            results obtained from it.
          </li>
          <li>
            <strong>Your Content</strong>: Any user content you upload, including claims that it
            violates the privacy or intellectual property rights of a third party.
          </li>
          <li>
            <strong>Legal Actions</strong>: Any investigation or action taken by law enforcement
            authorities regarding your use of the service.
          </li>
        </ol>
      </div>
    </motion.section>
  );
}

TermsIndemnification.displayName = "TermsIndemnification";
