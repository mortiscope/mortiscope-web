"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Limitation of Liability" section of the terms of use page.
 */
export function TermsLiability() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="liability" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        7. Limitation of Liability
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>To the maximum extent permitted by law:</p>
        <ol className="ml-6 list-decimal space-y-2">
          <li>
            <strong>&quot;AS IS&quot; Basis</strong>: The service is provided on an &quot;AS
            IS&quot; and &quot;AS AVAILABLE&quot; basis. We disclaim all warranties, express or
            implied, including merchantability and fitness for a particular purpose.
          </li>
          <li>
            <strong>No Liability for Damages</strong>: In no event shall the developers, the
            university, or its faculty advisors be liable for any indirect, incidental, special,
            consequential, or punitive damages, including but not limited to loss of data, loss of
            profits, or{" "}
            <strong>legal consequences arising from the use of incorrect analysis results</strong>.
          </li>
          <li>
            <strong>Total Liability</strong>: Our total liability to you for any claim arising out
            of or relating to these terms or the service shall not exceed the amount you paid us, if
            any, for using the service (which is zero).
          </li>
        </ol>
      </div>
    </motion.section>
  );
}

TermsLiability.displayName = "TermsLiability";
