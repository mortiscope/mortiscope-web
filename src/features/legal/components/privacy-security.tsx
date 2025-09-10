"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Data Security" section of the privacy policy page.
 */
export function PrivacySecurity() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="security" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        7. Data Security
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>
          We use administrative, technical, and physical security measures to help protect your
          personal information.
        </p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Encryption</strong>: All data transmitted between your browser and our servers
            is encrypted using Transport Layer Security (TLS/SSL). This acts like a secure tunnel,
            making your data unreadable to anyone who might try to intercept it.
          </li>
          <li>
            <strong>Access Control</strong>: Access to the database and storage buckets is
            restricted to the core development team.
          </li>
          <li>
            <strong>Authentication</strong>: We use industry-standard OAuth (a secure way to log in
            using your existing accounts like Google without sharing your password) and session
            management to prevent unauthorized account access.
          </li>
        </ul>

        {/* Subsection explaining the data breach response procedure. */}
        <h3 className="font-plus-jakarta-sans mt-6 mb-2 text-lg font-medium text-slate-900">
          What happens if there is a data breach?
        </h3>
        <p>
          In the unlikely event of a data breach that compromises your personal information, we are
          committed to notifying you via email within <strong>72 hours</strong> of confirming the
          incident, as required by the Data-privacy Act. We will explain what data was affected and
          what steps we are taking to secure your account.
        </p>
        <p>
          While we have taken reasonable steps to secure the personal information you provide to us,
          please be aware that despite our efforts, no security measures are perfect or
          impenetrable, and no method of data transmission can be guaranteed against any
          interception or other type of misuse.
        </p>
      </div>
    </motion.section>
  );
}

PrivacySecurity.displayName = "PrivacySecurity";
