"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { useActiveSection } from "@/features/legal/hooks/use-active-section";

/**
 * Defines the structure for a single section to be included in the table of contents.
 */
interface Section {
  id: string;
  title: string;
}

/**
 * Defines the props for the table of contents component.
 */
interface TableOfContentsProps {
  /** An array of section objects to be rendered as navigation links. */
  sections: Section[];
  /** An optional Tailwind CSS class to apply to the active link. */
  activeColorClass?: string;
}

/**
 * A smart component that renders an animated, interactive scrollspy table of contents.
 */
export function TableOfContents({
  sections,
  activeColorClass = "text-emerald-700",
}: TableOfContentsProps) {
  /** A state to ensure the component only renders on the client, preventing hydration mismatches. */
  const [isMounted, setIsMounted] = useState(false);
  // Initializes the custom scrollspy hook with the IDs of the sections to track.
  const { activeId, setActiveId, isScrollingRef } = useActiveSection(sections.map((s) => s.id));

  // A side effect to set `isMounted` to true only after the initial render on the client.
  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * A handler function that programmatically scrolls the user to a specific section on the page.
   * @param id The DOM ID of the section element to scroll to.
   */
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      // Immediately update the active ID in the state to provide instant visual feedback.
      setActiveId(id);

      // Set the `isScrollingRef` flag to `true`.
      isScrollingRef.current = true;

      // Calculate the target scroll position with a vertical offset for better alignment.
      const yOffset = -32;
      const rect = element.getBoundingClientRect();
      const elementTop = rect.top + window.scrollY;
      const y = elementTop + yOffset;

      // Perform the smooth scroll.
      window.scrollTo({
        top: y,
        behavior: "smooth",
      });

      // After a delay, reset the `isScrollingRef` flag to `false` to re-enable the scroll listener.
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 1000);
    }
  };

  /**
   * Framer Motion variants for the main container, creating an animated entrance
   * and staggering the animation of its children.
   */
  const containerVariants = {
    hidden: { opacity: 0, x: 50 },
    show: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.8,
        ease: "easeOut" as const,
        delayChildren: 0.3,
        staggerChildren: 0.1,
      },
    },
  };

  /**
   * Framer Motion variants for each individual list item, creating a slide-in effect.
   */
  const itemVariants = {
    hidden: { opacity: 0, x: 20 },
    show: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.5, ease: "easeOut" as const },
    },
  };

  // Prevents server-side rendering of this client-only component to avoid hydration errors.
  if (!isMounted) {
    return null;
  }

  return (
    // The main animated navigation container.
    <motion.nav className="h-fit" variants={containerVariants} initial="hidden" animate="show">
      <h3 className="font-plus-jakarta-sans mb-4 text-xl font-medium text-slate-950">
        Table of Contents
      </h3>
      <ul className="space-y-2">
        {/* Maps over the sections to render each link as an animated list item. */}
        {sections.map((section) => (
          <motion.li key={section.id} variants={itemVariants}>
            <button
              onClick={() => scrollToSection(section.id)}
              className={`font-inter w-full cursor-pointer text-left text-base transition-colors duration-200 ${
                // Applies the active color class if the section's ID matches the active ID from the hook.
                activeId === section.id
                  ? `${activeColorClass}`
                  : "text-slate-700 transition-colors duration-300 ease-in-out hover:text-slate-900"
              }`}
            >
              {section.title}
            </button>
          </motion.li>
        ))}
      </ul>
    </motion.nav>
  );
}

TableOfContents.displayName = "TableOfContents";
