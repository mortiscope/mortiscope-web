"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Description of Service" section
 * of the Terms of Use page. It sets clear expectations about the application's
 * academic, non-commercial nature.
 */
export function TermsDescription() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="description" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        2. Description of Service
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>
          <strong>Mortiscope</strong> is an <strong>academic thesis project</strong> developed by
          students of <strong>Laguna State Polytechnic University - Sta. Cruz Campus</strong> for
          research purposes. Its primary function is to assist in the identification and analysis of{" "}
          <em>Chrysomya megacephala</em> images for Post-Mortem Interval (PMI) estimation (the
          estimated time that has passed since death).
        </p>
        <p>
          <strong>Important Notice:</strong>
        </p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Not a Commercial Product</strong>: The service is provided for research,
            testing, and evaluation purposes only. As a student project, it is not a
            commercial-grade application and may be subject to interruptions, errors, or
            discontinuation without notice. We do not guarantee 24/7 availability.
          </li>
          <li>
            <strong>No Service Level Agreement (SLA)</strong>: We do not guarantee uptime, data
            persistence, or technical support. This means that if the website goes down or data is
            lost, we are not obligated to restore it immediately.
          </li>
          <li>
            <strong>Third-Party Infrastructure</strong>: The Service runs on third-party
            infrastructure including AWS, Vercel, and Neon. We are not responsible for any service
            interruptions, data loss, or performance issues caused by these third-party providers.
          </li>
        </ul>

        {/* Subsection explaining potential service interruptions. */}
        <h3 className="font-plus-jakarta-sans mt-6 mb-2 text-lg font-medium text-slate-900">
          What happens if the service stops working?
        </h3>
        <p>
          Since this is an academic project, there may be times when the service is unavailable due
          to maintenance, or the conclusion of the thesis. We are not liable for any inconvenience
          or data loss caused by these interruptions. We recommend that you keep your own backups of
          any critical data.
        </p>

        {/* Subsection explaining reliance on third-party services. */}
        <h3 className="font-plus-jakarta-sans mt-6 mb-2 text-lg font-medium text-slate-900">
          What happens if a third-party service fails?
        </h3>
        <p>
          We rely on external services like <strong>AWS</strong> (storage), <strong>Neon</strong>{" "}
          (database), and <strong>Resend</strong> (email). If one of these services experiences an
          outage, MortiScope may become temporarily unavailable or fail to send emails. We are not
          liable for these outages and cannot guarantee when the third-party provider will resolve
          them.
        </p>
      </div>
    </motion.section>
  );
}

TermsDescription.displayName = "TermsDescription";
