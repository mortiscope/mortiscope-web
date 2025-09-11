"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Acceptable Use Policy (AUP)" section of the terms of use page.
 */
export function TermsAUP() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="aup" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        4. Acceptable Use Policy (AUP)
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>
          You agree not to use the service for any unlawful or prohibited purpose. Specifically, you
          agree <strong>NOT</strong> to:
        </p>
        <ol className="ml-6 list-decimal space-y-2">
          <li>
            <strong>Upload Illegal Content</strong>: Upload, post, or transmit any content that
            contains Child Sexual Abuse Material (CSAM), explicit violence unrelated to forensic
            science, or any other illegal material.{" "}
            <strong>We strictly report CSAM to the authorities.</strong>
          </li>
          <li>
            <strong>Violate Privacy or Protocol</strong>: Upload images or data that you do not have
            the legal right or official authority to possess or share such as confidential crime
            scene photos without authorization. You must ensure you have the necessary permissions
            and have followed all <strong>departmental protocols</strong> regarding the sharing of
            evidence for analysis.
          </li>
          <li>
            <strong>Harm the System</strong>: Attempt to interfere with, compromise the system
            integrity or security, or decipher any transmissions to or from the servers running the
            service.
          </li>
          <li>
            <strong>Reverse Engineer</strong>: Attempt to reverse engineer, decompile, or
            disassemble any part of the service&apos;s software. This means you agree not to try to
            take apart our code to see how it works or to build a copy of our system.
          </li>
          <li>
            <strong>Misuse Results</strong>: Present the AI-generated results as absolute fact or
            certified expert opinion in any legal proceeding. The results are for preliminary
            analysis only.
          </li>
        </ol>

        <h3 className="font-plus-jakarta-sans mt-6 mb-2 text-lg font-medium text-slate-900">
          What happens if I violate these terms?
        </h3>
        <p>
          If we determine that you have violated these terms, particularly regarding the upload of
          illegal content or attempted security breaches, we reserve the right to{" "}
          <strong>immediately suspend or terminate your account</strong> without prior notice. In
          cases involving illegal content (such as CSAM), we are legally obligated to report the
          incident and your user data to the appropriate authorities.
        </p>
      </div>
    </motion.section>
  );
}

TermsAUP.displayName = "TermsAUP";
