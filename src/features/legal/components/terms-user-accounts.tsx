"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "User Accounts" section of the terms of use page.
 */
export function TermsUserAccounts() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="user-accounts" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        3. User Accounts
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>To access certain features, you must register for an account.</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Registration</strong>: You agree to provide accurate, current, and complete
            information during the registration process. This helps us maintain the integrity of our
            research data.
          </li>
          <li>
            <strong>Security</strong>: You are responsible for safeguarding your account
            credentials. You agree not to disclose your password to any third party. You must notify
            us immediately upon becoming aware of any breach of security or unauthorized use of your
            account.
          </li>
          <li>
            <strong>Eligibility</strong>: You must be at least 18 years old and a verified student,
            researcher, forensic professional, or{" "}
            <strong>authorized law enforcement officer</strong> to use this service. By registering,
            you confirm that you meet these requirements.
          </li>
        </ul>

        {/* Subsection clarifying the account sharing policy. */}
        <h3 className="font-plus-jakarta-sans mt-6 mb-2 text-lg font-medium text-slate-900">
          Can I share my account?
        </h3>
        <p>
          <strong>No.</strong> Sharing your account credentials with others is strictly prohibited.
          Each user must have their own account. This ensures the integrity of our research data and
          security logs.
        </p>

        {/* Subsection explaining the password recovery process. */}
        <h3 className="font-plus-jakarta-sans mt-6 mb-2 text-lg font-medium text-slate-900">
          What happens if I lose my password?
        </h3>
        <p>
          If you lose your password, you can use the <strong>Forgot Password</strong> feature on the
          login page. We will send a secure reset link to your verified email address via our email
          service provider (Resend). It is your responsibility to keep your email account secure to
          prevent unauthorized password resets.
        </p>
      </div>
    </motion.section>
  );
}

TermsUserAccounts.displayName = "TermsUserAccounts";
