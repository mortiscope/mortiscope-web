import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import Hero from "@/features/home/components/hero";

/**
 * Page-specific metadata for the landing page.
 */
export const metadata: Metadata = {
  title: "Mortiscope — Insects Hold the Clues",
  description:
    "Mortiscope is an experimental intelligent web-based system that uses computer vision and deep learning to analyze Chrysomya megacephala images for forensic Post-Mortem Interval (PMI) estimation.",
  alternates: {
    canonical: "https://mortiscope.com",
  },
};

/**
 * The landing page component.
 */
const LandingPage = () => {
  return (
    <>
      <JsonLd type="homepage" />
      <div>
        <Hero />
      </div>
    </>
  );
};

export default LandingPage;
