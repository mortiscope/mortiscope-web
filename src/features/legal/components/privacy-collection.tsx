"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Information We Collect" section
 * of the privacy policy page. It details the types of data collected by the application.
 */
export function PrivacyCollection() {
  return (
    // The component used to allow for animations controlled by a parent component.
    <motion.section id="collection" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        3. Information We Collect
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>
          We collect information to provide, improve, and secure our service. The types of data we
          collect include:
        </p>

        {/* Subsection A: Personal Information */}
        <h3 className="font-plus-jakarta-sans mt-6 mb-2 text-lg font-medium text-slate-900">
          A. Personal Information You Provide
        </h3>
        <p>When you register for an account or use our features, you voluntarily provide:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Identity Data</strong>: We collect your full name, email address, and
            professional title/affiliation to verify your identity as a researcher or student and to
            manage your account access.
          </li>
          <li>
            <strong>Authentication Data</strong>: If you choose to sign in using a third-party
            provider such as Google, LinkedIn, Microsoft, ORCID), we receive a unique &quot;provider
            ID&quot; (a secure code that identifies you without revealing your password) and
            confirmation that your email is verified.
          </li>
          <li>
            <strong>Case Data</strong>: This encompasses all the details you enter about a specific
            forensic case, including case names, notes, and temperature readings, which are critical
            for accurate PMI estimation.
          </li>
        </ul>

        {/* Subsection B: Forensic Data */}
        <h3 className="font-plus-jakarta-sans mt-6 mb-2 text-lg font-medium text-slate-900">
          B. Forensic Data
        </h3>
        <p>The core function of MortiScope involves the processing of images you upload:</p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Images</strong>: We process the photographs of <em>Chrysomya megacephala</em>{" "}
            (blow flies) and related evidence that you upload. These images are analyzed by our AI
            to determine the species and development stage.
          </li>
          <li>
            <strong>Metadata</strong>: We extract technical details hidden inside your image files
            (EXIF data), such as the date and time the photo was taken and GPS coordinates. We also
            store the location details you manually enter (Region, Province, City, Barangay).
          </li>
        </ul>

        {/* Subsection C: Automatically Collected Data */}
        <h3 className="font-plus-jakarta-sans mt-6 mb-2 text-lg font-medium text-slate-900">
          C. Automatically Collected Technical Data
        </h3>
        <p>
          When you access the Service, our servers automatically record information to ensure
          security and functionality.{" "}
          <strong>
            This information is stored in our database to manage your active sessions and security
            history:
          </strong>
        </p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Device Information</strong>: We store a <strong>hashed</strong> version of your
            IP address. Hashing is a security process that turns an actual data into a random string
            of characters (using SHA-256), allowing us to recognize your device for security without
            storing your actual data or identity. We also record your web browser type and operating
            system.
          </li>
          <li>
            <strong>Location Data</strong>: We use your IP address to look up your approximate
            general location using a database called <code>geoip-lite</code>. This helps us
            understand where our users are coming from without tracking your precise movements.{" "}
            <strong>We do not store your raw IP address.</strong>
          </li>
          <li>
            <strong>Session Logs</strong>: We record login timestamps, session duration, and actions
            taken within the app to detect unauthorized access and ensure the system is working
            correctly.
          </li>
        </ul>
      </div>
    </motion.section>
  );
}

PrivacyCollection.displayName = "PrivacyCollection";
