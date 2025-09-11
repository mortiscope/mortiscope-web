import { Metadata } from "next";

import { TermsOfUse } from "@/features/legal/components/terms-of-use";

/**
 * The static metadata for the terms of use page.
 */
export const metadata: Metadata = {
  title: "Terms of Use • MortiScope",
};

/**
 * The main server component for the `/terms-of-use` route.
 * @returns A React component representing the Terms of Use page.
 */
export default function TermsOfUsePage() {
  return <TermsOfUse />;
}
