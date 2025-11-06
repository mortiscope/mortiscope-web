import { Metadata } from "next";

import { PrivacyPolicy } from "@/features/legal/components/privacy-policy";

/**
 * The static metadata for the privacy policy page.
 */
export const metadata: Metadata = {
  title: "Privacy Policy • MortiScope",
  description:
    "Learn how Mortiscope collects, uses, and protects your personal information. Our privacy policy explains data handling practices for our PMI estimation system.",
  alternates: {
    canonical: "https://mortiscope.com/privacy-policy",
  },
};

/**
 * The main server component for the `/privacy-policy` route.
 * @returns A React component representing the Privacy Policy page.
 */
export default function PrivacyPolicyPage() {
  return <PrivacyPolicy />;
}
