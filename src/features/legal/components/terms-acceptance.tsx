"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Acceptance of Terms" section of the terms of use page.
 */
export function TermsAcceptance() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="acceptance" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        1. Acceptance of Terms
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>
          By accessing or using the <strong>MortiScope</strong> web application, registering for an
          account, or clicking <strong>I Agree</strong>, you agree to be bound by these terms of
          use. If you do not agree to these terms, you may not access or use the service.
        </p>
        <p>
          <strong>Capacity to Contract</strong>: You represent and warrant that you are at least 18
          years of age and have the legal capacity to enter into this binding agreement. If you are
          using the service on behalf of an institution, you represent that you have the authority
          to bind that institution to these terms. These terms constitute a legally binding
          agreement between you and the <strong>MortiScope Developers</strong>.
        </p>
      </div>
    </motion.section>
  );
}

TermsAcceptance.displayName = "TermsAcceptance";
