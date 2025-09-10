"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Disclosure of Your Information" section of the privacy policy page.
 */
export function PrivacyDisclosure() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="disclosure" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        5. Disclosure of Your Information
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>
          We do not sell, trade, or rent your personal identification information to others.{" "}
          <strong>
            We do not share your data with advertisers or commercial business partners.
          </strong>
        </p>
        <p>
          We may share generic <strong>anonymized and aggregated</strong> demographic information
          (not linked to any personal identification information) solely for{" "}
          <strong>academic and research purposes</strong> such as thesis defense presentations or
          academic publications.
        </p>
        <p>
          We may share your information with third-party service providers who perform services for
          us or on our behalf and require access to such information to do that work. These third
          parties are:
        </p>
        {/* Lists the third-party services (sub-processors) used by the application. */}
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Amazon Web Services (AWS)</strong>: We use AWS S3 to securely store your
            uploaded forensic images. AWS is a global leader in cloud security and ensures your data
            is protected from physical loss.
          </li>
          <li>
            <strong>Inngest</strong>: We use Inngest to manage background processing jobs. This
            ensures that your image analysis requests are queued and processed reliably, even during
            high traffic.
          </li>
          <li>
            <strong>Neon</strong>: We use Neon (PostgreSQL) to host our database containing user
            accounts and case metadata. It provides enterprise-grade security and encryption at
            rest.
          </li>
          <li>
            <strong>Render</strong>: We use Render to host our Python/FastAPI backend services. Your
            images are temporarily processed by these servers to generate analysis results.
          </li>
          <li>
            <strong>Vercel</strong>: We use Vercel to host and deploy the web application, ensuring
            secure access from anywhere.
          </li>
          <li>
            <strong>Resend</strong>: We use Resend to deliver important system emails to you, such
            as account verification codes and password reset links.
          </li>
        </ul>
        <p>
          These third parties are prohibited from using your personal information for any purpose
          other than to provide this assistance and are contractually obligated to protect your
          data.
        </p>

        {/* Subsection on handling third-party breaches. */}
        <h3 className="font-plus-jakarta-sans mt-6 mb-2 text-lg font-medium text-slate-900">
          What happens if a third-party provider is compromised?
        </h3>
        <p>
          We carefully select reputable service providers (like AWS and Neon) that adhere to high
          security standards. However, no system is immune to risks. If one of our third-party
          providers suffers a data breach that affects your information, we will:
        </p>
        <ol className="ml-6 list-decimal space-y-2">
          <li>
            <strong>Notify you</strong> immediately upon receiving confirmation from the provider.
          </li>
          <li>
            <strong>Work with the provider</strong> to mitigate the impact.
          </li>
          <li>
            <strong>Inform the National Privacy Commission (NPC)</strong> if required by law.
          </li>
        </ol>
      </div>
    </motion.section>
  );
}

PrivacyDisclosure.displayName = "PrivacyDisclosure";
