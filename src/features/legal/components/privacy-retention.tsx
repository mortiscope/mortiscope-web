"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Data Retention" section of the privacy policy page.
 */
export function PrivacyRetention() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="retention" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        6. Data Retention
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>
          We will retain your Personal Information and Forensic Data only for as long as is
          necessary for the purposes set out in this Privacy Policy.
        </p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Account Data</strong>: Retained until you delete your account.
          </li>
          <li>
            <strong>Forensic Images</strong>: Retained for the duration of the thesis project with
            the expected completion date of January 2026 or until you manually delete the
            case/image.
          </li>
          <li>
            <strong>Session Logs</strong>: Retained for 30 days for security auditing, then
            automatically deleted.
          </li>
        </ul>

        {/* Subsection explaining the account deletion process. */}
        <h3 className="font-plus-jakarta-sans mt-6 mb-2 text-lg font-medium text-slate-900">
          What happens if I delete my account?
        </h3>
        <p>
          If you choose to delete your account via the settings page, your request enters a{" "}
          <strong>30-day grace period</strong>. During this time, your account is deactivated but
          your data is retained in case you change your mind. You can restore your account by
          logging in within this period.
        </p>
        <p>
          After the 30-day grace period expires, your personal profile, authentication data, and all
          associated case data are <strong>permanently removed</strong> from our database. This
          process is irreversible. We may retain anonymized system logs for a brief period as
          required for security auditing.
        </p>
        <p>
          Upon the conclusion of the thesis project, all data may be securely archived or
          permanently deleted in accordance with university research data management policies.
        </p>
      </div>
    </motion.section>
  );
}

PrivacyRetention.displayName = "PrivacyRetention";
