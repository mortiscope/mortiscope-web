import type { Metadata } from "next";

import { JsonLd } from "@/components/json-ld";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";
import Hero from "@/features/home/components/hero";
import Introduction from "@/features/home/components/introduction";

/**
 * Page-specific metadata for the landing page.
 */
export const metadata: Metadata = {
  title: "Mortiscope — Insects Hold the Clues",
  description:
    "Mortiscope is an experimental intelligent web-based system that uses computer vision and deep learning to analyze Chrysomya megacephala images for forensic Post-Mortem Interval (PMI) estimation.",
  alternates: {
    canonical: "https://www.mortiscope.com",
  },
};

/**
 * The landing page component.
 */
const LandingPage = () => {
  return (
    <SmoothScrollProvider>
      <JsonLd type="homepage" />
      <main className="relative">
        <div className="sticky top-0 h-screen w-full overflow-hidden">
          <Hero />
        </div>
        <Introduction />
      </main>
    </SmoothScrollProvider>
  );
};

export default LandingPage;
