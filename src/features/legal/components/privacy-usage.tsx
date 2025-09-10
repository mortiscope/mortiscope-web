"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "How We Use Your Information" section of the privacy policy page.
 */
export function PrivacyUsage() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="usage" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        4. How We Use Your Information
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>We use the collected data for specific, limited purposes:</p>
        <ol className="ml-6 list-decimal space-y-3">
          <li>
            <strong>To Provide the Service</strong>:
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>
                To authenticate your identity and manage your account, ensuring only you can access
                your data.
              </li>
              <li>
                To process uploaded images using our deep learning model, which analyze visual
                patterns to identify species and estimate PMI.
              </li>
              <li>
                To securely store and organize your case history so you can retrieve your past
                analyses at any time.
              </li>
            </ul>
          </li>
          <li>
            <strong>For Security and Safety</strong>:
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>
                To monitor for suspicious activity, such as repeated failed login attempts or access
                from unusual locations.
              </li>
              <li>
                To prevent the upload of prohibited content such as malware and illegal imagery.
              </li>
            </ul>
          </li>
          <li>
            <strong>For Academic Research</strong>:
            <ul className="mt-2 ml-6 list-disc space-y-1">
              <li>
                To validate the accuracy of our AI models by comparing the AI&apos;s predictions
                against expert verification.
              </li>
              <li>
                To aggregate anonymized statistics for our thesis report.{" "}
                <strong>
                  We will never publish your specific case data, images, or any details that could
                  compromise ongoing investigations or reveal the identity of victims/suspects
                  without your explicit written consent.
                </strong>
              </li>
            </ul>
          </li>
        </ol>
      </div>
    </motion.section>
  );
}

PrivacyUsage.displayName = "PrivacyUsage";
