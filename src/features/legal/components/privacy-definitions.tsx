"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Definition of Terms" section of the privacy policy page.
 */
export function PrivacyDefinitions() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="definitions" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        2. Definition of Terms
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>To ensure clarity, the following terms are defined as follows:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Personal Information</strong>: Refers to any information whether recorded in a
            material form or not, from which the identity of an individual is apparent or can be
            reasonably and directly ascertained by the entity holding the information. This includes
            common identifiers like your name, email address, and professional affiliation.
          </li>
          <li>
            <strong>Sensitive Personal Information</strong>: Refers to personal information about an
            individual&apos;s race, ethnic origin, marital status, age, color, and religious,
            philosophical or political affiliations; health, education, genetic or sexual life; and
            crimes or alleged crimes.
          </li>
          <li>
            <strong>Data Subject</strong>: Refers to an individual whose personal information is
            processed. In the context of this application, this refers to you, the user.
          </li>

          <li>
            <strong>Forensic Data</strong>: Refers to the specific scientific data you upload,
            including high-resolution images of insect specimens, case notes describing the
            environment, and technical metadata. We understand this may include{" "}
            <strong>sensitive or privileged case information</strong>.
          </li>
        </ul>
      </div>
    </motion.section>
  );
}

PrivacyDefinitions.displayName = "PrivacyDefinitions";
