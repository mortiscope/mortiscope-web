"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Your Rights Under RA 10173" section
 * of the privacy policy page. It outlines the specific rights granted to users under
 * the Philippine Data Privacy Act.
 */
export function PrivacyRights() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="rights" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        8. Your Rights Under RA 10173
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>
          As a Data Subject under the Data Privacy Act of 2012, you are entitled to the following
          rights:
        </p>
        <ol className="ml-6 list-decimal space-y-4">
          <li>
            <strong>Right to be Informed</strong>: You have the right to know whether your personal
            data shall be, are being, or have been processed. This privacy policy fulfills this
            right by explaining what data we collect, how we use it, and who we share it with. You
            may also contact us at any time to ask specific questions about how your data is being
            processed, such as which AI models have analyzed your images or which team members have
            accessed your case files.
          </li>
          <li>
            <strong>Right to Access</strong>: You have the right to reasonable access to your
            personal data. You can view your account information (name, email, affiliation) in your
            profile settings at any time. If you want more detailed information about the data we
            store, such as session logs, hashed IP addresses, or the full history of your uploaded
            images, you can request a comprehensive data report by contacting us.
          </li>
          <li>
            <strong>Right to Rectification</strong>: You have the right to dispute the inaccuracy or
            error in your personal data and have the service correct it immediately. You can update
            your profile information (name, email, affiliation) directly in your account settings.
            If you notice errors in your case data such as incorrect temperature readings or
            location details, you can edit the case information at any time. If you believe there is
            an error in our system that you cannot fix yourself, please contact us and we will
            correct it promptly.
          </li>
          <li>
            <strong>Right to Erasure or Blocking</strong>: You have the right to suspend, withdraw
            or order the blocking, removal or destruction of your personal data from our filing
            system. You can delete individual cases and images at any time through the application
            interface. To delete your entire account and all associated data, you can use the
            account deletion feature in your settings, which initiates a 30-day grace period before
            permanent deletion. If you want your data blocked (made inaccessible but not deleted)
            for a specific reason, please contact us to discuss your requirements.
          </li>
          <li>
            <strong>Right to Damages</strong>: You have the right to be indemnified for any damages
            sustained due to such inaccurate, incomplete, outdated, false, unlawfully obtained or
            unauthorized use of personal data. If you believe you have suffered harm from our
            mishandling of your personal data, such as unauthorized disclosure of your case
            information or failure to correct inaccurate data, you may file a complaint with the
            National Privacy Commission (NPC) and seek legal remedies under Philippine law,
            including compensation for damages.
          </li>
          <li>
            <strong>Right to Data Portability</strong>: You have the right to obtain a copy of your
            data in an electronic or structured format that you can use with other services. This
            includes your account information, all case data, uploaded images, and analysis results.
            We will provide this data in a machine-readable format (such as JSON for text data and
            original file formats for images) so you can easily transfer it to another system or
            keep it for your own records.
          </li>
        </ol>
        <p>To exercise any of these rights, please contact us using the information below.</p>

        {/* Subsection explaining the data download process. */}
        <h3 className="font-plus-jakarta-sans mt-6 mb-2 text-lg font-medium text-slate-900">
          Can I download my data?
        </h3>
        <p>
          Yes. You have the right to request a copy of your personal data and the forensic data you
          have uploaded. To do this, please contact us at{" "}
          <a
            href={`mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL}`}
            className="text-green-700 transition-colors duration-300 ease-in-out hover:text-green-800"
          >
            {process.env.NEXT_PUBLIC_CONTACT_EMAIL}
          </a>
          . We will provide your data in a structured, commonly used digital format (such as JSON)
          within a reasonable timeframe.
        </p>
      </div>
    </motion.section>
  );
}

PrivacyRights.displayName = "PrivacyRights";
