"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Changes to Terms" section of the terms of use page.
 */
export function TermsChanges() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="changes" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        11. Changes to Terms
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>We reserve the right to modify or replace these terms at any time.</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Notification</strong>: If a revision is material, we will try to provide at
            least <strong>30 days&apos; notice</strong> via email or a prominent notice on our
            dashboard prior to any new terms taking effect. What constitutes a material change will
            be determined at our sole discretion.
          </li>
          <li>
            <strong>Continued Use</strong>: By continuing to access or use our service after those
            revisions become effective, you agree to be bound by the revised terms. If you do not
            agree to the new terms, you are no longer authorized to use the service.
          </li>
        </ul>
      </div>
    </motion.section>
  );
}

TermsChanges.displayName = "TermsChanges";
