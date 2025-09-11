"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { NavigationBar } from "@/features/home/components/navigation-bar";

/**
 * A smart layout component that provides a consistent structure and animated entrance for all legal pages.
 * @param {object} props The component props.
 * @param {React.ReactNode} props.children The page content to be rendered within the layout.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  /** A state to ensure the component only triggers animations on the client, preventing hydration mismatches. */
  const [isMounted, setIsMounted] = useState(false);
  // Hook to get the current URL path.
  const pathname = usePathname();
  // A derived boolean to check if the current page is the privacy policy, used for theming.
  const isPrivacyPolicy = pathname?.includes("privacy-policy");

  /**
   * A side effect that runs once after the component has mounted on the client.
   */
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /** Dynamically sets the gradient color based on the current page for visual distinction. */
  const gradientColor = isPrivacyPolicy ? "#32a287" : "#e6c94c";

  /**
   * Renders an invisible placeholder on the server and during the initial client render.
   */
  if (!isMounted) {
    return <div className="relative min-h-screen w-full bg-white opacity-0">{children}</div>;
  }

  return (
    <div className="relative min-h-screen w-full bg-white">
      {/* Renders the main navigation bar. */}
      <div className="relative z-20">
        <NavigationBar animated={false} />
      </div>

      {/* Renders the animated top background gradient. */}
      <motion.div
        className="pointer-events-none absolute top-0 right-0 left-0 z-0 h-256"
        style={{
          background: `linear-gradient(to bottom, ${gradientColor}, transparent)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      {/* Renders the animated bottom background gradient. */}
      <motion.div
        className="pointer-events-none absolute right-0 bottom-0 left-0 z-0 h-256"
        style={{
          background: `linear-gradient(to top, ${gradientColor}, transparent)`,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />
      {/* The main content area where the actual page component is rendered. */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
