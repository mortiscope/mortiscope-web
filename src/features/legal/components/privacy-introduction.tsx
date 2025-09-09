"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Introduction" section of the privacy policy page.
 */
export function PrivacyIntroduction() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="introduction" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        1. Introduction
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>
          Welcome to <strong>MortiScope</strong>. We respect your privacy and are committed to
          protecting your personal data. This privacy policy explains how we collect, use, disclose,
          and safeguard your information when you visit our web application.
        </p>
        <p>
          <strong>MortiScope</strong> is an academic thesis project developed by undergraduate
          students for the purpose of assisting forensic analysis of <em>Chrysomya megacephala</em>{" "}
          images for Post-Mortem Interval (PMI) estimation (the estimated time that has passed since
          death).
        </p>
        <p>
          We adhere to the principles of transparency, legitimate purpose, and proportionality as
          mandated by the{" "}
          <a
            href="https://privacy.gov.ph/data-privacy-act/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-700 underline transition-colors duration-300 ease-in-out hover:text-green-800"
          >
            Republic Act No. 10173
          </a>
          , also known as the <strong>Data Privacy Act of 2012 (DPA)</strong> of the Philippines.
          Please read this privacy policy carefully. If you do not agree with the terms of this
          privacy policy, you can refrain from accessing the application.
        </p>
      </div>
    </motion.section>
  );
}

PrivacyIntroduction.displayName = "PrivacyIntroduction";
