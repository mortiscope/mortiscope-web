"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { TableOfContents } from "@/features/legal/components/table-of-contents";
import { TermsAcceptance } from "@/features/legal/components/terms-acceptance";
import { TermsAUP } from "@/features/legal/components/terms-aup";
import { TermsChanges } from "@/features/legal/components/terms-changes";
import { TermsContact } from "@/features/legal/components/terms-contact";
import { TermsDescription } from "@/features/legal/components/terms-description";
import { TermsDisclaimer } from "@/features/legal/components/terms-disclaimer";
import { TermsGoverningLaw } from "@/features/legal/components/terms-governing-law";
import { TermsIndemnification } from "@/features/legal/components/terms-indemnification";
import { TermsIPRights } from "@/features/legal/components/terms-ip-rights";
import { TermsLiability } from "@/features/legal/components/terms-liability";
import { TermsSeverability } from "@/features/legal/components/terms-severability";
import { TermsUserAccounts } from "@/features/legal/components/terms-user-accounts";

/**
 * A configuration array that defines the sections of the terms of use.
 */
const sections = [
  { id: "acceptance", title: "Acceptance of Terms" },
  { id: "description", title: "Description of Service" },
  { id: "user-accounts", title: "User Accounts" },
  { id: "aup", title: "Acceptable Use Policy" },
  { id: "ip-rights", title: "Intellectual Property Rights" },
  { id: "disclaimer", title: "Forensic and Medical Disclaimer" },
  { id: "liability", title: "Limitation of Liability" },
  { id: "indemnification", title: "Indemnification" },
  { id: "governing-law", title: "Governing Law and Dispute Resolution" },
  { id: "severability", title: "Severability and Waiver" },
  { id: "changes", title: "Changes to Terms" },
  { id: "contact", title: "Contact Us" },
];

/**
 * A smart container component that renders the complete terms of use page.
 */
export function TermsOfUse() {
  /** A state to ensure the component only triggers animations on the client, preventing hydration mismatches. */
  const [isMounted, setIsMounted] = useState(false);

  /**
   * A side effect that runs once after the component has mounted on the client.
   */
  useEffect(() => {
    setIsMounted(true);
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  /**
   * Framer Motion variants for the main page container.
   */
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut" as const,
        delayChildren: 1.0,
        staggerChildren: 0.15,
      },
    },
  };

  /**
   * Framer Motion variants for the main page header, creating a fade-in and slide-down effect.
   */
  const headerVariants = {
    hidden: { opacity: 0, y: -20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8, ease: "easeOut" as const },
    },
  };

  /**
   * Framer Motion variants for each individual content section, creating a fade-in and slide-up effect.
   */
  const sectionVariants = {
    hidden: { opacity: 0, y: 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" as const },
    },
  };

  return (
    // The main animated container for the entire page.
    <motion.div
      className="container mx-auto px-6 py-6 md:px-8"
      variants={containerVariants}
      initial="hidden"
      // The animation is only triggered after the component has mounted on the client.
      animate={isMounted ? "show" : "hidden"}
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* The main content column, which contains the header and all terms sections. */}
        <div className="lg:col-span-8">
          <motion.header className="mb-8 md:mb-12" variants={headerVariants}>
            <h1 className="font-plus-jakarta-sans text-center text-4xl font-semibold text-slate-950 md:text-left md:text-5xl lg:text-5xl">
              Terms of Use
            </h1>
          </motion.header>

          {/* A secondary container to orchestrate the staggered animation of the individual sections. */}
          <motion.div className="space-y-8" variants={containerVariants}>
            <motion.div variants={sectionVariants}>
              <TermsAcceptance />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <TermsDescription />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <TermsUserAccounts />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <TermsAUP />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <TermsIPRights />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <TermsDisclaimer />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <TermsLiability />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <TermsIndemnification />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <TermsGoverningLaw />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <TermsSeverability />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <TermsChanges />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <TermsContact />
            </motion.div>
          </motion.div>
        </div>

        {/* The sidebar column, which contains the sticky table of contents. */}
        <div className="relative lg:col-span-4">
          <div className="sticky top-8 hidden lg:block lg:pl-8">
            {/* A decorative vertical line for styling. */}
            <div className="absolute top-0 left-0 h-[80vh] w-0.5 bg-gradient-to-b from-amber-600 to-transparent" />
            <TableOfContents sections={sections} activeColorClass="text-amber-600" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

TermsOfUse.displayName = "TermsOfUse";
