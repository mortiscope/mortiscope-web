"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Contact Us" section of the terms of use page.
 */
export function TermsContact() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="contact" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        12. Contact Us
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>
          If you have questions about these terms, or if you need to send us a legal notice, please
          contact us at:
        </p>
        {/* Container for the specific contact details. */}
        <div className="mt-4">
          <p className="font-semibold text-slate-900">MortiScope Developers</p>
          <p>
            <strong>Email</strong>:{" "}
            <a
              href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}
              className="text-amber-700 transition-colors duration-300 ease-in-out hover:text-amber-800"
            >
              {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
            </a>
          </p>
          <p>
            <strong>Subject Line</strong>: Please use <strong>Legal Inquiry</strong> or{" "}
            <strong>Terms of Use Question</strong> in your subject line to ensure a timely response.
          </p>
        </div>
      </div>
    </motion.section>
  );
}

TermsContact.displayName = "TermsContact";
