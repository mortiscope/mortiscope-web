"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { PrivacyCollection } from "@/features/legal/components/privacy-collection";
import { PrivacyContact } from "@/features/legal/components/privacy-contact";
import { PrivacyCookies } from "@/features/legal/components/privacy-cookies";
import { PrivacyDefinitions } from "@/features/legal/components/privacy-definitions";
import { PrivacyDisclosure } from "@/features/legal/components/privacy-disclosure";
import { PrivacyIntroduction } from "@/features/legal/components/privacy-introduction";
import { PrivacyRetention } from "@/features/legal/components/privacy-retention";
import { PrivacyRights } from "@/features/legal/components/privacy-rights";
import { PrivacySecurity } from "@/features/legal/components/privacy-security";
import { PrivacyUsage } from "@/features/legal/components/privacy-usage";
import { TableOfContents } from "@/features/legal/components/table-of-contents";

/**
 * A configuration array that defines the sections of the privacy policy.
 */
const sections = [
  { id: "introduction", title: "Introduction" },
  { id: "definitions", title: "Definition of Terms" },
  { id: "collection", title: "Information We Collect" },
  { id: "usage", title: "How We Use Your Information" },
  { id: "disclosure", title: "Disclosure of Your Information" },
  { id: "retention", title: "Data Retention" },
  { id: "security", title: "Data Security" },
  { id: "rights", title: "Your Rights Under RA 10173" },
  { id: "cookies", title: "Cookies and Tracking Technologies" },
  { id: "contact", title: "Contact Us" },
];

/**
 * A smart container component that renders the complete Privacy Policy page.
 */
export function PrivacyPolicy() {
  /** A state to ensure the component only triggers animations on the client. */
  const [isMounted, setIsMounted] = useState(false);

  /**
   * A side effect that runs once after the component has mounted on the client.
   */
  useEffect(() => {
    setIsMounted(true);
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
        {/* The main content column, which contains the header and all policy sections. */}
        <div className="lg:col-span-8">
          <motion.header className="mb-8 md:mb-12" variants={headerVariants}>
            <h1 className="font-plus-jakarta-sans text-center text-4xl font-semibold text-slate-950 md:text-left md:text-5xl lg:text-5xl">
              Privacy Policy
            </h1>
          </motion.header>

          {/* A secondary container to orchestrate the staggered animation of the individual sections. */}
          <motion.div className="space-y-8" variants={containerVariants}>
            <motion.div variants={sectionVariants}>
              <PrivacyIntroduction />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <PrivacyDefinitions />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <PrivacyCollection />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <PrivacyUsage />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <PrivacyDisclosure />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <PrivacyRetention />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <PrivacySecurity />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <PrivacyRights />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <PrivacyCookies />
            </motion.div>
            <motion.div variants={sectionVariants}>
              <PrivacyContact />
            </motion.div>
          </motion.div>
        </div>

        {/* The sidebar column, which contains the sticky table of contents. */}
        <div className="relative lg:col-span-4">
          <div className="sticky top-8 hidden lg:block lg:pl-8">
            {/* A decorative vertical line for styling. */}
            <div className="absolute top-0 left-0 h-[80vh] w-0.5 bg-gradient-to-b from-emerald-600 to-transparent" />
            <TableOfContents sections={sections} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

PrivacyPolicy.displayName = "PrivacyPolicy";
