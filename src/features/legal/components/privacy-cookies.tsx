"use client";

import { motion } from "framer-motion";

/**
 * A presentational component that renders the "Cookies and Tracking Technologies" section of the privacy policy page.
 */
export function PrivacyCookies() {
  return (
    // The component that allows for animations controlled by a parent component.
    <motion.section id="cookies" className="scroll-mt-32">
      <h2 className="font-plus-jakarta-sans mb-4 text-2xl font-medium text-slate-900 md:text-3xl">
        9. Cookies and Tracking Technologies
      </h2>
      <div className="font-inter space-y-4 text-sm leading-relaxed text-slate-800 md:text-base">
        <p>
          We use cookies and similar tracking technologies to track the activity on our service and
          hold certain information.
        </p>
        <ul className="ml-6 list-disc space-y-2">
          <li>
            <strong>Session Cookies</strong>: We use session cookies (specifically JSON Web Tokens)
            to keep you logged in. These are small digital keys stored on your device that prove you
            are who you say you are as you move from page to page.{" "}
            <strong>
              If you are inactive for 30 days, these cookies will expire, and you will be
              automatically logged out for your security.
            </strong>
          </li>
          <li>
            <strong>Security Cookies</strong>: We use security cookies to detect and prevent
            security risks, such as someone trying to guess your password or hijack your session.
            These cookies help us identify and block suspicious activity.
          </li>
        </ul>
        <p>
          You can instruct your browser to refuse all cookies or to indicate when a cookie is being
          sent. However, if you do not accept cookies, you may not be able to use some portions of
          our service.
        </p>
      </div>
    </motion.section>
  );
}

PrivacyCookies.displayName = "PrivacyCookies";
