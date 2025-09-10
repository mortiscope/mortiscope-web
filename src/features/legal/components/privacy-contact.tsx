"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Contact Us" section of the privacy policy page.
 */
export function PrivacyContact() {
  return (
    // The component that allows for animations controlled by a parent.
    <motion.section id="contact" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        10. Contact Us
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>
          If you have questions or comments about this privacy policy, or if you wish to exercise
          your rights as a data subject, please contact the developers at:
        </p>
        {/* Container for the specific contact details. */}
        <div className="mt-4">
          <p className="font-semibold text-slate-900">MortiScope Developers</p>
          <p>
            <strong>Email</strong>:{" "}
            <a
              href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}
              className="text-green-800 transition-colors duration-300 ease-in-out hover:text-green-900"
            >
              {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
            </a>
          </p>
          <p>
            <strong>Subject Line</strong>: Please use <strong>Legal Inquiry</strong> or{" "}
            <strong>Privacy Policy Question</strong> in your subject line to ensure a timely
            response.
          </p>
        </div>
      </div>
    </motion.section>
  );
}

PrivacyContact.displayName = "PrivacyContact";
